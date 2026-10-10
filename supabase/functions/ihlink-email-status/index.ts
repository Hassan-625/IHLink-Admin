import {createClient} from 'jsr:@supabase/supabase-js@2';
import {emailConfig} from '../_shared/email.ts';
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,x-client-info,content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('authorization')||''}}});
 const {data:{user}}=await caller.auth.getUser();if(!user)return json({error:'Unauthorized'},401);
 const {data:profile}=await caller.from('profiles').select('status,role').eq('id',user.id).maybeSingle();
 const {data:access}=await caller.from('admin_product_access').select('can_manage').eq('user_id',user.id).eq('product','corporate').maybeSingle();
 if(profile?.status!=='active'||profile.role!=='super_admin'&&!access?.can_manage)return json({error:'Forbidden'},403);
 const config=emailConfig(n=>Deno.env.get(n));
 return json({backend_ready:true,provider_configured:!!config,provider:config?.provider||null,sender:config?.email||null,password_recovery_requires_auth_smtp:true});
});
