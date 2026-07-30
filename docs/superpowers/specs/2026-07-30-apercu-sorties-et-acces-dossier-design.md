# Aperçu des sorties & accès au dossier de destination

**Date :** 2026-07-30
**Statut :** validé, prêt pour implémentation

## Problème

Après une génération, IMGFLEX affiche une simple liste de noms de fichiers. Deux manques :

1. **Aucun moyen d'atteindre les fichiers.** L'utilisateur choisit un dossier de destination dans une
   boîte de dialogue, puis doit le retrouver seul dans l'Explorateur.
2. **Aucune visibilité sur le résultat réel.** Le panneau de gauche continue d'afficher l'image
   *source*. Or les sorties peuvent différer fortement de la source — le cas typique étant un SVG
   déposé en entrée : Sharp le rasterise à ses dimensions intrinsèques, qui sont souvent absentes ou
   minuscules. L'utilisateur découvre le problème plus tard, dans un autre logiciel.

## Objectif

Rendre le résultat d'une génération immédiatement visible et immédiatement accessible, sans quitter
l'application.

## Périmètre

**Inclus**

- Bouton « Ouvrir le dossier » sous la liste des fichiers générés.
- Clic sur une ligne de la liste → révèle ce fichier dans l'Explorateur, pré-sélectionné.
- Grille 2×2 des quatre sorties dans le panneau de gauche, avec dimensions et poids réels.
- Zoom plein écran au clic sur une vignette, avec navigation clavier.
- Choix de la taille de sortie (512 / 1024 / 2048 px) lorsque la source est vectorielle.
- SVG de sortie recopié depuis le vectoriel source, au lieu d'un raster embarqué.

**Exclus**

- Retirer `jimp` des dépendances (plus utilisé par `electron/main.js`) — dette séparée.
- Mettre à jour `CLAUDE.md`, qui décrit encore 3 formats via Jimp au lieu de 4 via Sharp — dette
  séparée.
- Proposer un choix de taille pour les sources matricielles. Une image matricielle a déjà une
  résolution ; la redimensionner est un autre besoin.

## Décision technique centrale : comment afficher un fichier du disque

Les fichiers générés vivent sur le disque, hors du renderer. En développement l'application est
servie depuis `http://localhost:5177`, donc un `<img src="file://…">` est bloqué par Chromium. Il
faut un chemin explicite.

Contrainte déterminante : **Sharp ne sait pas décoder le BMP** (libvips ne le lit pas en entrée). On
ne peut donc pas produire les vignettes en re-rasterisant les sorties côté main process. Les octets
réels doivent atteindre Chromium, qui décode nativement PNG, JPG, BMP et SVG.

**Retenu — Blob URL via IPC.** Le main process lit le fichier et renvoie ses octets ; le renderer
construit un `Blob` et un object URL. C'est Chromium qui décode, donc l'aperçu correspond exactement
à ce qu'un autre logiciel affichera — y compris un rendu dégradé ou inattendu, ce qui est
précisément le but.

**Écartés**

- *Protocole custom `imgflex://`* — plus élégant en théorie (streaming, pas de copie mémoire), mais
  impose `registerSchemesAsPrivileged` avant `app.ready` et l'encodage des chemins Windows (avec
  `standard: true`, `C:` est interprété comme un host). Coût de complexité sans gain perceptible sur
  des logos.
- *Data URL base64* — +33 % de mémoire. Le SVG généré embarque déjà un PNG en base64 ; un logo
  2000×2000 produit un SVG de plusieurs Mo qui deviendrait une chaîne JavaScript encore plus grosse.
  Le BMP 24 bits non compressé est pire.

## Taille de sortie d'une source vectorielle

Un SVG n'a pas de résolution. Sharp le rasterise à 72 DPI sur ses dimensions intrinsèques, qui sont
souvent minuscules — voire absentes quand le fichier ne déclare qu'un `viewBox`. D'où des sorties
inexploitables.

**Trois tailles proposées** — Petit 512 px, Moyen 1024 px (défaut), Grand 2048 px — appliquées au
**côté le plus long**. Une bannière garde ainsi des proportions prévisibles au lieu de s'écraser en
hauteur. Le sélecteur n'apparaît que si la source est vectorielle : une image matricielle a déjà une
résolution, lui proposer une taille n'aurait pas de sens.

**Méthode : densité, pas redimensionnement.** Rasteriser à 72 DPI puis agrandir le bitmap donnerait
un rendu flou. On calcule donc la densité de rasterisation en amont —
`density = 72 × cible / côté_le_plus_long` — pour que libvips produise directement le bon nombre de
pixels, puis on ajuste au pixel près avec `resize(fit: 'inside')`, le calcul de densité étant
nécessairement arrondi. La densité est plafonnée à 4000 : au-delà, un SVG au tracé dense fait
exploser la mémoire sans gain visible.

