import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  themeClass?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, themeClass, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-white text-ink placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 ${themeClass || 'focus:ring-royal-500/20 focus:border-royal-500'} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  themeClass?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, themeClass, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-white text-ink placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 ${themeClass || 'focus:ring-royal-500/20 focus:border-royal-500'} ${error ? 'border-rose-400' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  themeClass?: string;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, themeClass, options, className = '', id, children, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-white text-ink transition-all focus:outline-none focus:ring-2 ${themeClass || 'focus:ring-royal-500/20 focus:border-royal-500'} ${error ? 'border-rose-400' : ''} ${className}`}
          {...props}
        >
          {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', ...props }, ref) => {
    return (
      <label className={`flex items-start gap-2.5 cursor-pointer ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded border-border text-royal-500 focus:ring-royal-500/20"
          {...props}
        />
        {(label || description) && (
          <span>
            {label && <span className="text-sm font-medium text-ink block">{label}</span>}
            {description && <span className="text-xs text-muted block">{description}</span>}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`flex items-center gap-2.5 cursor-pointer ${className}`}>
        <input
          ref={ref}
          type="radio"
          className="w-4 h-4 border-border text-royal-500 focus:ring-royal-500/20"
          {...props}
        />
        {label && <span className="text-sm font-medium text-ink">{label}</span>}
      </label>
    );
  }
);
Radio.displayName = 'Radio';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  themeClass?: string;
}

export function Toggle({ checked, onChange, label, themeClass }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? (themeClass || 'bg-royal-500') : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </label>
  );
}
