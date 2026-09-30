import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2';
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version','access-control-allow-methods':'POST,OPTIONS'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'method_not_allowed'},405);
 const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!jwt)return respond({error:'authentication_required'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(jwt);if(authError||!user)return respond({error:'authentication_required'},401);
 const body=await req.json().catch(()=>null);if(!body||typeof body.invoice_id!=='string')return respond({error:'invalid_invoice'},400);
 const {data:invoice,error}=await db.from('business_invoices').select('id,order_id,invoice_number,amount,amount_paid,status,currency,business_orders!inner(user_id,unit_code)').eq('id',body.invoice_id).eq('business_orders.user_id',user.id).maybeSingle();
 if(error||!invoice)return respond({error:'invoice_not_found'},404);
 const order=Array.isArray(invoice.business_orders)?invoice.business_orders[0]:invoice.business_orders;
 if(!order||!['fabrication','compute','academy','digital_business'].includes(order.unit_code)||!['issued','awaiting_payment'].includes(invoice.status)||invoice.currency!=='NGN')return respond({error:'invoice_unavailable'},409);
 const [profile,access]=await Promise.all([db.from('profiles').select('status').eq('id',user.id).maybeSingle(),db.from('customer_service_access').select('status').eq('user_id',user.id).eq('product',order.unit_code).maybeSingle()]);
 if(profile.data?.status!=='active'||access.data?.status!=='active')return respond({error:'active_platform_access_required'},403);
 let {data:account,error:accountError}=await db.from('virtual_accounts').select('id,bank_name,account_name,account_number').eq('user_id',user.id).eq('provider','billstack').eq('platform_code',order.unit_code).eq('status','active').order('created_at',{ascending:true}).limit(1).maybeSingle();
 if(accountError)return respond({error:'payment_account_unavailable'},503);
 if(!account){const response=await fetch(Deno.env.get('SUPABASE_URL')!+'/functions/v1/billstack-payment',{method:'POST',headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},body:JSON.stringify({action:'create',platform_code:order.unit_code,bank:'9PSB'})});const result=await response.json().catch(()=>null);if(!response.ok||!result?.data?.id)return respond({error:'account_activation_failed',message:result?.message||result?.error||'Payment account could not be activated.'},502);account=result.data;}
 const intent=await db.rpc('create_business_payment_intent',{p_user:user.id,p_invoice:invoice.id,p_virtual_account:account!.id});
 if(intent.error)return respond({error:'payment_instruction_unavailable',message:intent.error.message},409);
 return respond({data:{invoice_number:invoice.invoice_number,intent:intent.data,bank:{bank_name:account!.bank_name,account_name:account!.account_name,account_number:account!.account_number},instruction:'Transfer the exact invoice amount. Payment is confirmed only after verified BillStack reconciliation.'}},201);
});
