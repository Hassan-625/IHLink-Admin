import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Database, ExternalLink, Plug, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { ModulePage } from '@/components/ModulePage';
import { Card } from '@/components/ui/Card';
import { adminSections, badge } from './adminShared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Provider={code:string;display_name:string;status:string;priority:number|null;available_balance:number|null;success_rate:number|null;average_response_ms:number|null;is_active:boolean;last_callback_at:string|null;updated_at:string|null};
type Integration={name:string;platform:string;kind:string;status:'connected'|'configured'|'not_configured';detail:string;href?:string};

const formatDate=(v:string|null)=>v?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Never';
const statusTone=(s:string)=>s==='connected'||s==='active'?'green':s==='configured'?'blue':s==='not_configured'?'amber':'red';

export function AdminIntegrationsPage(){
 const {profile}=useAuth(); const [providers,setProviders]=useState<Provider[]>([]); const [counts,setCounts]=useState({events:0,datasubPayments:0,schoolproPayments:0,deliveries:0});
 const [registry,setRegistry]=useState<any[]>([]); const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{const client=supabase;if(!client){setError('Supabase is not configured.');setLoading(false);return;}setLoading(true);setError(null);
  const [p,e,dp,sp,nd,ir]=await Promise.all([
   client.from('datasub_provider_connections').select('code,display_name,status,priority,available_balance,success_rate,average_response_ms,is_active,last_callback_at,updated_at').order('priority'),
   client.from('datasub_provider_events').select('*',{count:'exact',head:true}),
   client.from('datasub_payment_intents').select('*',{count:'exact',head:true}),
   client.from('schoolpro_payment_intents').select('*',{count:'exact',head:true}),
   client.from('notification_deliveries').select('*',{count:'exact',head:true}),client.from('platform_integrations').select('product,provider_key,provider_name,integration_type,mode,is_enabled')
  ]); setRegistry(ir.data||[]); if(p.error)setError(p.error.message);else setProviders((p.data||[]) as Provider[]);
  setCounts({events:e.count||0,datasubPayments:dp.count||0,schoolproPayments:sp.count||0,deliveries:nd.count||0});
  const first=[e.error,dp.error,sp.error,nd.error].find(Boolean);if(first)setError(current=>current||first!.message);setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 const integrations=useMemo<Integration[]>(()=>[
  {name:'Supabase',platform:'Shared infrastructure',kind:'Database, Auth & Edge Functions',status:supabase?'connected':'not_configured',detail:supabase?'Shared production backend configured.':'Public Supabase configuration is missing.'},
  {name:'DataSub Provider API',platform:'DataSub',kind:'VTU fulfilment providers',status:providers.some(p=>p.is_active)?'connected':providers.length?'configured':'not_configured',detail:providers.length?`${providers.length} provider connection${providers.length===1?'':'s'} registered.`:'No provider connection registered.',href:'/admin/datasub'},
  {name:'DataSub Provider Webhooks',platform:'DataSub',kind:'Inbound provider callbacks',status:providers.some(p=>p.last_callback_at)?'connected':providers.length?'configured':'not_configured',detail:providers.some(p=>p.last_callback_at)?'At least one verified callback has been recorded.':'Awaiting a production provider callback.',href:'/admin/datasub'},
  {name:'Internal payment workflows',platform:'DataSub / SchoolPro',kind:'Payment intent records',status:(counts.datasubPayments+counts.schoolproPayments)>0?'configured':'not_configured',detail:(counts.datasubPayments+counts.schoolproPayments)>0?'Internal payment-intent records exist; this does not prove an external gateway is connected.':'No internal payment-intent activity is currently recorded.',href:'/admin/finance'},
  {name:'In-app notifications',platform:'All platforms',kind:'Internal notification delivery',status:counts.deliveries>0?'connected':'configured',detail:counts.deliveries>0?'Internal notification delivery records exist.':'The internal notification workflow is available; no deliveries are currently recorded.',href:'/admin/notifications'},
  {name:'Google OAuth',platform:'Shared authentication',kind:'Social sign-in',status:'configured',detail:'The application implements Google OAuth. External provider/dashboard activation is not inferred from application code.'}
 ],[providers,counts]);
 integrations.push(...registry.map(x=>({name:x.provider_name,platform:x.product.replaceAll('_',' '),kind:x.integration_type,status:x.is_enabled?'configured':'not_configured',detail:x.is_enabled?`Integration is enabled in the IHLink registry (${x.mode}). External connectivity should still be verified from provider activity.`:'Adapter prepared; awaiting verified provider configuration.'} as Integration)));
 const metrics=[{label:'Provider Connections',value:loading?'…':String(providers.length)},{label:'Provider Events',value:loading?'…':String(counts.events)},{label:'Payment Intents',value:loading?'…':String(counts.datasubPayments+counts.schoolproPayments)},{label:'Notification Deliveries',value:loading?'…':String(counts.deliveries)}];
 const userName=profile?[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.email:'Administrator';
 return <ModulePage product="corporate" sections={adminSections} title="Integrations" eyebrow="Central Administration" description="Central integration registry separating internal workflow readiness from externally verified provider connectivity." userName={userName} userRole={profile?.role?.replaceAll('_',' ')||'Authorized Administration'} primaryAction="Review Integrations" metrics={metrics}>
  {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Some integration data could not be loaded: {error}</div>}
  <Card padding="lg"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-bold"><Plug className="h-5 w-5"/>Integration registry</h3><p className="mt-1 text-sm text-muted">Internal records are not treated as proof of an external connection. Provider adapters remain not configured until explicitly enabled, and secrets are never displayed.</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>
   <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{integrations.map(i=><div key={i.name} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink">{i.name}</p><p className="mt-1 text-xs font-semibold text-royal-700">{i.platform}</p></div>{badge(i.status.replaceAll('_',' '),statusTone(i.status) as 'green'|'amber'|'red'|'blue')}</div><p className="mt-3 text-xs text-muted">{i.kind}</p><p className="mt-2 text-sm leading-5 text-muted">{i.detail}</p>{i.href&&<a href={i.href} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-royal-700">Open control <ExternalLink className="h-3.5 w-3.5"/></a>}</div>)}</div>
  </Card>
  <Card padding="lg"><h3 className="flex items-center gap-2 font-bold"><Database className="h-5 w-5"/>DataSub provider connections</h3>{providers.length===0?<p className="mt-3 text-sm text-muted">No provider connections are registered yet.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs text-muted"><th className="py-3">Provider</th><th>Status</th><th>Priority</th><th>Success rate</th><th>Avg response</th><th>Last callback</th></tr></thead><tbody>{providers.map(p=><tr key={p.code} className="border-b border-border/70"><td className="py-4"><p className="font-semibold">{p.display_name}</p><p className="text-xs text-muted">{p.code}</p></td><td>{badge(p.is_active?p.status||'active':'disabled',p.is_active?'green':'red')}</td><td>{p.priority??'—'}</td><td>{p.success_rate==null?'—':`${p.success_rate}%`}</td><td>{p.average_response_ms==null?'—':`${p.average_response_ms} ms`}</td><td>{formatDate(p.last_callback_at)}</td></tr>)}</tbody></table></div>}</Card>
  <div className="grid gap-4 lg:grid-cols-3"><Card padding="lg"><ShieldCheck className="h-5 w-5"/><h3 className="mt-3 font-bold">Credential safety</h3><p className="mt-2 text-sm text-muted">API keys, webhook secrets, service-role credentials and provider tokens belong in protected server-side secrets. This page intentionally never reads or displays them.</p></Card><Card padding="lg"><Activity className="h-5 w-5"/><h3 className="mt-3 font-bold">Operational events</h3><p className="mt-2 text-sm text-muted">{counts.events} provider event{counts.events===1?'':'s'} and {counts.datasubPayments+counts.schoolproPayments} payment intent{counts.datasubPayments+counts.schoolproPayments===1?'':'s'} are currently recorded.</p></Card><Card padding="lg"><Clock3 className="h-5 w-5"/><h3 className="mt-3 font-bold">Activation boundary</h3><p className="mt-2 text-sm text-muted">External services remain marked not configured until verified production credentials or genuine connection activity proves otherwise.</p></Card></div>
 </ModulePage>
}
