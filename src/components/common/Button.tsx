import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
    isLoading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const Button = ({
    children,
    variant = 'primary',
    isLoading = false,
    size = 'md',
    className,
    disabled,
    ...props
}: ButtonProps) => {
    const variants = {
        primary: 'bg-saas-accent text-white hover:bg-saas-accent-hover shadow-lg shadow-saas-accent/20',
        secondary: 'bg-secondary text-white hover:bg-secondary-hover shadow-lg shadow-secondary/20',
        danger: 'bg-danger text-white hover:bg-rose-600 shadow-lg shadow-rose-200',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
        outline: 'bg-transparent border-2 border-saas-accent text-saas-accent hover:bg-saas-accent/5',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-3',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            disabled={disabled || isLoading}
            className={clsx(
                "relative flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className={clsx(isLoading && "opacity-0")}>{children}</span>
            {isLoading && <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>}
        </button>
    );
};

export default Button;
