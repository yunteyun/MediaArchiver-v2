/**
 * Toast - シンプルなトースト通知コンポーネント
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

export interface ToastData {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

interface ToastProps {
    toast: ToastData;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // アニメーション用に少し遅らせて表示
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose(toast.id), 300);
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const icons = {
        success: <CheckCircle size={18} className="text-green-400" />,
        error: <AlertCircle size={18} className="text-red-400" />,
        info: <Info size={18} className="text-blue-400" />,
    };

    const bgColors = {
        success: 'border-green-500/30',
        error: 'border-red-500/30',
        info: 'border-blue-500/30',
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 bg-surface-800 border ${bgColors[toast.type]} rounded-lg shadow-xl transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                }`}
        >
            {icons[toast.type]}
            <span className="text-sm text-surface-100">{toast.message}</span>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(toast.id), 300);
                }}
                className="p-1 hover:bg-surface-700 rounded transition-colors ml-2"
            >
                <X size={14} className="text-surface-400" />
            </button>
        </div>
    );
};

// トーストコンテナ
interface ToastContainerProps {
    toasts: ToastData[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2" style={{ zIndex: 'var(--z-toast)' }}>
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};
