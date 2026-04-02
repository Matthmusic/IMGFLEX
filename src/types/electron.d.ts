
export interface UpdateInfo {
    version: string;
    releaseNotes?: string;
}

export interface DownloadProgress {
    percent: number;
    transferred: number;
    total: number;
}

declare global {
    interface Window {
        electron: {
            // Image processing
            getFilePath: (file: File) => string;
            processBatchImage: (data: {
                filePath: string;
                companyName: string;
            }) => Promise<{ success: boolean; files?: string[]; error?: string }>;

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