Cette logique vit dans `electron/imagePipeline.js` plutôt que dans `main.js` : isolée de l'API
Electron, elle est vérifiable par un simple script Node.

**SVG de sortie.** Quand la source est vectorielle, le SVG produit en est une copie conforme.
Y embarquer un raster reviendrait à figer une résolution dans le seul format qui n'en a pas. Le
comportement historique (PNG encapsulé en base64) est conservé pour les sources matricielles, où il
n'y a aucun vectoriel à récupérer.

## Architecture

### Main process — `electron/main.js`

Le handler `process-batch-image` retourne aujourd'hui `{ success, files: string[] }`. Il retourne
désormais des descripteurs complets :

```js
{
  success: true,
  outputDir: 'C:\\…\\Logos',
  files: [{ path, name, format: 'PNG', width, height, size }, …]
}
```

Les dimensions sont déjà calculées par le pipeline existant (`info.width` / `info.height` pour
PNG/JPG/SVG, le raw buffer pour le BMP) : les exposer ne coûte rien de plus.

Trois nouveaux handlers IPC :

| Canal | Rôle |
|---|---|
| `open-output-folder` | `shell.openPath(dir)` |
| `reveal-file` | `shell.showItemInFolder(path)` |
| `read-output-file` | lit le fichier, renvoie `{ bytes, mime }` |

**Garde-fou.** Une variable de module `lastOutputDir` mémorise le dossier de la dernière génération.
Les trois handlers refusent tout chemin situé hors de ce dossier. Sans cela, le renderer disposerait
d'une primitive de lecture de disque arbitraire. La comparaison se fait sur des chemins résolus
(`path.resolve`), insensible à la casse sous Windows.

### Preload — `electron/preload.js`

Trois méthodes ajoutées à `window.electron`, dans le style existant :
`openOutputFolder`, `revealFile`, `readOutputFile`.

Les types correspondants sont mis à jour dans `src/types/electron.d.ts`, dont la signature de
`processBatchImage` change (`files?: string[]` devient `files?: GeneratedFile[]`).

### Renderer

`src/App.tsx` fait déjà 260 lignes. Le nouveau code va dans deux composants dédiés :

**`src/components/OutputPreview.tsx`** — la grille 2×2.
Charge les quatre blobs à la réception des résultats, révoque les object URLs au démontage et à
chaque nouveau jeu de résultats. Chaque tuile affiche l'image sur un damier de transparence, un
badge de format coloré (réutilise les variables CSS `--color-png` … `--color-svg` déjà définies dans
`index.css`) et une ligne `1024×1024 · 3,0 Mo`. Cette ligne est l'élément qui explique un résultat
inattendu : une sortie en 300×150 depuis un SVG source devient immédiatement lisible.

**`src/components/LightboxOverlay.tsx`** — le zoom.
Overlay plein écran, flèches ‹ ›, raccourcis ←/→/Échap, compteur « 2 / 4 ». Ne gère que
l'affichage ; les object URLs restent la propriété de `OutputPreview`.

**`src/App.tsx`** — le panneau de gauche gagne un sélecteur **Source / Résultats**, qui bascule
automatiquement sur *Résultats* dès la fin d'une génération réussie. Le panneau de droite gagne le
bouton « Ouvrir le dossier » et rend chaque ligne de la liste cliquable.

## Flux de données

```
Génération terminée
  └─ main renvoie { outputDir, files[] }
       └─ App stocke outputDir + files, bascule sur l'onglet Résultats
            └─ OutputPreview appelle readOutputFile() pour chacun des 4 fichiers
                 └─ Blob → createObjectURL → <img>
                      └─ clic → LightboxOverlay
```

## Gestion d'erreur

- **Blob illisible ou format non décodable par Chromium** → la tuile affiche un état d'erreur
  explicite, pas une image cassée. C'est un signal utile sur l'intégrité du fichier produit, pas un
  défaut à masquer.
- **`shell.openPath` échoue** (dossier supprimé entre-temps) → message dans la carte de statut.
- **Chemin hors de `lastOutputDir`** → le handler retourne une erreur et ne lit rien.

## Vérification

Le projet n'a pas d'infrastructure de test et cette spec n'en introduit pas. Vérification :

- `npm run build` (inclut `tsc -b`) et `npm run lint` passent.
- La logique de dimensionnement de `electron/imagePipeline.js` a été vérifiée par un script Node
  exécutant Sharp sur quatre formes de SVG (carré, bannière, bandeau, `viewBox` sans `width`) aux
  trois tailles, plus une source matricielle qui doit ignorer le paramètre. Le côté le plus long
  atteint exactement la cible dans les douze cas.
- Test manuel via `npm run electron:dev` : dépôt d'un PNG classique, puis d'un SVG.
- Le bouton dossier ouvre l'Explorateur au bon endroit ; un clic sur une ligne y sélectionne le
  fichier.
