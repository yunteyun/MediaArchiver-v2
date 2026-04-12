import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500',
    secondary: 'bg-surface-800 text-surface-200 border border-surface-700 hover:bg-surface-700',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'bg-transparent text-surface-300 hover:bg-surface-700/50',
};

const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
    icon: 'p-1.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'secondary', size = 'md', icon, children, className = '', ...props }, ref) => {
        const base =
            'inline-flex items-center gap-1.5 rounded transition-colors ' +
            'disabled:opacity-50 disabled:cursor-not-allowed';

        return (
            <button
                ref={ref}
                type={props.type ?? 'button'}
                className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
                {...props}
            >
                {icon && <span className="shrink-0">{icon}</span>}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
