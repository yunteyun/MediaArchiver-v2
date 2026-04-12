import { forwardRef, TextareaHTMLAttributes } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className = '', ...props }, ref) => {
        const base =
            'w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 ' +
            'text-sm text-surface-100 ' +
            'placeholder:text-surface-500 ' +
            'focus:border-primary-500 focus:outline-none ' +
            'disabled:bg-surface-800/60 disabled:text-surface-500 disabled:cursor-not-allowed';

        return <textarea ref={ref} className={`${base} ${className}`} {...props} />;
    }
);

Textarea.displayName = 'Textarea';
