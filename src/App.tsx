
import { useState, useEffect } from 'react';
import { DropZone } from './components/DropZone';
import { OutputPreview } from './components/OutputPreview';
import { UpdateNotification, VersionBadge } from './components/UpdateNotification';
import type { GeneratedFile } from './types/electron';
import { SVG_SIZE_OPTIONS, DEFAULT_SVG_SIZE, isVectorFile } from './constants';
import imgflexLogo from './assets/IMGFLEX-PNG.png';

// SVG icons (Windows-style controls)
const MinusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect y="4.5" width="10" height="1" fill="currentColor"/>
  </svg>
);
const SquareIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const FolderIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [stageTab, setStageTab] = useState<'source' | 'results'>('source');
  const [svgSize, setSvgSize] = useState<number>(DEFAULT_SVG_SIZE);

  const isVectorSource = file ? isVectorFile(file) : false;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setStatus('Prêt');
    setGeneratedFiles([]);
    setOutputDir(null);
    setStageTab('source');
    // Reset or clean up company name? Maybe keep it if processing multiple for same company
    // auto-focus company name input could be nice.
  };

  const handleOpenFolder = async () => {
    if (!outputDir) return;
    const res = await window.electron.openOutputFolder(outputDir);
    if (!res.success) setStatus(`❌ Erreur : ${res.error}`);
  };

  const handleRevealFile = async (filePath: string) => {
    const res = await window.electron.revealFile(filePath);
    if (!res.success) setStatus(`❌ Erreur : ${res.error}`);
  };

  const handleProcess = async () => {
    if (!file) return;
    if (!companyName.trim()) {
      setStatus('Veuillez saisir un nom de société');
      return;
    }

    setIsProcessing(true);
    setStatus('Génération en cours...');

    try {
      // Use the exposed webUtils helper to get the real path
      const filePath = window.electron.getFilePath(file);

      if (!filePath) {
        throw new Error('File path not found (are you in Electron?)');
      }

      const result = await window.electron.processBatchImage({
        filePath,
        companyName,
        targetSize: isVectorSource ? svgSize : null,
      });

      if (result.success && result.files) {
        setStatus('✅ Terminé ! Fichiers sauvegardés.');
        setGeneratedFiles(result.files);
        setOutputDir(result.outputDir ?? null);
        setStageTab('results');
      } else {
        setStatus(`❌ Erreur : ${result.error}`);
      }
    } catch (err) {
      setStatus(`❌ Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-root">
      <UpdateNotification />
      {/* Title Bar */}
      <div className="titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          <img src={imgflexLogo} width="22" height="22" alt="IMGFLEX" style={{ flexShrink: 0, imageRendering: 'auto' }} />
          <span style={{ color: '#1f80ff' }}>IMGFLEX</span>
          <span style={{ color: '#6b7280', fontWeight: 400 }}>Batch Studio</span>
          <VersionBadge />
        </div>
        <div className="titlebar-controls">
          <button className="control-btn minimize" onClick={() => window.electron.minimize()} title="Réduire">
            <MinusIcon />
          </button>
          <button className="control-btn maximize" onClick={() => window.electron.maximize()} title="Agrandir">
            <SquareIcon />
          </button>
          <button className="control-btn close" onClick={() => window.electron.close()} title="Fermer">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">

        {/* Left: Stage */}
        <div className="stage-panel">
          <div className="stage-inner">
            {generatedFiles.length > 0 && (
              <div className="stage-tabs">
                <button
                  className={`stage-tab ${stageTab === 'source' ? 'active' : ''}`}
                  onClick={() => setStageTab('source')}
                  disabled={!file}
                >
                  Source
                </button>
                <button
                  className={`stage-tab ${stageTab === 'results' ? 'active' : ''}`}
                  onClick={() => setStageTab('results')}
                >
                  Résultats
                </button>
              </div>
            )}

            <div className="stage-content">
              {stageTab === 'results' && generatedFiles.length > 0 ? (
                <OutputPreview files={generatedFiles} />
              ) : file && previewUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxWidth: '90%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                  />
                  <button
                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                    style={{
                      position: 'absolute', top: 20, right: 20,
                      background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                      borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <DropZone onFileSelect={handleFileSelect} />
              )}
            </div>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="inspector-panel">
          <div style={{ marginBottom: '24px' }}>
            <h1 className="inspector-title">
              One-Click Export
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Génère automatiquement PNG, JPG, BMP et SVG
            </p>
          </div>

          <div className="input-group">
            <label className="label">Nom de l'image</label>
            <input
              type="text"
              className="input"
              placeholder="Entre le nom ici"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
              style={{
                fontWeight: 600,
                padding: '10px 12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                width: '100%',
                fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
              }}
              spellCheck={false}
              autoFocus
            />
          </div>

          {isVectorSource && (
            <div className="input-group">
              <label className="label">
                Taille de sortie <span className="label-hint">— source vectorielle</span>
              </label>
              <div className="size-options">
                {SVG_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    className={`size-option ${svgSize === opt.size ? 'active' : ''}`}
                    onClick={() => setSvgSize(opt.size)}
                    title={`Côté le plus long : ${opt.size} px`}
                  >
                    <span className="size-option-label">{opt.label}</span>
                    <span className="size-option-px">{opt.size} px</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format preview chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', marginBottom: '24px' }}>
            {(['PNG', 'JPG', 'BMP', 'SVG'] as const).map((fmt) => {
              const fmtColors: Record<string, string> = { PNG: '#E53935', JPG: '#7AC529', BMP: '#1f80ff', SVG: '#FFD21F' };
              const color = fmtColors[fmt];
              return (
              <div key={fmt} style={{
                flex: '1 1 calc(50% - 4px)',
                minWidth: '120px',
                padding: '8px 4px',
                borderRadius: '6px',
                border: `1px solid ${color}40`,
                backgroundColor: `${color}12`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.65rem', color: color, marginBottom: '2px', letterSpacing: '0.05em', fontWeight: 700 }}>{fmt}</div>
                <div style={{ fontSize: '0.7rem', color: '#e5e7eb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                  {(companyName || 'SOCIÉTÉ')}-{fmt}.{fmt.toLowerCase()}
                </div>
                {isVectorSource && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {fmt === 'SVG' ? 'vectoriel' : `${svgSize} px`}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              className="btn"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                opacity: (file && companyName) ? 1 : 0.4,
                pointerEvents: (file && companyName) ? 'auto' : 'none',
                background: isProcessing ? '#2a2a2a' : 'var(--accent-color)',
                color: isProcessing ? '#6b7280' : '#000000',
                transition: 'all 0.2s ease',
              }}
              onClick={handleProcess}
              disabled={isProcessing}
            >
              {isProcessing ? 'Traitement...' : 'Générer tous les formats'}
            </button>

            {!file && (
              <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Déposez une image pour commencer
              </p>
            )}

            {status && (
              <div className="status-card" style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '8px',
                background: status.includes('rreur') ? 'rgba(255, 95, 87, 0.08)' : 'rgba(40, 200, 64, 0.08)',
                border: `1px solid ${status.includes('rreur') ? 'rgba(255,95,87,0.4)' : 'rgba(40,200,64,0.3)'}`,
              }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: status.includes('rreur') ? '#ff5f57' : '#28c840' }}>
                  {status}
                </p>
                {generatedFiles.length > 0 && (
                  <>
                    <ul style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none' }}>
                      {generatedFiles.map((f) => (
                        <li key={f.path}>
                          <button
                            className="file-row"
                            onClick={() => handleRevealFile(f.path)}
                            title={`Afficher ${f.name} dans l'Explorateur`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#28c840" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span className="file-row-name">{f.name}</span>
                            <span className="file-row-reveal">↗</span>
                          </button>
                        </li>
                      ))}
                    </ul>

                    {outputDir && (
                      <button className="btn open-folder-btn" onClick={handleOpenFolder} title={outputDir}>
                        <FolderIcon />
                        Ouvrir le dossier
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
