import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return out({ok:true});if(req.method!=="POST")return out({error:"Method unavailable"},405);
 try{
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,authorization=req.headers.get("Authorization")||"";
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}}),db=createClient(url,secret,{auth:{persistSession:false}});
 const {data:{user}}=await caller.auth.getUser();if(!user)return out({error:"Sign in required"},401);
 const {school_id}=await req.json();if(typeof school_id!=="string"||!/^[0-9a-f-]{36}$/i.test(school_id))return out({error:"School required"},400);
 const [{data:profile},{data:school},{data:access}]=await Promise.all([db.from("profiles").select("status,role").eq("id",user.id).maybeSingle(),db.from("schoolpro_schools").select("owner_id").eq("id",school_id).maybeSingle(),db.from("admin_product_access").select("can_approve").eq("user_id",user.id).eq("product","schoolpro").maybeSingle()]);
 if(profile?.status!=="active"||!school||!(school.owner_id===user.id||profile.role==="super_admin"||access?.can_approve))return out({error:"School owner access required"},403);
 const {data:recent}=await db.from("audit_logs").select("id").eq("actor_id",user.id).eq("action","schoolpro_owner_access_requested").eq("target_id",school_id).gte("created_at",new Date(Date.now()-120000).toISOString()).limit(1);
 if(recent?.length)return out({error:"Please wait two minutes before resending"},429);
 const {data:{user:owner}}=await db.auth.admin.getUserById(school.owner_id);if(!owner?.email||!owner.email_confirmed_at)return out({error:"Owner email verification required"},409);
 const {error:record}=await db.from("audit_logs").insert({actor_id:user.id,action:"schoolpro_owner_access_requested",product:"schoolpro",target_type:"schoolpro_school",target_id:school_id,metadata:{recipient_user_id:school.owner_id}});if(record)return out({error:"Email request could not be saved"},503);
 const recovery=createClient(url,anon,{auth:{persistSession:false}});
 const {error:emailError}=await recovery.auth.resetPasswordForEmail(owner.email,{redirectTo:"https://ihlink-schoolpro.onrender.com/auth/update-password"});
 const response=await fetch(url+"/functions/v1/schoolpro-email-worker",{method:"POST",headers:{Authorization:authorization,apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({school_id}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 const result=response?await response.json().catch(()=>({})):null;
 return out({password_email_requested:!emailError,invoice_emails_sent:result?.sent||0,invoice_email_pending:!response?.ok||!!result?.failed,email_delivery_verified:false});
 }catch{return out({error:"Owner access email could not be requested. Please try again."},503);}
});