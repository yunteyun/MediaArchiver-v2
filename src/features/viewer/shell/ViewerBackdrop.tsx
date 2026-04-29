import React from 'react';

interface ViewerBackdropProps {
    onClick: () => void;
}

export const ViewerBackdrop: React.FC<ViewerBackdropProps> = ({ onClick }) => (
    <div
        className="absolute inset-0 bg-viewer-backdrop"
        onClick={onClick}
    />
);
