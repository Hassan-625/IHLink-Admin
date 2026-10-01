export type PlatformKey='corporate'|'datasub'|'schoolpro'|'consult'|'engineering'|'host'|'admin'|'business_centre'|'print'|'fabrication'|'compute'|'academy'|'digital_business';

const vercelOrigins:Partial<Record<PlatformKey,string>>={
 corporate:'https://ihlink-corporate.vercel.app',datasub:'https://ihlink-datasub.vercel.app',schoolpro:'https://ihlink-schoolpro.vercel.app',consult:'https://ihlink-consult.vercel.app',engineering:'https://ihlink-engineering.vercel.app',host:'https://ihlink-host.vercel.app',print:'https://ihlink-print.vercel.app',fabrication:'https://ihlink-fabrication.vercel.app',compute:'https://ihlink-compute.vercel.app',academy:'https://ihlink-academy.vercel.app',digital_business:'https://ihlink-digital-business.vercel.app',business_centre:'https://ihlink-digital-business.vercel.app',admin:'https://ihlink-admin.vercel.app',
};
const envOrigins:Partial<Record<PlatformKey,string|undefined>>={
 corporate:import.meta.env.VITE_CORPORATE_URL,datasub:import.meta.env.VITE_DATASUB_URL,schoolpro:import.meta.env.VITE_SCHOOLPRO_URL,consult:import.meta.env.VITE_CONSULT_URL,engineering:import.meta.env.VITE_ENGINEERING_URL,host:import.meta.env.VITE_HOST_URL,admin:import.meta.env.VITE_ADMIN_URL,business_centre:import.meta.env.VITE_BUSINESS_CENTRE_URL,print:import.meta.env.VITE_PRINT_URL,fabrication:import.meta.env.VITE_FABRICATION_URL,compute:import.meta.env.VITE_COMPUTE_URL,academy:import.meta.env.VITE_ACADEMY_URL,digital_business:import.meta.env.VITE_DIGITAL_BUSINESS_URL,
};
const prefixes:Record<PlatformKey,string>={corporate:'/',datasub:'/datasub',schoolpro:'/schoolpro',consult:'/consult',engineering:'/engineering',host:'/host',admin:'/admin',business_centre:'/business-centre',print:'/print',fabrication:'/fabrication',compute:'/compute',academy:'/academy',digital_business:'/business-centre/digital-services'};
const hostTokens:Partial<Record<PlatformKey,string>>={corporate:'ihlink-corporate',datasub:'ihlink-datasub',schoolpro:'ihlink-schoolpro',consult:'ihlink-consult',engineering:'ihlink-engineering',host:'ihlink-host',print:'ihlink-print',fabrication:'ihlink-fabrication',compute:'ihlink-compute',academy:'ihlink-academy',digital_business:'ihlink-digital-business',admin:'ihlink-admin'};

function platformFromHostname():PlatformKey|undefined{
 if(typeof window==='undefined')return undefined;
 const h=window.location.hostname.toLowerCase();
 for(const [key,token] of Object.entries(hostTokens) as [PlatformKey,string][])if(h===`${token}.vercel.app`||h.startsWith(`${token}-`)||h.includes(`.${token}.`)||h.includes(token))return key;
 return undefined;
}
export const deployedPlatform=(import.meta.env.VITE_APP_PLATFORM as PlatformKey|undefined)||platformFromHostname()||'corporate';

export function platformUrl(platform:PlatformKey,path?:string){
 const configured=envOrigins[platform]?.replace(/\/$/,'');
 const fallback=vercelOrigins[platform];
 const base=configured||fallback;
 const prefix=prefixes[platform],target=path||prefix;
 if(!base)return target;
 if(target===prefix||target===prefix+'/')return base;
 return base+(target.startsWith('/')?target:`/${target}`);
}
export function isExternalPlatformUrl(url:string){if(typeof window==='undefined')return false;try{return new URL(url,window.location.origin).origin!==window.location.origin}catch{return false}}
export function isIHLinkPlatformUrl(url:string){
 if(typeof window==='undefined')return false;
 try{
  const origin=new URL(url,window.location.origin).origin;
  return Object.values({...vercelOrigins,...envOrigins}).filter(Boolean).some(value=>new URL(value as string).origin===origin);
 }catch{return false}
}


export function platformExploreUrl(platform:PlatformKey){
 const paths:Partial<Record<PlatformKey,string>>={corporate:"/services",datasub:"/datasub",schoolpro:"/schoolpro",consult:"/consult",host:"/host",engineering:"/engineering",business_centre:"/business-centre",print:"/print",fabrication:"/fabrication",compute:"/compute",academy:"/academy",digital_business:"/business-centre/digital-services"};
 return platformUrl(platform,paths[platform]||"/");
}
export function platformRegistrationUrl(platform:PlatformKey){
 const service:Partial<Record<PlatformKey,string>>={datasub:"datasub",schoolpro:"school",consult:"consult",host:"host",engineering:"engineering",print:"print",fabrication:"fabrication",compute:"compute",academy:"academy",digital_business:"digital_business"};
 const target=platformUrl(platform,"/register");
 const url=new URL(target,typeof window!=="undefined"?window.location.origin:"https://ihlink-corporate.vercel.app");
 if(service[platform])url.searchParams.set("service",service[platform]!);
 return url.toString();
}
export function platformSignInUrl(platform:PlatformKey,destination:string){
 const target=platformUrl(platform,"/signin");
 const url=new URL(target,typeof window!=="undefined"?window.location.origin:"https://ihlink-corporate.vercel.app");
 if(destination.startsWith("/")&&!destination.startsWith("//"))url.searchParams.set("next",destination);
 return url.toString();
}
