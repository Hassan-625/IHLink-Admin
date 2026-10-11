import type {SelectHTMLAttributes} from 'react';
type Props=SelectHTMLAttributes<HTMLSelectElement>&{kind:'term'|'session';label?:string;placeholder?:string};
export function AcademicPeriodSelect({kind,label,placeholder,value,className='',...props}:Props){
 const current=String(value||'');const year=new Date().getFullYear();
 const defaults=kind==='term'?['First Term','Second Term','Third Term']:Array.from({length:31},(_,i)=>`${year-15+i}/${year-14+i}`);
 const options=Array.from(new Set([...defaults,...(current?[current]:[])]));
 const select=<select {...props} aria-label={props['aria-label']||label||(kind==='term'?'Term':'Academic session')} className={className||'w-full rounded-xl border p-3'} value={current}><option value="">{placeholder||`Select ${kind==='term'?'term':'academic session'}`}</option>{options.map(option=><option value={option} key={option}>{option}</option>)}</select>;
 return label?<label className="block text-sm font-semibold">{label}<div className="mt-1.5">{select}</div></label>:select;
}
