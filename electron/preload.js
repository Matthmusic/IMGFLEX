
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Image processing
    getFilePath: (file) => webUtils.getPathForFile(file),
    processBatchImage: (data) => ipcRenderer.invoke('process-batch-image', data),

    // Output folder access
    openOutputFolder: (dirPath) => ipcRenderer.invoke('open-output-folder', dirPath),
    revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
    readOutputFile: (filePath) => ipcRenderer.invoke('read-output-file', filePath),

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Auto-updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),

    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, data) => cb(data)),
    onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, data) => cb(data)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, data) => cb(data)),
    onUpdateError: (cb) => ipcRenderer.on('update-error', (_e, data) => cb(data)),

    isElectron: true,
});
