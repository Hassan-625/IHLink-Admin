import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: { label: string; description?: string }[];
  current: number;
  themeClass?: string;
}

export function Stepper({ steps, current, themeClass }: StepperProps) {
  const activeCls = themeClass || 'bg-royal-500 border-royal-500 text-white';
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={i} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0 ${
                  isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                  isActive ? activeCls :
                  'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold whitespace-nowrap ${isActive || isDone ? 'text-ink' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-2xs text-muted whitespace-nowrap hidden lg:block">{step.description}</p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 -mt-6 transition-colors ${i < current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({ value, max = 100, label, showValue, color, size = 'md' }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100);
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs font-semibold text-ink">{label}</span>}
          {showValue && <span className="text-xs font-bold text-muted">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color || 'bg-royal-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-flex group">
      {children}
      <div className={`absolute ${posClasses[position]} px-2.5 py-1.5 text-xs font-medium text-white bg-navy-900 rounded-lg shadow-soft opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50`}>
        {content}
      </div>
    </div>
  );
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-royal-100 text-royal-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-sky-100 text-sky-700'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${avatarSizes[size]} rounded-full ${src ? '' : colors[colorIdx]} flex items-center justify-center font-bold shrink-0 overflow-hidden ${className}`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

interface AccordionProps {
  items: { question: string; answer: ReactNode }[];
  defaultOpen?: number;
}

export function Accordion({ items, defaultOpen }: AccordionProps) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <span className="text-sm font-bold text-ink">{item.question}</span>
            <span className={`text-muted transition-transform ${open === i ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-muted animate-fade-in">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
