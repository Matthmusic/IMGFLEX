
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import { Jimp } from 'jimp'; // Note: Check Jimp import style for v1
import isDev from 'electron-is-dev';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let autoUpdaterInstance = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false, // Frameless for custom aesthetic
        titleBarStyle: 'hidden',
        icon: join(__dirname, '../src/assets/IMGFLEX-PNG.png'),
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load the app
    const startUrl = isDev
        ? 'http://localhost:5177'
        : `file://${join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(async () => {
    createWindow();

    // Setup auto-updater (production only)
    if (!isDev) {
        try {
            const { autoUpdater } = await import('electron-updater');
            autoUpdaterInstance = autoUpdater;
            autoUpdater.autoDownload = false;
            autoUpdater.autoInstallOnAppQuit = true;

            autoUpdater.on('update-available', (info) => {
                if (mainWindow) {
                    mainWindow.webContents.send('update-available', {
                        version: info.version,
                        releaseNotes: info.releaseNotes || ''
                    });
                }
            });

            autoUpdater.on('update-not-available', () => {
                console.log('IMGFLEX est a jour.');
            });

            autoUpdater.on('download-progress', (progress) => {
                if (mainWindow) {
                    mainWindow.webContents.send('download-progress', {
                        percent: progress.percent,
                        transferred: progress.transferred,
                        total: progress.total
                    });
                }
            });

            autoUpdater.on('update-downloaded', (info) => {
                if (mainWindow) {
                    mainWindow.webContents.send('update-downloaded', { version: info.version });
                }
            });

            autoUpdater.on('error', (error) => {
                console.error('Erreur de mise a jour:', error);
                if (mainWindow) {
                    mainWindow.webContents.send('update-error', { message: error.message });
                }
            });

            // Vérification 3s après le lancement
            setTimeout(() => autoUpdater.checkForUpdates(), 3000);
        } catch (err) {
            console.error('Impossible de charger electron-updater:', err);
        }
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// ── Version & Updater IPC ─────────────────────────────────────────────────────

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-updates', async () => {
    if (!isDev && autoUpdaterInstance) {
        try { return await autoUpdaterInstance.checkForUpdates(); } catch { return null; }
    }
    return null;
});

ipcMain.handle('download-update', async () => {
    if (!isDev && autoUpdaterInstance) {
        try { await autoUpdaterInstance.downloadUpdate(); return true; } catch { return false; }
    }
    return false;
});

ipcMain.handle('install-update', () => {
    if (!isDev && autoUpdaterInstance) {
        autoUpdaterInstance.quitAndInstall(false, true);
    }
});

ipcMain.handle('open-external-url', async (_event, url) => {
    try { await shell.openExternal(url); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ── Image processing ──────────────────────────────────────────────────────────
ipcMain.handle('process-batch-image', async (event, { filePath, companyName }) => {
    console.log('Processing batch for:', filePath);
    try {
        // 1. Ask user for destination folder
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Destination Folder',
            buttonLabel: 'Save Outputs Here',
            properties: ['openDirectory', 'createDirectory']
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, error: 'Operation cancelled' };
        }

        const outputDir = filePaths[0];
        console.log('Output directory:', outputDir);

        // Sanitize company name
        const safeName = companyName.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').trim();
        const results = [];

        // 2. Process PNG and JPG with Sharp (Fast & Good Quality)
        const tasks = [
            { suffix: '-PNG', format: 'png', options: { compressionLevel: 9 } },
            { suffix: '-JPG', format: 'jpg', options: { quality: 90, mozjpeg: true } },
        ];

        const pipeline = sharp(filePath);

        for (const task of tasks) {
            const outputFilename = `${safeName}${task.suffix}.${task.format}`;
            const outputPath = join(outputDir, outputFilename);

            let currentPipeline = pipeline.clone();

            // For JPG, flatten transparency to white
            if (task.format === 'jpg') {
                currentPipeline = currentPipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
            }

            await currentPipeline
                .toFormat(task.format, task.options)
                .toFile(outputPath);

            results.push(outputPath);
        }

        // 3. Process BMP with Jimp (Reliable for BMP)
        try {
            console.log('Starting BMP generation...');
            const bmpFilename = `${safeName}-BMP.bmp`;
            const bmpPath = join(outputDir, bmpFilename);

            // Read properly
            const image = await Jimp.read(filePath);

            // Fix Black Background: Create a white background and composite
            // Jimp logic to flatten transparency to white
            const whiteBg = new Jimp({
                width: image.bitmap.width,
                height: image.bitmap.height,
                color: 0xffffffff // Hex for White
            });

            whiteBg.composite(image, 0, 0);
            await whiteBg.write(bmpPath); // In Jimp v1, verify write/writeAsync

            results.push(bmpPath);
            console.log('BMP generated:', bmpPath);
        } catch (bmpError) {
            console.error('BMP Error:', bmpError);
            return { success: false, error: `BMP Failed: ${bmpError.message}` };
        }

        // 4. Process SVG with Sharp (embedded raster)
        try {
            const svgFilename = `${safeName}-SVG.svg`;
            const svgPath = join(outputDir, svgFilename);

            const { data, info } = await sharp(filePath)
                .png()
                .toBuffer({ resolveWithObject: true });

            const base64 = data.toString('base64');
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${info.width}" height="${info.height}" viewBox="0 0 ${info.width} ${info.height}">\n  <image href="data:image/png;base64,${base64}" width="${info.width}" height="${info.height}"/>\n</svg>`;

            await writeFile(svgPath, svgContent, 'utf-8');
            results.push(svgPath);
        } catch (svgError) {
            console.error('SVG Error:', svgError);
            return { success: false, error: `SVG Failed: ${svgError.message}` };
        }

        return { success: true, files: results };
    } catch (error) {
        console.error('Batch process error:', error);
        return { success: false, error: error.message };
    }
});

// ── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());
