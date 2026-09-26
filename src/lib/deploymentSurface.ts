export type DeploymentSurface='all'|'corporate'|'datasub'|'schoolpro'|'consult'|'engineering'|'host'|'admin';
const surface=(import.meta.env.VITE_APP_SURFACE||'all').toLowerCase() as DeploymentSurface;
const prefixes:Record<Exclude<DeploymentSurface,'all'>,string>={corporate:'/',datasub:'/datasub',schoolpro:'/schoolpro',consult:'/consult',engineering:'/engineering',host:'/host',admin:'/admin'};
export function deploymentSurface(){return surface;}
export function enforceDeploymentSurface(){
 if(surface==='all'||typeof window==='undefined') return;
 const path=window.location.pathname;
 const shared=['/signin','/register','/verify-email','/reset-password','/account','/onboarding'];
 if(shared.some(x=>path===x||path.startsWith(x+'/'))) return;
 const prefix=prefixes[surface];
 if(surface==='admin'){
   if(!(path==='/admin/login'||path==='/admin/verify'||path==='/signin'||path==='/reset-password'||path==='/verify-email'||path==='/admin'||path.startsWith('/admin/'))) window.location.replace('/admin');
   return;
 }
 if(surface==='corporate'){
   const foreign=['/datasub','/schoolpro','/consult','/engineering','/host','/admin'];
   if(foreign.some(x=>path===x||path.startsWith(x+'/'))) window.location.replace('/');
   return;
 }
 if(!(path===prefix||path.startsWith(prefix+'/'))) window.location.replace(prefix);
}
