import { useEffect, useState } from 'react';
import type { GeneratedFile } from '../types/electron';
import { LightboxOverlay, type PreviewTile } from './LightboxOverlay';
import { formatBytes } from '../utils/format';

interface OutputPreviewProps {
    files: GeneratedFile[];
}

/** Tuiles chargées, accompagnées du jeu de fichiers dont elles proviennent. */
interface LoadedSet {
    source: GeneratedFile[];
    tiles: PreviewTile[];
}

/**
 * Grille 2×2 des fichiers réellement écrits sur le disque.
 *
 * Les octets sont relus via IPC puis confiés à Chromium sous forme de Blob : le
 * décodage est donc identique à celui de n'importe quelle visionneuse, ce qui
 * rend visible un rendu inattendu (typiquement un SVG source rasterisé à des
 * dimensions minuscules) plutôt que de le masquer.
 */
export function OutputPreview({ files }: OutputPreviewProps) {
    const [loaded, setLoaded] = useState<LoadedSet | null>(null);
    const [zoom, setZoom] = useState<{ source: GeneratedFile[]; index: number } | null>(null);

    // Les deux états mémorisent le jeu de fichiers auquel ils se rapportent.
    // Une nouvelle génération les invalide donc au rendu, sans effet de
    // synchronisation : pas de tuile périmée affichée avec une URL déjà révoquée,
    // et le zoom se referme de lui-même.
    const tiles: PreviewTile[] =
        loaded?.source === files ? loaded.tiles : files.map((file) => ({ file, url: null }));
    const zoomIndex = zoom?.source === files ? zoom.index : null;

    useEffect(() => {
        let cancelled = false;
        const created: string[] = [];

        // Une URL créée après l'annulation de l'effet n'atteindra jamais le DOM :
        // on la révoque immédiatement au lieu de la laisser fuir.
        const track = (url: string): string | null => {
            if (cancelled) {
                URL.revokeObjectURL(url);
                return null;
            }
            created.push(url);
            return url;
        };

        (async () => {
            const result = await Promise.all(
                files.map(async (file): Promise<PreviewTile> => {
                    const res = await window.electron.readOutputFile(file.path);
                    if (!res.success) return { file, url: null, error: res.error };
                    const url = track(URL.createObjectURL(new Blob([res.bytes], { type: res.mime })));
                    return { file, url, error: url ? undefined : 'annulé' };
                })
            );
            if (!cancelled) setLoaded({ source: files, tiles: result });
        })();

        return () => {
            cancelled = true;
            created.forEach(URL.revokeObjectURL);
        };
    }, [files]);

    const markFailed = (index: number) => {
        setLoaded((prev) =>
            prev?.source === files
                ? {
                      ...prev,
                      tiles: prev.tiles.map((t, i) =>
                          i === index ? { ...t, url: null, error: 'format illisible' } : t
                      ),
                  }
                : prev
        );
    };

    return (
        <div className="output-preview">
            <div className="output-grid">
                {tiles.map((tile, i) => (
                    <button
                        key={tile.file.path}
                        className="output-tile"
                        onClick={() => tile.url && setZoom({ source: files, index: i })}
                        title={tile.url ? `Agrandir ${tile.file.name}` : tile.file.name}
                    >
                        <div className="output-tile-canvas checkerboard">
                            {tile.url ? (
                                <img src={tile.url} alt={tile.file.name} onError={() => markFailed(i)} />
                            ) : (
                                <span className="output-tile-placeholder">
                                    {tile.error ? `⚠ ${tile.error}` : 'Chargement…'}
                                </span>
                            )}
                        </div>
                        <div className="output-tile-info">
                            <span className={`format-badge fmt-${tile.file.format.toLowerCase()}`}>
                                {tile.file.format}
                            </span>
                            <span className="output-tile-meta">
                                {tile.file.width}×{tile.file.height} · {formatBytes(tile.file.size)}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {zoomIndex !== null && (
                <LightboxOverlay
                    tiles={tiles}
                    index={zoomIndex}
                    onClose={() => setZoom(null)}
                    onNavigate={(next) => setZoom({ source: files, index: next })}
                />
            )}
        </div>
    );
}
