import {useState} from 'react';
import {SchoolClassSelect} from './SchoolClassSelect';
import type {SchoolClass} from '@/lib/schoolClassFilters';
type Student={id:string;class_id?:string|null;first_name?:string;last_name?:string;admission_number?:string};
export function SchoolStudentSelect({classes,students,value,onChange}:{classes:SchoolClass[];students:Student[];value:string;onChange:(id:string)=>void}){
 const [classId,setClassId]=useState('');
 return <div className="space-y-2"><SchoolClassSelect classes={classes} value={classId} onChange={id=>{setClassId(id);onChange('')}}/><label className="block text-xs font-semibold">Student<select aria-label="Student" className="mt-1 w-full min-w-0 rounded-lg border p-2.5 text-sm" disabled={!classId} value={value} onChange={e=>onChange(e.target.value)}><option value="">{classId?'Select student':'Choose section, class and arm first'}</option>{students.filter(s=>s.class_id===classId).map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.admission_number}</option>)}</select></label></div>
}
