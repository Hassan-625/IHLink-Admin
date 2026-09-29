import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: number;
}

export function Dropdown({ trigger, children, align = 'right', width = 240 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className="absolute top-full mt-2 bg-white rounded-xl shadow-float border border-border py-1.5 z-50 animate-fade-in-fast"
          style={{ width, [align]: 0 }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

export function DropdownItem({ children, onClick, icon, danger }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium transition-colors text-left ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink hover:bg-gray-50'
      }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1.5 border-t border-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-3.5 py-1.5 text-xs font-bold text-muted uppercase tracking-wide">{children}</div>;
}
