import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Search,RefreshCw,School,Database} from 'lucide-react';
import {ModulePage} from '@/components/ModulePage';
import {Card} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {adminSections} from './adminShared';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/context/AuthContext';

type Row=Record<string,any>;
type Def={title:string;description:string;tables:string[]};
const defs:Record<string,Def>={
 overview:{title:'School Administration',description:'Select a school and administer its production SchoolPro records inside Command Center.',tables:['schoolpro_schools','schoolpro_subscriptions','schoolpro_feature_overrides']},
 students:{title:'Students & Enrollment',description:'Students and enrolment records.',tables:['schoolpro_students','schoolpro_guardian_links']},
 admissions:{title:'Admissions',description:'Applications, offers and admission operations.',tables:['schoolpro_admissions','schoolpro_admission_offers','schoolpro_admission_events']},
 results:{title:'Results & Assessment',description:'Assessment schemes and result records.',tables:['schoolpro_assessment_schemes','schoolpro_results']},
 'result-templates':{title:'Result Templates',description:'School report-card templates and mappings.',tables:['schoolpro_result_templates']},
 reports:{title:'Broadsheets & Reports',description:'Academic result and reporting data.',tables:['schoolpro_results','schoolpro_assessment_schemes']},
 cbt:{title:'CBT Management',description:'Tests, eligibility and attempts.',tables:['schoolpro_cbt_tests','schoolpro_cbt_eligibility','schoolpro_cbt_attempts']},
 'question-bank':{title:'Question Bank',description:'CBT question-bank records.',tables:['schoolpro_question_bank','schoolpro_cbt_test_questions']},
 finance:{title:'Fees & Finance',description:'Fee structures, invoices, proofs and payments.',tables:['schoolpro_fee_structures','schoolpro_invoices','schoolpro_payment_proofs','schoolpro_fee_payments']},
 documents:{title:'Document & Certificate Studio',description:'Document templates and issued documents.',tables:['schoolpro_document_templates','schoolpro_document_issues','schoolpro_academic_documents']},
 branding:{title:'Branding & School Portal',description:'School identity and portal branding configuration.',tables:['schoolpro_branding','schoolpro_custom_requests']},
 academics:{title:'Classes, Subjects & Teachers',description:'Classes, subjects and school membership.',tables:['schoolpro_classes','schoolpro_subjects','schoolpro_members']},
 attendance:{title:'Attendance & Timetable',description:'Attendance and timetable operations.',tables:['schoolpro_attendance','schoolpro_timetable_entries']},
 learning:{title:'Assignments & Announcements',description:'Assignments and school communications.',tables:['schoolpro_assignments','schoolpro_announcements']},
 guardians:{title:'Parents & Guardians',description:'Guardian links and parent access.',tables:['schoolpro_guardian_links']},
 staff:{title:'Staff & Access',description:'Staff membership and access controls.',tables:['schoolpro_members','schoolpro_member_permissions']},
 permissions:{title:'Roles & Permissions',description:'School-level operational permissions.',tables:['schoolpro_members','schoolpro_member_permissions']},
 operations:{title:'School Operations',description:'Library, transport, hostel, inventory, payroll, leave, discipline and health.',tables:['schoolpro_library_books','schoolpro_transport_routes','schoolpro_hostel_rooms','schoolpro_inventory_assets','schoolpro_payroll_records','schoolpro_leave_requests','schoolpro_discipline_records','schoolpro_health_records']},
 notifications:{title:'Notifications',description:'SchoolPro notification and email queues.',tables:['schoolpro_notifications','schoolpro_email_queue']}
};
const label=(s:string)=>s.replace(/^schoolpro_/,'').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const display=(r:Row)=>r.name||r.title||r.full_name||r.student_name||r.email||r.status||r.id;
export function AdminSchoolProWorkspace(){
 const {section='overview'}=useParams();const def=defs[section]||defs.overview;const {profile}=useAuth();
 const [schools,setSchools]=useState<Row[]>([]),[schoolId,setSchoolId]=useState(''),[table,setTable]=useState(def.tables[0]),[rows,setRows]=useState<Row[]>([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{setTable(def.tables[0]);setRows([]);setSearch('');},[section]);
 useEffect(()=>{void(async()=>{if(!supabase)return;const r=await supabase.from('schoolpro_schools').select('id,name,slug,status').order('name');if(r.error){setError(r.error.message);return;}setSchools(r.data||[]);if(!schoolId&&r.data?.[0])setSchoolId(r.data[0].id);})()},[]);
 const load=useCallback(async()=>{if(!supabase||!table)return;setLoading(true);setError('');let q=supabase.from(table).select('*').limit(250);if(table!=='schoolpro_schools'&&schoolId)q=q.eq('school_id',schoolId);const r=await q;if(r.error){setError(r.error.message);setRows([]);}else setRows(r.data||[]);setLoading(false);},[table,schoolId]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(r=>!search||Object.values(r).some(v=>String(v??'').toLowerCase().includes(search.toLowerCase()))),[rows,search]);
 const school=schools.find(s=>s.id===schoolId);
 return <ModulePage product="corporate" sections={adminSections} title={def.title} eyebrow="SchoolPro · Command Center" description={def.description} userName={[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||profile?.email||'Administrator'} userRole={profile?.role?.replaceAll('_',' ')||'Administration'}>
  <div className="mb-4 flex flex-wrap gap-2"><Link className="rounded-xl border px-4 py-2 text-sm font-bold" to="/admin/schoolpro">← SchoolPro Control Centre</Link>{Object.entries(defs).filter(([k])=>k!=='overview').slice(0,0).map(()=>null)}</div>
  <Card padding="lg"><div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-bold"><span className="flex items-center gap-2"><School className="h-4 w-4"/>School context</span><select className="mt-2 w-full rounded-xl border p-3" value={schoolId} onChange={e=>setSchoolId(e.target.value)}><option value="">All / choose school</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm font-bold"><span className="flex items-center gap-2"><Database className="h-4 w-4"/>Workspace dataset</span><select className="mt-2 w-full rounded-xl border p-3" value={table} onChange={e=>setTable(e.target.value)}>{def.tables.map(t=><option key={t} value={t}>{label(t)}</option>)}</select></label><Button className="self-end" variant="secondary" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div><p className="mt-3 text-xs text-muted">Active school: <b>{school?.name||'not selected'}</b>. Data remains inside the IHLink Command Center and is read directly from the shared production backend.</p></Card>
  {error&&<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
  <Card className="mt-5" padding="lg"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">{label(table)}</h2><p className="text-xs text-muted">{loading?'Loading…':filtered.length+' production record(s)'}</p></div><label className="relative min-w-[260px] grow md:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted"/><input className="w-full rounded-xl border py-2.5 pl-10 pr-3" type="search" placeholder="Search this workspace" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
   <div className="mt-4 space-y-3">{filtered.map((r,i)=><details key={r.id||i} className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">{display(r)} <span className="ml-2 text-xs font-normal text-muted">{r.status||''}</span></summary><dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">{Object.entries(r).map(([k,v])=><div key={k} className="min-w-0"><dt className="text-xs font-medium text-muted">{label(k)}</dt><dd className="mt-1 break-words">{v===null?'—':typeof v==='object'?JSON.stringify(v):String(v)}</dd></div>)}</dl></details>)}{!loading&&!filtered.length&&<p className="rounded-xl bg-slate-50 p-5 text-sm text-muted">No production records in this school/workspace.</p>}</div>
  </Card>
 </ModulePage>
}