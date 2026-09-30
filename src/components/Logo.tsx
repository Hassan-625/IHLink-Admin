import { Link } from 'react-router-dom';
import type { ProductKey } from '@/lib/designTokens';

interface LogoProps {
  product?: ProductKey;
  variant?: 'full' | 'icon' | 'light';
  size?: 'sm' | 'md' | 'lg';
  disableLink?: boolean;
}

const productNames: Record<ProductKey, string> = {
  corporate: 'IHLink',
  datasub: 'DataSub',
  schoolpro: 'SchoolPro',
  consult: 'Consult',
  host: 'Host',
  engineering: 'Engineering',
};

const sizes = {
  sm: { box: 'w-9 h-9', text: 'text-base', sub: 'text-2xs' },
  md: { box: 'w-11 h-11', text: 'text-lg', sub: 'text-xs' },
  lg: { box: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' },
};

export function Logo({ product = 'corporate', variant = 'full', size = 'md', disableLink = false }: LogoProps) {
  const s = sizes[size];
  const name = productNames[product];

  const content = <>
      <div className={`${s.box} rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-sm ring-1 ring-slate-900/5 flex items-center justify-center shrink-0 overflow-hidden transition-all group-hover:scale-105 group-hover:shadow-md`}>
        <img src="/brand/ihlink-icon.png?v=20260928-valid-logo4" alt="IHLink" className="w-full h-full object-contain" />
      </div>
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <span className={`${s.text} font-extrabold ${variant === 'light' ? 'text-white' : 'text-ink'} tracking-tight`}>
            {product === 'corporate' ? 'IHLink' : name}
          </span>
          {product !== 'corporate' && (
            <span className={`${s.sub} ${variant === 'light' ? 'text-blue-100' : 'text-muted'} font-medium`}>by IHLink</span>
          )}
          {product === 'corporate' && (
            <span className={`${s.sub} ${variant === 'light' ? 'text-blue-100' : 'text-muted'} font-medium`}>Co. Ltd.</span>
          )}
        </div>
      )}
    </>;
  return disableLink
    ? <span className="flex items-center gap-2.5 group">{content}</span>
    : <Link to={product === 'corporate' ? '/' : `/${product}`} className="flex items-center gap-2.5 group">{content}</Link>;
}
