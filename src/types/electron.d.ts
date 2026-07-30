
export interface UpdateInfo {
    version: string;
    releaseNotes?: string;
}

export interface DownloadProgress {
    percent: number;
    transferred: number;
    total: number;
}

export type OutputFormat = 'PNG' | 'JPG' | 'BMP' | 'SVG';

export interface GeneratedFile {
    path: string;
    name: string;
    format: OutputFormat;
    width: number;
    height: number;
    size: number;
    /** Vrai pour un SVG recopié depuis une source vectorielle : sans résolution fixe. */
    vector?: boolean;
}

export interface BatchResult {
    success: boolean;
    outputDir?: string;
    files?: GeneratedFile[];
    error?: string;
}

declare global {
    interface Window {
        electron: {
            // Image processing
            getFilePath: (file: File) => string;
            processBatchImage: (data: {
                filePath: string;
                companyName: string;
                /**
                 * Côté le plus long visé, en pixels. N'a d'effet que sur une
                 * source vectorielle, seule à ne pas avoir de résolution propre.
                 */
                targetSize?: number | null;
            }) => Promise<BatchResult>;

            // Output folder access
            openOutputFolder: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
            revealFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
            // Les octets traversent l'IPC par structured clone : toujours un
            // ArrayBuffer classique, jamais un SharedArrayBuffer.
            readOutputFile: (filePath: string) => Promise<
                { success: true; bytes: Uint8Array<ArrayBuffer>; mime: string } |
                { success: false; error: string }
            >;

            // Window controls
            minimize: () => void;
            maximize: () => void;
            close: () => void;

            // Version
            getAppVersion: () => Promise<string>;

            // Auto-updater
            checkForUpdates: () => Promise<unknown>;
            downloadUpdate: () => Promise<boolean>;
            installUpdate: () => void;
            openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

            onUpdateAvailable: (cb: (info: UpdateInfo) => void) => void;
            onDownloadProgress: (cb: (progress: DownloadProgress) => void) => void;
            onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => void;
            onUpdateError: (cb: (err: { message: string }) => void) => void;

            isElectron: boolean;
        };
    }
}

export { };
