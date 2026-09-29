import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  themeClass?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-royal-600 !text-white hover:bg-royal-700 shadow-soft',
  secondary: 'bg-white text-ink border border-border hover:bg-gray-50 shadow-soft',
  outline: 'bg-transparent text-royal-600 border border-royal-300 hover:bg-royal-50',
  ghost: 'bg-transparent text-ink hover:bg-gray-100',
  danger: 'bg-rose-600 !text-white hover:bg-rose-700 shadow-soft',
  success: 'bg-emerald-600 !text-white hover:bg-emerald-700 shadow-soft',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-sm rounded-xl gap-2',
  xl: 'px-8 py-3.5 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', leftIcon, rightIcon, fullWidth, themeClass, className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2';
    const hasLightBackground = /(?:^|\s)!?bg-white(?:\s|$)/.test(className);
    const variantCls = themeClass
      ? `${themeClass} !text-white shadow-soft`
      : hasLightBackground
        ? 'shadow-soft border border-white/80'
        : variantClasses[variant];
    return (
      <button
        ref={ref}
        className={`${base} ${variantCls} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {leftIcon && <span className="shrink-0 text-current">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0 text-current">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
