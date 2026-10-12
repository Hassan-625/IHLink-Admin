import {useEffect,useMemo,useState} from 'react';
import {schoolSection,SCHOOL_SECTIONS,type SchoolClass} from '@/lib/schoolClassFilters';
export function SchoolClassSelect({classes,value,onChange,required=false,emptyLabel='Select class',onSectionChange}:{classes:SchoolClass[];value:string;onChange:(value:string)=>void;required?:boolean;emptyLabel?:string;onSectionChange?:(section:string)=>void}){
 const [section,setSection]=useState(''),[group,setGroup]=useState('');
 const sections=useMemo(()=>Array.from(new Set([...SCHOOL_SECTIONS,...classes.map(c=>schoolSection(c.level,c.name))])),[classes]);
 useEffect(()=>{const selected=classes.find(c=>c.id===value);if(selected){setSection(schoolSection(selected.level,selected.name));setGroup(selected.name)}},[classes,value]);
 const options=classes.filter(c=>schoolSection(c.level,c.name)===section);
 const names=[...new Set(options.map(c=>c.name))],arms=options.filter(c=>c.name===group),hasArms=arms.some(c=>c.arm);
 const selectClass=(name:string)=>{setGroup(name);const matches=options.filter(c=>c.name===name);onChange(matches.length===1&&!matches[0].arm?matches[0].id:'')};
 return <div className="grid min-w-0 gap-2"><label className="text-xs font-semibold">Section<select aria-label="School section" className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2.5 text-sm" value={section} onChange={e=>{setSection(e.target.value);setGroup('');onChange('');onSectionChange?.(e.target.value)}}><option value="">Select section</option>{sections.map(s=><option key={s}>{s}</option>)}</select></label><label className="text-xs font-semibold">Class<select aria-label="School class" required={required} disabled={!section} className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50" value={group} onChange={e=>selectClass(e.target.value)}><option value="">{emptyLabel}</option>{names.map(name=><option key={name}>{name}</option>)}</select></label>{hasArms&&<label className="text-xs font-semibold">Class arm<select aria-label="School class arm" required={required} className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2.5 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">Select arm</option>{arms.map(c=><option key={c.id} value={c.id}>{c.arm||'Main class'}</option>)}</select></label>}</div>
}

