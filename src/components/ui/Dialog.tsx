import { CSSProperties, HTMLAttributes, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

type DialogMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    maxWidth?: DialogMaxWidth;
    closeOnOverlayClick?: boolean;
    className?: string;
    overlayClassName?: string;
    overlayStyle?: CSSProperties;
    children: ReactNode;
}

const maxWidthClasses: Record<DialogMaxWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '5xl': 'max-w-5xl',
};

function DialogRoot({
    isOpen,
    onClose,
    maxWidth,
    closeOnOverlayClick = true,
    className = '',
    overlayClassName = '',
    overlayStyle,
    children,
}: DialogProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 ${overlayClassName}`}
            style={overlayStyle}
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className={`relative flex w-full flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-xl mx-4 ${maxWidth ? maxWidthClasses[maxWidth] : ''} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

function DialogHeader({ children, className = '', ...props }: DialogHeaderProps) {
    return (
        <div
            className={`flex shrink-0 items-center justify-between border-b border-surface-700 px-5 py-3 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

function DialogBody({ children, className = '', ...props }: DialogBodyProps) {
    return (
        <div className={`overflow-y-auto px-5 py-4 ${className}`} {...props}>
            {children}
        </div>
    );
}

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    justify?: 'end' | 'between' | 'start';
}

function DialogFooter({ children, className = '', justify = 'end', ...props }: DialogFooterProps) {
    const justifyClass = justify === 'end' ? 'justify-end' : justify === 'between' ? 'justify-between' : 'justify-start';
    return (
        <div
            className={`flex shrink-0 items-center gap-2 border-t border-surface-700 px-5 py-3 ${justifyClass} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export const Dialog = Object.assign(DialogRoot, {
    Header: DialogHeader,
    Body: DialogBody,
    Footer: DialogFooter,
});
