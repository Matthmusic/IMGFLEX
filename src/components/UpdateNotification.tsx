import { useState } from 'react';
import { useAutoUpdater } from '../hooks/useAutoUpdater';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
        <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
);

const IconDownload = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconChevron = ({ up }: { up: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
);

const IconExternalLink = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

// ── Styles communs ────────────────────────────────────────────────────────────

const panelBase: React.CSSProperties = {
    position: 'fixed',
    top: '44px',
    right: '16px',
    zIndex: 50,
    borderRadius: '10px',
    padding: '14px 16px',
    maxWidth: '360px',
    width: 'calc(100vw - 32px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'updateSlideIn 0.25s ease forwards',
    color: '#ffffff',
};

const btnPrimary = (bg: string, color: string): React.CSSProperties => ({
    background: bg,
    color,
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
});

const btnGhost: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const closeBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    padding: '2px',
    flexShrink: 0,
};

// ── Helper markdown basique ───────────────────────────────────────────────────

function parseMarkdown(text: string): string {
    if (!text) return '';
    return text
        .replace(/^### (.+)$/gm, '<strong style="display:block;margin-top:6px">$1</strong>')
        .replace(/^## (.+)$/gm, '<strong style="display:block;margin-top:8px;font-size:0.85rem">$1</strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^[\-\*] (.+)$/gm, '<span style="display:block;padding-left:8px">• $1</span>')
        .replace(/\n\n/g, '<br/>');
}

// ── Composant principal ───────────────────────────────────────────────────────

export function UpdateNotification() {
    const {
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
    } = useAutoUpdater();

    const [dismissed, setDismissed] = useState(false);
    const [changelogExpanded, setChangelogExpanded] = useState(false);

    if (!isElectron || dismissed) {
        // Bouton version discret (toujours visible en Electron)
        if (!isElectron) return null;
        return null;
    }

    // Mise à jour téléchargée → prête à installer
    if (updateDownloaded) {
        return (
            <div style={{ ...panelBase, background: 'linear-gradient(135deg, #16a34a, #15803d)', border: '1px solid rgba(74,222,128,0.3)' }}>
                <style>{`@keyframes updateSlideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <IconCheck />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '4px' }}>Mise à jour prête !</div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '10px' }}>
                            v{updateDownloaded.version} téléchargée. Redémarrez pour l'installer.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button style={btnPrimary('#fff', '#15803d')} onClick={installUpdate}>Redémarrer maintenant</button>
                            <button style={btnGhost} onClick={() => setDismissed(true)}>Plus tard</button>
                        </div>
                    </div>
                    <button style={closeBtn} onClick={() => setDismissed(true)}><IconX /></button>
                </div>
            </div>
        );
    }

    // Téléchargement en cours
    if (downloadProgress > 0 && downloadProgress < 100) {
        return (
            <div style={{ ...panelBase, background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <style>{`@keyframes updateSlideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <IconDownload />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '8px' }}>Téléchargement en cours...</div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '6px', marginBottom: '6px' }}>
                            <div style={{ background: '#fff', borderRadius: '4px', height: '6px', width: `${downloadProgress}%`, transition: 'width 0.3s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.75rem', opacity: 0.85 }}>{downloadProgress}% terminé</p>
                    </div>
                </div>
            </div>
        );
    }

    // Mise à jour disponible
    if (updateAvailable) {
        const hasChangelog = !!updateAvailable.releaseNotes?.trim();
        return (
            <div style={{ ...panelBase, background: 'linear-gradient(135deg, #1f80ff, #0d6efd)', border: '1px solid rgba(92,163,255,0.35)' }}>
                <style>{`@keyframes updateSlideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <IconRefresh />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '4px' }}>Mise à jour disponible</div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '10px' }}>
                            v{updateAvailable.version} disponible · actuelle : v{currentVersion}
                        </p>

                        {hasChangelog && (
                            <div style={{ marginBottom: '10px' }}>
                                <button
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: 0, marginBottom: '6px' }}
                                    onClick={() => setChangelogExpanded(!changelogExpanded)}
                                >
                                    <IconChevron up={changelogExpanded} />
                                    {changelogExpanded ? 'Masquer les notes' : 'Voir les notes de version'}
                                </button>
                                {changelogExpanded && (
                                    <div
                                        style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '10px', maxHeight: '140px', overflowY: 'auto', lineHeight: 1.6, opacity: 0.9 }}
                                        dangerouslySetInnerHTML={{ __html: parseMarkdown(updateAvailable.releaseNotes || '') }}
                                    />
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button style={btnPrimary('#fff', '#1f80ff')} onClick={downloadUpdate}>Télécharger</button>
                            <button style={btnGhost} onClick={() => setDismissed(true)}>Ignorer</button>
                            <button
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '4px' }}
                                onClick={() => window.electron?.openExternalUrl('https://github.com/Matthmusic/IMGFLEX/releases')}
                                title="Voir toutes les versions sur GitHub"
                            >
                                <IconExternalLink /> Toutes les versions
                            </button>
                        </div>
                    </div>
                    <button style={closeBtn} onClick={() => setDismissed(true)}><IconX /></button>
                </div>
            </div>
        );
    }

    // Erreur
    if (error) {
        return (
            <div style={{ ...panelBase, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <style>{`@keyframes updateSlideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <IconX />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '4px' }}>Erreur de mise à jour</div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>{error}</p>
                    </div>
                    <button style={closeBtn} onClick={() => setDismissed(true)}><IconX /></button>
                </div>
            </div>
        );
    }

    return null;
}

// ── Bouton version fixe (affiché dans la titlebar via App.tsx) ────────────────

export function VersionBadge() {
    const { currentVersion, checking, checkForUpdates } = useAutoUpdater();
    if (!currentVersion) return null;
    return (
        <button
            onClick={checkForUpdates}
            disabled={checking}
            title="Vérifier les mises à jour"
            style={{
                background: 'transparent',
                border: 'none',
                color: checking ? '#4b5563' : '#3b4048',
                cursor: checking ? 'not-allowed' : 'pointer',
                fontSize: '0.7rem',
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.15s',
            }}
        >
            {checking
                ? <><IconRefresh spinning /> Vérif...</>
                : `v${currentVersion}`
            }
        </button>
    );
}
