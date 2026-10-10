import test from 'node:test';import assert from 'node:assert/strict';
import {emailConfig,emailContent,submitEmail} from '../supabase/functions/_shared/email.ts';
test('unconfigured or unverified sender preserves the delivery boundary',()=>{
 assert.equal(emailConfig(()=>undefined),null);
 assert.equal(emailConfig(n=>({RESEND_API_KEY:'test',SCHOOLPRO_FROM_EMAIL:'IHLink <onboarding@resend.dev>'}[n])),null);
 assert.equal(emailConfig(n=>({BREVO_API_KEY:'test',IHLINK_FROM_EMAIL:'support@school.example'}[n]))?.provider,'brevo');
});
test('email content escapes account and message fields and rejects unsafe links',()=>{
 const c=emailContent({product:'schoolpro',subject:'<script>alert(1)</script>',message:'<img src=x onerror=alert(1)>',recipient_name:'"<script>',action_url:'javascript:alert(1)'});
 assert.ok(!c.html.includes('<script>'));assert.ok(!c.html.includes('<img src=x'));assert.ok(!c.html.includes('javascript:'));assert.ok(c.html.includes('&lt;script&gt;'));
});
test('provider adapter submits the documented payload and records acceptance',async()=>{
 const job={id:'fixture',queue:'ihlink',product:'schoolpro',recipient_email:'test@example.invalid',subject:'Test',message:'Fixture only'};
 for(const provider of ['resend','brevo'] as const){
  let called=false;const mock=(async(url:any,options:any)=>{called=true;assert.equal(options.method,'POST');const b=JSON.parse(options.body);assert.equal(b.subject,'Test');assert.equal(provider==='brevo'?options.headers['api-key']:options.headers.Authorization,provider==='brevo'?'fixture-key':'Bearer fixture-key');return new Response(JSON.stringify(provider==='brevo'?{messageId:'accepted-fixture'}:{id:'accepted-fixture'}),{status:201});}) as typeof fetch;
  const r=await submitEmail({provider,key:'fixture-key',email:'support@ihlink.example',name:'IHLink'},job,mock);assert.ok(called);assert.ok(r.accepted);assert.equal(r.id,'accepted-fixture');
 }
});
