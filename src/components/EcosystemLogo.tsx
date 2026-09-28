import type { ProductKey } from '@/lib/designTokens';

export type EcosystemKey = ProductKey | 'print' | 'fabrication' | 'compute' | 'academy' | 'digital_business';
const meta: Record<EcosystemKey,{name:string;sub?:string}> = {
 corporate:{name:'IHLink',sub:'Co. Ltd.'},
 datasub:{name:'DataSub',sub:'by IHLink'},
 schoolpro:{name:'SchoolPro',sub:'by IHLink'},
 host:{name:'Hosting & Domains',sub:'by IHLink'},
 consult:{name:'Consult',sub:'by IHLink'},
 engineering:{name:'Engineering',sub:'by IHLink'},
 print:{name:'Print & Branding',sub:'by IHLink'},
 fabrication:{name:'3D & Fabrication Lab',sub:'by IHLink'},
 compute:{name:'AI & Compute',sub:'by IHLink'},
 academy:{name:'Academy',sub:'by IHLink'},
 digital_business:{name:'Digital Business Centre',sub:'by IHLink'},
};
export function EcosystemLogo({service,size='sm',iconOnly=false}:{service:EcosystemKey;size?:'sm'|'md';iconOnly?:boolean}){
 const m=meta[service]; const box=size==='md'?'w-12 h-12':'w-10 h-10';
 return <span className="inline-flex items-center gap-2.5 min-w-0">
  <span className={`${box} rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-sm ring-1 ring-slate-900/5 flex items-center justify-center shrink-0 overflow-hidden`}>
   <img src="/brand/ihlink-icon.png" alt="IHLink" className="w-full h-full object-contain" loading="lazy"/>
  </span>
  {!iconOnly&&<span className="flex flex-col leading-none min-w-0"><span className="font-extrabold text-ink truncate">{m.name}</span><span className="text-[10px] text-muted font-medium mt-1">{m.sub}</span></span>}
 </span>
}