import React from 'react';

interface ViewerOverlayLayerProps {
    children: React.ReactNode;
}

/**
 * ポップオーバーやサイドパネルを収容する絶対配置レイヤー。
 * z-viewer-overlay を指定し、Stage より上に表示する。
 * 子要素は自身で position と z-index を調整する。
 */
export const ViewerOverlayLayer: React.FC<ViewerOverlayLayerProps> = ({ children }) => (
    <div className="pointer-events-none absolute inset-0 z-viewer-overlay">
        {children}
    </div>
);
