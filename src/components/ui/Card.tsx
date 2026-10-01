import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, hover = false, padding = 'md', className = '', ...props }: CardProps) {
  const hasCustomBackground = /(?:^|\s)!?bg-(?:\[[^\]]+\]|gradient\S*|\S+)/.test(className);
  const hasCustomBorder = /(?:^|\s)!?border-(?:0|transparent|\[[^\]]+\]|(?:[a-z]+-)?\d{2,3})(?:\s|$)/.test(className);
  return (
    <div
      className={`${hasCustomBackground ? '' : 'bg-white'} rounded-2xl border ${hasCustomBorder ? '' : 'border-border'} shadow-sm ${paddingClasses[padding]} ${hover ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold text-ink ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-muted mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-border ${className}`}>{children}</div>;
}
