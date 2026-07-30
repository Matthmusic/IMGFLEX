import sharp from 'sharp';

// Densité de rasterisation maximale. Au-delà, un SVG au tracé dense peut faire
// exploser la mémoire de libvips sans gain visible.
export const MAX_DENSITY = 4000;

/**
 * Construit un fabricant de pipelines Sharp adapté à la source.
 *
 * Pour un SVG, la taille de sortie se pilote par la densité de rasterisation :
 * agrandir après coup un bitmap déjà rasterisé à 72 DPI produirait un rendu
 * flou. On rasterise donc directement à la bonne résolution, puis on ajuste au
 * pixel près (le calcul de densité est nécessairement arrondi).
 *
 * `targetSize` s'applique au côté le plus long, ce qui garde les proportions
 * prévisibles quelle que soit la forme du logo.
 *
 * @param {string} filePath
 * @param {import('sharp').Metadata} metadata
 * @param {number|null|undefined} targetSize
 */
export function buildPipelineFactory(filePath, metadata, targetSize) {
    const isVector = metadata.format === 'svg';

    if (!isVector || !targetSize) {
        return { isVector, createPipeline: () => sharp(filePath) };
    }

    const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
    const density = longestSide > 0
        ? Math.min(MAX_DENSITY, Math.max(1, Math.round((72 * targetSize) / longestSide)))
        : 72;

    return {
        isVector,
        createPipeline: () =>
            sharp(filePath, { density }).resize({
                width: targetSize,
                height: targetSize,
                fit: 'inside',
            }),
    };
}
