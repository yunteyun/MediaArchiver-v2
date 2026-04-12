import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, className = '', id, ...props }, ref) => {
        return (
            <label
                htmlFor={id}
                className={`flex cursor-pointer items-center gap-2 text-sm text-surface-200 ${className}`}
            >
                <input
                    ref={ref}
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded"
                    {...props}
                />
                {label}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
