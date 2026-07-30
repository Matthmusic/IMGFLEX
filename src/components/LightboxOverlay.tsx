import { useEffect } from 'react';
import type { GeneratedFile } from '../types/electron';
import { formatBytes } from '../utils/format';

export interface PreviewTile {
    file: GeneratedFile;
    url: string | null;
    error?: string;
}

interface LightboxOverlayProps {
    tiles: PreviewTile[];
    index: number;
    onClose: () => void;
    onNavigate: (nextIndex: number) => void;
}

export function LightboxOverlay({ tiles, index, onClose, onNavigate }: LightboxOverlayProps) {
    const tile = tiles[index];

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') onNavigate((index - 1 + tiles.length) % tiles.length);
            else if (e.key === 'ArrowRight') onNavigate((index + 1) % tiles.length);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [index, tiles.length, onClose, onNavigate]);

    if (!tile) return null;

    return (
        <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={tile.file.name}>
            <button className="lightbox-close" onClick={onClose} title="Fermer (Échap)">×</button>

            {tiles.length > 1 && (
                <button
                    className="lightbox-nav prev"
                    onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + tiles.length) % tiles.length); }}
                    title="Précédent (←)"
                >
                    ‹
                </button>
            )}

            <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
                {tile.url ? (
                    <img className="lightbox-image checkerboard" src={tile.url} alt={tile.file.name} />
                ) : (
                    <div className="lightbox-error">
                        Aperçu indisponible{tile.error ? ` — ${tile.error}` : ''}
                    </div>
                )}
                <div className="lightbox-caption">
                    <span className={`format-badge fmt-${tile.file.format.toLowerCase()}`}>{tile.file.format}</span>
                    <span className="lightbox-name">{tile.file.name}</span>
                    <span className="lightbox-meta">
                        {tile.file.width}×{tile.file.height} · {formatBytes(tile.file.size)}
                    </span>
                </div>
                {tiles.length > 1 && (
                    <div className="lightbox-counter">{index + 1} / {tiles.length}</div>
                )}
            </div>

            {tiles.length > 1 && (
                <button
                    className="lightbox-nav next"
                    onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % tiles.length); }}
                    title="Suivant (→)"
                >
                    ›
                </button>
            )}
        </div>
    );
}
