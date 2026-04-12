import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, className = '', children, ...props }, ref) => {
        const base =
            'w-full rounded border border-surface-700 bg-surface-900 px-3 py-2 ' +
            'text-sm text-surface-200 ' +
            'focus:border-primary-500 focus:outline-none ' +
            'disabled:bg-surface-800/60 disabled:text-surface-500 disabled:cursor-not-allowed';

        return (
            <select ref={ref} className={`${base} ${className}`} {...props}>
                {options
                    ? options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                              {opt.label}
                          </option>
                      ))
                    : children}
            </select>
        );
    }
);

Select.displayName = 'Select';
