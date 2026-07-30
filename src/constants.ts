/**
 * Tailles proposées pour une source vectorielle, exprimées en pixels sur le
 * côté le plus long. Un SVG n'ayant pas de résolution propre, c'est ce choix
 * qui détermine la finesse du PNG, du JPG et du BMP générés.
 */
export const SVG_SIZE_OPTIONS = [
    { key: 'small', label: 'Petit', size: 512 },
    { key: 'medium', label: 'Moyen', size: 1024 },
    { key: 'large', label: 'Grand', size: 2048 },
] as const;

export const DEFAULT_SVG_SIZE = 1024;

/** Une source vectorielle se reconnaît au type MIME, l'extension servant de repli. */
export function isVectorFile(file: File): boolean {
    return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}
