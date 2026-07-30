
import React, { useState, useCallback } from 'react';

const ImageIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const FolderOpenIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

interface DropZoneProps {
    onFileSelect: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelect }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        // We only take the first file for now
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                onFileSelect(file);
            } else {
                alert('Please drop an image file!');
            }
        }
    }, [onFileSelect]);

    const handleClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                onFileSelect(files[0]);
            }
        };
        input.click();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '300px',
                borderRadius: '12px',
                border: `2px dashed ${isDragging ? '#FF751F' : '#2a2a2a'}`,
                background: isDragging
                    ? 'radial-gradient(ellipse at center, rgba(255,117,31,0.07) 0%, transparent 70%)'
                    : 'transparent',
                transition: 'border-color 0.25s ease, background 0.25s ease',
                cursor: 'pointer',
            }}
        >
            <div style={{
                color: isDragging ? '#FF751F' : '#4b5563',
                marginBottom: '1rem',
                transition: 'color 0.3s ease',
            }}>
                {isDragging ? <FolderOpenIcon /> : <ImageIcon />}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', color: isDragging ? '#FF751F' : '#e5e7eb', transition: 'color 0.25s ease' }}>
                {isDragging ? 'Déposer l\'image ici' : 'Glisser-déposer une image'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                ou cliquer pour parcourir
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
                {['SVG', 'PNG', 'JPG', 'BMP', 'WebP', 'GIF'].map((fmt) => (
                    <span key={fmt} style={{
                        fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em',
                        padding: '3px 7px', borderRadius: '4px',
                        border: '1px solid #2a2a2a', color: '#4b5563',
                    }}>{fmt}</span>
                ))}
            </div>
        </div>
    );
};
