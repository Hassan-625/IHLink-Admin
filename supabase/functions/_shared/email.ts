export const escapeHtml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type EmailConfig={provider:'resend'|'brevo';key:string;email:string;name:string};
export function emailConfig(env:(name:string)=>string|undefined):EmailConfig|null{
 const provider=env('IHLINK_EMAIL_PROVIDER')||(env('BREVO_API_KEY')?'brevo':'resend');
 const key=env(provider==='brevo'?'BREVO_API_KEY':'RESEND_API_KEY'),from=env('IHLINK_FROM_EMAIL')||env('SCHOOLPRO_FROM_EMAIL')||'';
 const email=from.match(/<([^>]+)>/)?.[1]||from;
 if(!['resend','brevo'].includes(provider)||!key||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.endsWith('@resend.dev'))return null;
 return {provider:provider as EmailConfig['provider'],key,email,name:env('IHLINK_FROM_NAME')||'IHLink Co Ltd'};
}
export function emailContent(job:any){
 const products:Record<string,string>={datasub:'DataSub',schoolpro:'SchoolPro',consult:'Consult',host:'Hosting',engineering:'Engineering',print:'Print and Branding',fabrication:'3D Fabrication',compute:'AI and Compute',academy:'Academy',digital_business:'Digital Business',business_centre:'Business Centre',corporate:'IHLink'};
 const product=products[job.product]||'IHLink',name=escapeHtml(job.recipient_name||'IHLink customer'),subject=escapeHtml(job.subject),message=escapeHtml(job.message).replace(/\n/g,'<br>');
 const bases:Record<string,string>={schoolpro:'https://ihlink-schoolpro.onrender.com',datasub:'https://ihlink-datasub.onrender.com'};
 const base=bases[job.product]||'https://ihlink-corporate.onrender.com';
 let href=base;try{const u=new URL(job.action_url||'',base);if(u.protocol==='https:'&&!u.username&&!u.password)href=u.href;}catch{/* Use the trusted product home. */}
 const values:Record<string,string>={first_name:job.recipient_name||'IHLink customer',message:String(job.message||''),subject:String(job.subject||''),action_url:href,product};
 const render=(template:string,html=false)=>template.replace(/\{\{(first_name|message|subject|action_url|product)\}\}/g,(_m,k)=>html?escapeHtml(values[k]).replace(/\n/g,'<br>'):values[k]);
 const body=job.template_html?render(job.template_html,true):`<p>Hello ${name},</p><p style="line-height:1.6">${message}</p>`;
 const html=`<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#14213d"><main style="max-width:600px;margin:24px auto;background:white;padding:32px"><p style="font-size:24px;font-weight:bold;color:#1d4ed8">IHLink ${escapeHtml(product)}</p><h1 style="font-size:22px">${subject}</h1>${body}<p><a href="${escapeHtml(href)}" style="color:#1d4ed8">Open ${escapeHtml(product)}</a></p><hr><p style="font-size:12px">IHLink Co Ltd · WhatsApp 0814 667 6278<br>Never share your password, passcode or transaction PIN.</p></main></body></html>`;
 return {html,text:job.template_text?render(job.template_text):`IHLink ${product}\n\n${job.subject}\n\nHello ${job.recipient_name||'IHLink customer'},\n\n${job.message}\n\n${href}\n\nIHLink Co Ltd · WhatsApp 0814 667 6278`};
}
export async function submitEmail(config:EmailConfig,job:any,send:typeof fetch=fetch){
 const content=emailContent(job),brevo=config.provider==='brevo';
 const body=brevo?{sender:{email:config.email,name:config.name},to:[{email:job.recipient_email,name:job.recipient_name||undefined}],subject:job.subject,htmlContent:content.html,textContent:content.text,tags:['ihlink',job.product],headers:{'X-IHLink-Message-ID':job.id}}:{from:`${config.name} <${config.email}>`,to:[job.recipient_email],subject:job.subject,...content};
 const response=await send(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:brevo?{'api-key':config.key,'content-type':'application/json'}:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'ihlink-'+job.queue+'-'+job.id},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 return {accepted:response.ok,id:response.ok?String(data.messageId||data.id||''):null,retry:response.status===429||response.status>=500,status:response.status};
}
