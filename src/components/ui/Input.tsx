import { forwardRef, InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className = '', ...props }, ref) => {
        const base =
            'w-full rounded border border-surface-600 bg-surface-900 px-3 py-2 ' +
            'text-sm text-surface-100 outline-none transition ' +
            'placeholder:text-surface-500 ' +
            'focus:border-primary-500 ' +
            'disabled:bg-surface-800/60 disabled:text-surface-500 disabled:cursor-not-allowed';

        return <input ref={ref} className={`${base} ${className}`} {...props} />;
    }
);

Input.displayName = 'Input';
