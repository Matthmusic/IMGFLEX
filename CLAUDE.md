# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server only (port 5177)
npm run electron:dev   # Full dev mode: Vite + Electron concurrently
npm run electron       # Electron only (expects Vite already running)
npm run build          # TypeScript check + Vite production build
npm run lint           # ESLint
npm run preview        # Preview production build
```

## Architecture

IMGFLEX is a frameless Electron desktop app that batch-converts a single image into PNG, JPG, and BMP formats using a company name as the filename prefix.

**Two-process model (Electron standard):**

- `electron/main.js` — Main process. Creates the `BrowserWindow` (frameless, `contextIsolation: true`), handles all IPC, and does the actual image processing. In dev it loads `http://localhost:5177`; in prod it loads `dist/index.html`.
- `electron/preload.js` — Bridge. Exposes `window.electron` to the renderer via `contextBridge`. Only this file may use Node/Electron APIs from the renderer side.
- `src/` — Renderer process (React + TypeScript + Vite). Communicates with the main process exclusively through `window.electron`.

**IPC channels:**

| Channel | Direction | Purpose |
|---|---|---|
| `process-batch-image` | renderer → main (invoke) | Opens folder dialog, generates PNG/JPG (Sharp) + BMP (Jimp), returns file paths |
| `window-minimize/maximize/close` | renderer → main (send) | Custom title bar controls |

**Image processing pipeline (`electron/main.js`):**
- PNG & JPG via **Sharp** (fast, high quality; JPG flattens transparency to white)
- BMP via **Jimp** (Sharp doesn't support BMP output; Jimp composites onto a white background before writing)
- Output filename pattern: `COMPANYNAME-PNG.png`, `COMPANYNAME-JPG.jpg`, `COMPANYNAME-BMP.bmp`

**UI layout (`src/App.tsx`):**
- Left panel (flex: 2): image preview / `DropZone` component
- Right panel (max 400px): company name input + "Generate All Formats" button + status

**Key constraint:** `window.electron.getFilePath(file)` (via `webUtils.getPathForFile`) is required to get the real filesystem path from a `File` object dropped into the renderer — the standard `File.path` is not available in Electron's sandboxed renderer.
