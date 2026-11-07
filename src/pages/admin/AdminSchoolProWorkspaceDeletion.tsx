import {useCallback,useEffect,useMemo,useState} from 'react';
import {ModulePage} from '@/components/ModulePage';
import {Card} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {adminSections} from './adminShared';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/context/AuthContext';

type School={id:string;name:string;status:string};
type RequestRow={id:string;school_id:string;requested_by:string;request_reason:string;status:string;requested_at:string;reviewed_by:string|null;reviewed_at:string|null;review_note:string|null;executed_by:string|null;executed_at:string|null;execution_note:string|null;preflight_snapshot:Record<string,any>};
export function AdminSchoolProWorkspaceDeletion(){
 const {profile,user}=useAuth();
 const [schools,setSchools]=useState<School[]>([]);
 const [rows,setRows]=useState<RequestRow[]>([]);
 const [filter,setFilter]=useState('open');
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const schoolById=useMemo(()=>new Map(schools.map(s=>[s.id,s])),[schools]);
 const load=useCallback(async()=>{
  if(!supabase)return;
  setBusy('loading');setError('');
  const [schoolResult,requestResult]=await Promise.all([
   supabase.from('schoolpro_schools').select('id,name,status').order('name'),
   supabase.from('schoolpro_workspace_deletion_requests').select('id,school_id,requested_by,request_reason,status,requested_at,reviewed_by,reviewed_at,review_note,executed_by,executed_at,execution_note,preflight_snapshot').order('requested_at',{ascending:false})
  ]);
  if(schoolResult.error)setError(schoolResult.error.message);else setSchools((schoolResult.data||[]) as School[]);
  if(requestResult.error)setError(requestResult.error.message);else setRows((requestResult.data||[]) as RequestRow[]);
  setBusy('');
 },[]);
 useEffect(()=>{void load()},[load]);
 const visible=useMemo(()=>rows.filter(row=>filter==='all'||(filter==='open'?['pending','approved'].includes(row.status):row.status===filter)),[rows,filter]);
 async function review(row:RequestRow,decision:'approved'|'rejected'){
  if(!supabase||busy)return;
  const title=decision==='approved'?'Approval':'Rejection';
  const note=window.prompt(title+' note (at least 10 characters):');
  if(note===null)return;
  if(note.trim().length<10){setError('Enter a review note of at least 10 characters.');return}
  setBusy(row.id);setError('');setNotice('');
  const result=await supabase.rpc('schoolpro_review_workspace_deletion',{p_request:row.id,p_decision:decision,p_note:note.trim()});
  setBusy('');
  if(result.error)setError(result.error.message);else{setNotice('Workspace removal request '+decision+'.');await load();}
 }
 async function execute(row:RequestRow){
  if(!supabase||busy)return;
  const school=schoolById.get(row.school_id);
  if(!school){setError('The school record could not be resolved.');return}
  const confirmation=window.prompt('This will deactivate '+school.name+' and retain its records. Type the exact school name to execute:');
  if(confirmation===null)return;
  if(confirmation.trim()!==school.name){setError('The school name confirmation does not match.');return}
  setBusy(row.id);setError('');setNotice('');
  const result=await supabase.rpc('schoolpro_execute_workspace_deletion',{p_request:row.id,p_confirmation:confirmation.trim()});
  setBusy('');
  if(result.error)setError(result.error.message);else{setNotice('Workspace access deactivated. Academic, financial, legal, audit and Storage records remain retained.');await load();}
 }
 const openCount=rows.filter(r=>['pending','approved'].includes(r.status)).length;
 return <ModulePage product="corporate" sections={adminSections} title="SchoolPro Workspace Removal Review" description="Review proprietor-initiated removal requests, record independent decisions and execute approved safe deactivation. This workflow retains tenant history; it does not physically purge school records or Storage objects." userName={profile?.email||'Administrator'} userRole="Super Administrator" metrics={[{label:'Open requests',value:String(openCount)},{label:'Pending review',value:String(rows.filter(r=>r.status==='pending').length)},{label:'Approved for execution',value:String(rows.filter(r=>r.status==='approved').length)},{label:'Executed',value:String(rows.filter(r=>r.status==='executed').length)}]}>
  {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border p-3 text-sm">{notice}</p>}
  <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Removal request queue</h2><p className="text-sm text-muted">Requesters cannot approve their own request; the approving reviewer cannot execute it.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Request status filter" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="open">Open requests</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="executed">Executed</option><option value="cancelled">Cancelled</option><option value="all">All requests</option></select><Button size="sm" variant="secondary" disabled={busy==='loading'} onClick={()=>void load()}>Refresh</Button></div></div></Card>
  <div className="space-y-4">{visible.map(row=>{const school=schoolById.get(row.school_id);const canReview=row.status==='pending'&&row.requested_by!==user?.id;const canExecute=row.status==='approved'&&row.requested_by!==user?.id&&row.reviewed_by!==user?.id;return <Card key={row.id}>
   <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{school?.name||'School workspace'}</h3><p className="text-xs text-muted">Requested {new Date(row.requested_at).toLocaleString()} · {row.status.replaceAll('_',' ')}</p></div><div className="flex flex-wrap gap-2">{canReview&&<><Button size="sm" disabled={busy===row.id} onClick={()=>void review(row,'approved')}>Approve</Button><Button size="sm" variant="secondary" disabled={busy===row.id} onClick={()=>void review(row,'rejected')}>Reject</Button></>}{canExecute&&<Button size="sm" disabled={busy===row.id} onClick={()=>void execute(row)}>Execute safe deactivation</Button>}{row.status==='approved'&&!canExecute&&<span className="text-xs text-muted">Execution requires a different Super Admin.</span>}</div></div>
   <p className="mt-3 whitespace-pre-wrap text-sm">{row.request_reason}</p>
   <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3"><b className="text-xs uppercase text-muted">Preflight inventory</b><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(row.preflight_snapshot,null,2)}</pre></div><div className="rounded-lg border p-3"><b className="text-xs uppercase text-muted">Platform decision & execution</b><p className="mt-2 text-sm">{row.review_note||'Not reviewed'}</p><p className="mt-2 text-xs text-muted">{row.reviewed_at?'Reviewed '+new Date(row.reviewed_at).toLocaleString():''}</p><p className="mt-3 text-sm">{row.execution_note||'Not executed'}</p><p className="mt-1 text-xs text-muted">{row.executed_at?'Executed '+new Date(row.executed_at).toLocaleString():''}</p></div></div>
  </Card>})}{!visible.length&&<Card><p className="p-8 text-center text-sm text-muted">No workspace removal requests match this filter.</p></Card>}</div>
 </ModulePage>;
}
