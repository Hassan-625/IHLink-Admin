import {useCallback,useEffect,useMemo,useState} from "react";
import {CheckCircle2,RefreshCw,ShieldAlert,Trash2,XCircle} from "lucide-react";
import {ModulePage} from "@/components/ModulePage";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {useAuth} from "@/context/AuthContext";
import {supabase} from "@/lib/supabase";
import {adminSections,badge} from "./adminShared";

type RequestRow={id:string;user_id:string;status:string;reason:string|null;requested_at:string;reviewed_at:string|null;approved_at:string|null;completed_at:string|null;resolution_note:string|null;anonymised:boolean};
type Person={id:string;email:string;first_name:string|null;last_name:string|null;status:string};
const tone=(s:string):"green"|"amber"|"red"|"blue"=>s==="completed"?"green":s==="approved"||s==="pending"?"amber":s==="rejected"||s==="cancelled"?"red":"blue";

export function AdminDeletionRequestsPage(){
 const {profile}=useAuth();
 const [rows,setRows]=useState<RequestRow[]>([]),[people,setPeople]=useState<Person[]>([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState("");
 const load=useCallback(async(preserveNotice=false)=>{if(!supabase)return;const [r,p]=await Promise.all([
  supabase.from("account_deletion_requests").select("id,user_id,status,reason,requested_at,reviewed_at,approved_at,completed_at,resolution_note,anonymised").order("requested_at",{ascending:false}).limit(200),
  supabase.from("profiles").select("id,email,first_name,last_name,status")
 ]);setRows((r.data||[]) as RequestRow[]);setPeople((p.data||[]) as Person[]);if(r.error||p.error)setNotice(r.error?.message||p.error?.message||"");else if(!preserveNotice)setNotice("");},[]);
 useEffect(()=>{void load()},[load]);
 const personMap=useMemo(()=>new Map(people.map(p=>[p.id,p])),[people]);
 const pending=rows.filter(r=>r.status==="pending").length,approved=rows.filter(r=>r.status==="approved").length;
 async function review(row:RequestRow,action:"approve"|"reject"){
  if(!supabase||busy)return;
  const verb=action==="approve"?"Approve this request and immediately suspend all IHLink service access?":"Reject this deletion request?";
  if(!window.confirm(verb))return;
  const note=window.prompt(action==="reject"?"Rejection note (recommended):":"Approval/review note (optional):","")??undefined;if(note===undefined)return;
  setBusy(row.id);setNotice("");
  const {error}=await supabase.rpc("review_account_deletion",{p_request_id:row.id,p_action:action,p_note:note.trim()||null});
  if(error)setNotice(error.message);else{setNotice(action==="approve"?"Request approved. Customer access has been revoked; final Auth deletion remains a separate controlled step.":"Request rejected.");await load(true)}setBusy("");
 }
 async function finalise(row:RequestRow){
  if(!supabase||busy)return;
  if(!window.confirm("Finalise this approved request? This will soft-delete the Supabase Auth account and anonymise customer profile PII while retaining audit/financial references."))return;
  setBusy(row.id);setNotice("");
  const {data,error}=await supabase.functions.invoke("finalize-account-deletion",{body:{request_id:row.id}});
  if(error){try{const body=await (error as any).context?.json();setNotice(body?.message||body?.error||error.message)}catch{setNotice(error.message)}}else if(data?.error)setNotice(data.error+(data.detail?`: ${data.detail}`:""));else{setNotice("Account deletion finalised: Auth access removed and profile PII anonymised.");await load(true)}setBusy("");
 }
 const name=[profile?.first_name,profile?.last_name].filter(Boolean).join(" ")||"IHLink Super Admin";
 return <ModulePage product="corporate" sections={adminSections} title="Account Deletion Requests" description="Review customer closure requests, revoke ecosystem access safely, and separately finalise Auth deletion/anonymisation with a protected audit trail." userName={name} userRole="Super Administrator" primaryAction="Deletion review">
  <div className="grid gap-4 md:grid-cols-4"><Card><p className="text-sm text-muted">Pending review</p><p className="mt-2 text-3xl font-black text-amber-600">{pending}</p></Card><Card><p className="text-sm text-muted">Approved / access revoked</p><p className="mt-2 text-3xl font-black text-orange-600">{approved}</p></Card><Card><p className="text-sm text-muted">Completed</p><p className="mt-2 text-3xl font-black text-emerald-600">{rows.filter(r=>r.status==="completed").length}</p></Card><Card><p className="text-sm text-muted">Total requests</p><p className="mt-2 text-3xl font-black text-royal-600">{rows.length}</p></Card></div>
  <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><ShieldAlert className="h-6 w-6 shrink-0 text-amber-700"/><div><h3 className="font-bold text-amber-950">Two-stage safety control</h3><p className="mt-1 text-sm text-amber-900">Approval revokes profile/service access first. Finalisation is a separate Super Admin action that soft-deletes Auth and anonymises profile PII. Transaction, invoice, audit and accounting references are retained.</p></div></div></Card>
  {notice&&<div className="rounded-xl border border-royal-100 bg-royal-50 p-3 text-sm text-royal-900">{notice}</div>}
  <Card><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Deletion request queue</h3><p className="mt-1 text-sm text-muted">Newest requests first. Only pending requests can be approved/rejected; only approved requests can be finalised.</p></div><Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4"/>} onClick={()=>void load()}>Refresh</Button></div>
   <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-gray-50"><tr>{["Customer","Requested","Reason","Status","Review note","Actions"].map(x=><th key={x} className="p-3 text-xs uppercase text-muted">{x}</th>)}</tr></thead><tbody>{rows.map(r=>{const p=personMap.get(r.user_id);return <tr key={r.id} className="border-t align-top"><td className="p-3"><p className="font-bold">{p?[p.first_name,p.last_name].filter(Boolean).join(" ")||"Customer":"Anonymised customer"}</p><p className="text-xs text-muted">{p?.email||r.user_id}</p></td><td className="p-3 text-muted">{new Date(r.requested_at).toLocaleString("en-NG")}</td><td className="max-w-xs p-3 text-muted">{r.reason||"—"}</td><td className="p-3">{badge(r.status,tone(r.status))}</td><td className="max-w-xs p-3 text-muted">{r.resolution_note||"—"}</td><td className="p-3"><div className="flex flex-wrap gap-2">{r.status==="pending"&&<><Button size="sm" disabled={busy===r.id} leftIcon={<CheckCircle2 className="h-4 w-4"/>} onClick={()=>void review(r,"approve")}>Approve</Button><Button size="sm" variant="secondary" disabled={busy===r.id} leftIcon={<XCircle className="h-4 w-4"/>} onClick={()=>void review(r,"reject")}>Reject</Button></>}{r.status==="approved"&&<Button size="sm" disabled={busy===r.id} leftIcon={<Trash2 className="h-4 w-4"/>} onClick={()=>void finalise(r)}>Finalise deletion</Button>}{r.status==="completed"&&<span className="text-xs font-bold text-emerald-700">Auth removed · PII anonymised</span>}</div></td></tr>})}</tbody></table>{!rows.length&&<p className="py-10 text-center text-sm text-muted">No account deletion requests have been submitted.</p>}</div>
  </Card>
 </ModulePage>
}