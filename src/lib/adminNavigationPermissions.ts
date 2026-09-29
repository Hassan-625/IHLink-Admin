import type {AdminProductAccess,UserProfile,ProductKey} from '@/context/AuthContext';
const products:Record<string,ProductKey>={datasub:'datasub',schoolpro:'schoolpro',schools:'schoolpro',consult:'consult',host:'host',engineering:'engineering','business-centre':'business_centre',print:'print',fabrication:'fabrication',compute:'compute',academy:'academy','digital-business':'digital_business'};
export function canOpenAdminPath(path:string,profile:UserProfile|null,grants:AdminProductAccess[]){
 if(profile?.status!=='active')return false;
 if(profile.role==='super_admin')return true;
 if(!['platform_admin','support','finance'].includes(profile.role))return false;
 if(!path.startsWith('/admin'))return true;
 const module=path.split('/')[2]||'';
 if(!module||module==='notifications')return true;
 if(['finance','payments','subscriptions'].includes(module))return profile.role==='finance';
 if(module==='support')return profile.role==='support';
 const product=products[module];if(!product)return false;
 const grant=grants.find(item=>item.product===product);
 if(['business-centre','fabrication','compute','academy','digital-business'].includes(module))return Boolean(grant?.can_edit);
 return Boolean(grant?.can_view);
}
