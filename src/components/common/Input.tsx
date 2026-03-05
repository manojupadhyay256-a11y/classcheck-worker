import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = ({ label, error, icon, className, ...props }: InputProps) => {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-semibold text-gray-700 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    className={clsx(
                        "w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10",
                        icon && "pl-11",
                        error && "border-danger focus:border-danger focus:ring-danger/10",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <p className="text-xs font-medium text-danger ml-1">{error}</p>}
        </div>
    );
};

export default Input;
