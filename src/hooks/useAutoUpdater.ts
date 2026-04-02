import { useState, useEffect } from 'react';
import type { UpdateInfo, DownloadProgress } from '../types/electron';

export function useAutoUpdater() {
    const [isElectron] = useState(() => !!window.electron?.isElectron);
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!window.electron) return;

        // Récupérer la version courante
        window.electron.getAppVersion().then(setCurrentVersion).catch(() => {
            setCurrentVersion('0.0.1');
        });

        if (!isElectron) return;

        window.electron.onUpdateAvailable((info: UpdateInfo) => {
            setUpdateAvailable(info);
            setChecking(false);
        });

        window.electron.onDownloadProgress((progress: DownloadProgress) => {
            setDownloadProgress(Math.round(progress.percent));
        });

        window.electron.onUpdateDownloaded((info: UpdateInfo) => {
            setUpdateDownloaded(info);
            setDownloadProgress(100);
        });

        window.electron.onUpdateError((err: { message: string }) => {
            setError(err.message);
            setChecking(false);
        });
    }, [isElectron]);

    const checkForUpdates = async () => {
        if (!isElectron || !window.electron) return;
        setChecking(true);
        setError(null);
        await window.electron.checkForUpdates();
    };

    const downloadUpdate = async () => {
        if (!isElectron || !window.electron) return;
        setError(null);
        const success = await window.electron.downloadUpdate();
        if (!success) {
            setError('Erreur lors du téléchargement de la mise à jour');
        }
    };

    const installUpdate = () => {
        if (!isElectron || !window.electron) return;
        window.electron.installUpdate();
    };

    return {
        isElectron,
        currentVersion,
        updateAvailable,
        downloadProgress,
        updateDownloaded,
        error,
        checking,
        checkForUpdates,
        downloadUpdate,
        installUpdate,
    };
}
