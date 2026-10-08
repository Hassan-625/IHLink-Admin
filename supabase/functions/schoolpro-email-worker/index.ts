import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
 const auth=req.headers.get("Authorization")||"",url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userError}=await caller.auth.getUser();if(userError||!user)return json({error:"Unauthorized"},401);
 const {school_id}=await req.json();if(!school_id)return json({error:"school_id required"},400);
 const admin=createClient(url,service);const [{data:school},{data:member}]=await Promise.all([admin.from("schoolpro_schools").select("owner_id").eq("id",school_id).maybeSingle(),admin.from("schoolpro_members").select("role").eq("school_id",school_id).eq("user_id",user.id).maybeSingle()]);
 const {data:profile}=await admin.from("profiles").select("status,role").eq("id",user.id).maybeSingle();const {data:access}=await admin.from("admin_product_access").select("can_approve").eq("user_id",user.id).eq("product","schoolpro").maybeSingle();const allowed=profile?.status==="active"&&(profile?.role==="super_admin"||access?.can_approve||school?.owner_id===user.id||!!(member&&["proprietor","administrator","registrar","admissions_officer","it_admin"].includes(member.role)));if(!allowed)return json({error:"Forbidden"},403);
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("SCHOOLPRO_FROM_EMAIL")||"IHLink SchoolPro <onboarding@resend.dev>";if(!key)return json({ok:false,configured:false,message:"RESEND_API_KEY not configured"},503);
 const {data:jobs,error}=await admin.from("schoolpro_email_queue").select("*").eq("school_id",school_id).eq("status","pending").order("created_at").limit(25);if(error)return json({error:error.message},500);
 let sent=0,failed=0;for(const j of jobs||[]){const html="<h2>"+String(j.subject||"School notification")+"</h2><p>Hello "+String(j.recipient_name||"Parent/Guardian")+",</p><p>"+String(j.payload?.message||j.subject||"You have a new SchoolPro notification.")+"</p>";const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"schoolpro-"+j.id},body:JSON.stringify({from,to:[j.recipient_email],subject:j.subject,html})});if(r.ok){const d=await r.json().catch(()=>({}));await admin.from("schoolpro_email_queue").update({status:"sent",sent_at:new Date().toISOString(),error:null,provider_message_id:d.id||null}).eq("id",j.id);sent++}else{const e=(await r.text()).slice(0,1000);await admin.from("schoolpro_email_queue").update({status:"failed",error:e}).eq("id",j.id);failed++}}
 return json({ok:true,configured:true,sent,failed,from});
 }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});