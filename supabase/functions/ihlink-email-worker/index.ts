import {createClient} from 'jsr:@supabase/supabase-js@2';
import {emailConfig,submitEmail} from '../_shared/email.ts';
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:expected,error}=await admin.rpc('ihlink_worker_token');const received=req.headers.get('authorization')?.replace(/^Bearer /,'');
 if(error||!expected||!received)return json({error:'Unauthorized'},401);
 const hash=async(v:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 const [a,b]=await Promise.all([hash(expected),hash(received)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return json({error:'Unauthorized'},401);
 const config=emailConfig(n=>Deno.env.get(n));if(!config)return json({configured:false,message:'Email delivery is not configured. Queued messages are preserved.'},503);
 const body=await req.json().catch(()=>({}));const {data:jobs,error:claimError}=await admin.rpc('claim_ihlink_emails',{p_school_id:body.school_id||null});if(claimError)return json({error:'Email queue is unavailable'},503);
 let accepted=0,failed=0;
 for(let start=0;start<(jobs||[]).length;start+=5)await Promise.all(jobs.slice(start,start+5).map(async(job:any)=>{
  const templateKey=job.source==='notification_deliveries'?'general_announcement':job.template_key||'transactional';
  const {data:template}=await admin.from('ihlink_email_templates').select('subject,html_body,text_body').eq('platform_code',job.product).eq('template_key',templateKey).eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(template){job.template_html=template.html_body;job.template_text=template.text_body;const original=job.subject;job.subject=String(template.subject||original).replaceAll('{{subject}}',original).replaceAll('{{first_name}}',job.recipient_name||'IHLink customer').replace(/[\r\n]/g,' ').slice(0,200);}
  let result={accepted:false,id:null as string|null,retry:true,status:0};try{result=await submitEmail(config,job)}catch{/* Retain retryable jobs without leaking provider credentials. */}
  const retry=!result.accepted&&result.retry&&job.attempts<5,next=new Date(Date.now()+60000*2**Number(job.attempts)).toISOString(),message=result.accepted?null:'Email was not accepted. Check delivery settings or retry later.';
  if(job.queue==='schoolpro')await admin.from('schoolpro_email_queue').update({status:result.accepted?'sent':retry?'pending':'failed',sent_at:result.accepted?new Date().toISOString():null,provider_message_id:result.id,error:message,scheduled_at:retry?next:job.scheduled_at}).eq('id',job.id).eq('status','processing');
  else{
   await admin.from('ihlink_email_queue').update({status:result.accepted?'accepted':retry?'queued':'failed',accepted_at:result.accepted?new Date().toISOString():null,provider_message_id:result.id,last_error:message,next_attempt_at:next,locked_at:null}).eq('id',job.id).eq('status','processing');
   if(job.source==='notification_deliveries'&&(result.accepted||!retry))await admin.from('notification_deliveries').update({status:result.accepted?'delivered':'failed',delivered_at:result.accepted?new Date().toISOString():null,failure_reason:message}).eq('id',job.source_id).eq('status','queued');
  }
  if(result.accepted)accepted++;else failed++;
 }));
 return json({configured:true,provider:config.provider,accepted,failed,message:'Accepted means the email provider accepted the message; inbox delivery depends on the receiving mailbox.'});
});
