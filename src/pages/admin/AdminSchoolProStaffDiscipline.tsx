import {useCallback,useEffect,useMemo,useState} from 'react';
import {ModulePage} from '@/components/ModulePage';
import {Card} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {adminSections} from './adminShared';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/context/AuthContext';

type School={id:string;name:string};
type Member={id:string;role:string;employment_status?:string;profile?:{email?:string;first_name?:string|null;middle_name?:string|null;last_name?:string|null}|null};
type CaseRow={id:string;school_id:string;member_id:string;action_type:string;severity:string;summary:string;details:string|null;status:string;effective_at:string;staff_response:string|null;response_at:string|null;appeal_status:string;appeal_submitted_at:string|null;appeal_review_note:string|null;closure_note:string|null;created_at:string;updated_at:string;closed_at:string|null};
type EventRow={id:string;event_type:string;actor_id:string|null;before_state:any;after_state:any;created_at:string};

const label=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function AdminSchoolProStaffDiscipline(){
 const {profile}=useAuth();
 const [schools,setSchools]=useState<School[]>([]);
 const [schoolId,setSchoolId]=useState('');
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [events,setEvents]=useState<EventRow[]>([]);
 const [selected,setSelected]=useState<CaseRow|null>(null);
 const [search,setSearch]=useState('');
 const [statusFilter,setStatusFilter]=useState('all');
 const [appealFilter,setAppealFilter]=useState('all');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const loadSchools=useCallback(async()=>{
  if(!supabase)return;
  const result=await supabase.from('schoolpro_schools').select('id,name').order('name');
  if(result.error){setError(result.error.message);return}
  const rows=(result.data||[]) as School[];
  setSchools(rows);
  if(!schoolId&&rows.length)setSchoolId(rows[0].id);
 },[schoolId]);

 const loadCases=useCallback(async()=>{
  if(!supabase||!schoolId)return;
  setBusy(true);setError('');setEvents([]);setSelected(null);
  const result=await supabase.from('schoolpro_staff_disciplinary_cases')
   .select('id,school_id,member_id,action_type,severity,summary,details,status,effective_at,staff_response,response_at,appeal_status,appeal_submitted_at,appeal_review_note,closure_note,created_at,updated_at,closed_at')
   .eq('school_id',schoolId).order('created_at',{ascending:false});
  if(result.error){setError(result.error.message);setCases([]);setMembers([]);setBusy(false);return}
  const rows=(result.data||[]) as CaseRow[];
  setCases(rows);
  const ids=[...new Set(rows.map(row=>row.member_id))];
  if(ids.length){
   const memberResult=await supabase.from('schoolpro_members')
    .select('id,role,employment_status,profile:profiles!schoolpro_members_user_id_fkey(email,first_name,middle_name,last_name)')
    .eq('school_id',schoolId).in('id',ids);
   if(memberResult.error)setError(memberResult.error.message);
   else setMembers((memberResult.data||[]) as unknown as Member[]);
  }else setMembers([]);
  setBusy(false);
 },[schoolId]);

 useEffect(()=>{void loadSchools()},[loadSchools]);
 useEffect(()=>{void loadCases()},[loadCases]);

 async function openCase(row:CaseRow){
  if(!supabase)return;
  setSelected(row);setEvents([]);setNotice('');
  const result=await supabase.from('schoolpro_staff_disciplinary_events')
   .select('id,event_type,actor_id,before_state,after_state,created_at')
   .eq('school_id',row.school_id).eq('case_id',row.id).order('created_at',{ascending:false});
  if(result.error)setNotice(result.error.message);
  else setEvents((result.data||[]) as EventRow[]);
 }

 const memberById=useMemo(()=>new Map(members.map(member=>[member.id,member])),[members]);
 const visible=useMemo(()=>cases.filter(row=>{
  if(statusFilter!=='all'&&row.status!==statusFilter)return false;
  if(appealFilter!=='all'&&row.appeal_status!==appealFilter)return false;
  const member=memberById.get(row.member_id);
  const name=[member?.profile?.first_name,member?.profile?.middle_name,member?.profile?.last_name,member?.profile?.email].filter(Boolean).join(' ');
  return !search||[row.summary,row.action_type,row.severity,row.status,name].join(' ').toLowerCase().includes(search.toLowerCase());
 }),[cases,statusFilter,appealFilter,search,memberById]);

 const selectedSchool=schools.find(s=>s.id===schoolId);
 const nameFor=(id:string)=>{const member=memberById.get(id);return [member?.profile?.first_name,member?.profile?.middle_name,member?.profile?.last_name].filter(Boolean).join(' ')||member?.profile?.email||'Staff member';};

 return <ModulePage product="corporate" sections={adminSections} title="SchoolPro Staff Disciplinary Oversight" description="Platform-level, read-only oversight of school staff disciplinary cases, responses, appeals and immutable event history. Case actions remain with authorised school HR and leadership." userName={profile?.email||'Administrator'} userRole="Super Administrator" metrics={[{label:'Cases',value:String(cases.length)},{label:'Open',value:String(cases.filter(row=>row.status!=='closed').length)},{label:'Appeals pending',value:String(cases.filter(row=>row.appeal_status==='pending').length)},{label:'Selected school',value:selectedSchool?.name||'—'}]}>
  {(error||notice)&&<p role="status" className="rounded-xl border p-3 text-sm">{error||notice}</p>}
  <Card><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><label className="text-sm font-semibold">School workspace<select aria-label="School workspace" value={schoolId} onChange={e=>setSchoolId(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3 text-sm">{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="flex items-end"><Button variant="secondary" disabled={busy||!schoolId} onClick={()=>void loadCases()}>{busy?'Loading…':'Refresh cases'}</Button></div></div></Card>
  <Card padding="none" className="min-w-0 overflow-hidden">
   <div className="grid gap-3 border-b p-4 md:grid-cols-3"><input type="search" aria-label="Search disciplinary cases" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff, action or case summary" className="min-w-0 rounded-lg border p-2 text-sm"/><select aria-label="Case status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="all">All case statuses</option>{['open','action_issued','appealed','closed'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select><select aria-label="Appeal status" value={appealFilter} onChange={e=>setAppealFilter(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="all">All appeal statuses</option>{['not_submitted','pending','accepted','rejected'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select></div>
   <div className="max-h-[65vh] min-w-0 overflow-auto" role="region" aria-label="Staff disciplinary cases table; scroll horizontally and vertically to view all columns" tabIndex={0}><table className="w-full min-w-[1000px] text-left text-sm"><thead className="sticky top-0 z-10 bg-gray-50"><tr>{['Staff member','Action','Severity','Case summary','Status','Appeal','Effective','Created',''].map(x=><th key={x} className="whitespace-nowrap p-3 text-xs uppercase text-muted">{x}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id} className="border-t"><td className="p-3 font-semibold">{nameFor(row.member_id)}</td><td className="p-3 whitespace-nowrap">{label(row.action_type)}</td><td className="p-3">{label(row.severity)}</td><td className="max-w-[300px] p-3">{row.summary}</td><td className="p-3">{label(row.status)}</td><td className="p-3">{label(row.appeal_status)}</td><td className="p-3 whitespace-nowrap">{new Date(row.effective_at).toLocaleDateString()}</td><td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-3"><Button size="sm" variant="secondary" onClick={()=>void openCase(row)}>View history</Button></td></tr>)}</tbody></table>{!visible.length&&<p className="p-8 text-center text-sm text-muted">No disciplinary cases match this school and filter.</p>}</div>
  </Card>
  {selected&&<Card><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{nameFor(selected.member_id)} · {label(selected.action_type)}</h2><p className="mt-1 text-sm text-muted">{selected.summary}</p></div><Button size="sm" variant="secondary" onClick={()=>{setSelected(null);setEvents([])}}>Close details</Button></div>
   {selected.details&&<p className="mt-3 whitespace-pre-wrap text-sm">{selected.details}</p>}
   <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted">Staff response</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.staff_response||'No response recorded.'}</p><p className="mt-1 text-xs text-muted">{selected.response_at?new Date(selected.response_at).toLocaleString():''}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted">Appeal</p><p className="mt-1 text-sm">{label(selected.appeal_status)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.appeal_review_note||'No appeal review note.'}</p></div></div>
   <h3 className="mt-5 font-bold">Immutable case event history</h3><div className="mt-3 space-y-3">{events.map(event=><div key={event.id} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><b className="text-sm">{label(event.event_type)}</b><span className="text-xs text-muted">{new Date(event.created_at).toLocaleString()}</span></div><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(event.after_state,null,2)}</pre></div>)}{!events.length&&<p className="text-sm text-muted">No event history is available for this case.</p>}</div>
  </Card>}
 </ModulePage>;
}
