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
 const {data:profile}=await caller.from("profiles").select("status,role").eq("id",user.id).maybeSingle();if(profile?.status!=="active")return json({error:"Your account cannot send messages at this time."},403);
 const {school_id}=await req.json();if(!school_id)return json({error:"school_id required"},400);
 const admin=createClient(url,service);const [{data:school},{data:member}]=await Promise.all([admin.from("schoolpro_schools").select("owner_id").eq("id",school_id).maybeSingle(),admin.from("schoolpro_members").select("role").eq("school_id",school_id).eq("user_id",user.id).maybeSingle()]);
 const allowed=profile.role==="super_admin"||school?.owner_id===user.id||!!(member&&["proprietor","administrator","registrar","admissions_officer","it_admin"].includes(member.role));if(!allowed)return json({error:"Forbidden"},403);
 const {data:workerToken,error:tokenError}=await admin.rpc("ihlink_worker_token");if(tokenError||!workerToken)return json({error:"Email delivery is not available yet."},503);
 const response=await fetch(url+"/functions/v1/ihlink-email-worker",{method:"POST",headers:{Authorization:"Bearer "+workerToken,"Content-Type":"application/json"},body:JSON.stringify({school_id})});
 const result=await response.json().catch(()=>({message:"Email delivery is not available yet."}));return json(result,response.status);
 }catch(e){return json({error:"Email delivery could not be completed. Please try again."},500)}
});