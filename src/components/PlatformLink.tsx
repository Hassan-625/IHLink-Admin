import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { deployedPlatform, platformUrl, type PlatformKey } from '@/lib/platformUrls';
const routes: readonly [string, PlatformKey][] = [
 ['/business-centre/digital-services','digital_business'], ['/business-centre','business_centre'],
 ['/datasub','datasub'], ['/schoolpro','schoolpro'], ['/consult','consult'], ['/engineering','engineering'],
 ['/host','host'], ['/print','print'], ['/fabrication','fabrication'], ['/compute','compute'], ['/academy','academy'], ['/admin','admin'],
];
export function PlatformLink({to,...props}: Omit<ComponentProps<typeof Link>,'to'> & {to:string}) {
 if(!to.startsWith('/')||to.startsWith('//'))return <a href={to} {...props}/>;
 const pathname=to.split(/[?#]/)[0];
 if(['/signin','/register','/verify-email','/reset-password','/account','/onboarding','/auth'].some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/')))return <Link to={to} {...props}/>;
 const route=routes.find(([prefix])=>pathname===prefix||pathname.startsWith(prefix+'/'));
 const targetPlatform=route?.[1]||'corporate';
 if(targetPlatform===deployedPlatform)return <Link to={to} {...props}/>;
 let target=platformUrl(targetPlatform,to);
 if(targetPlatform==='business_centre'&&target.startsWith('/'))target='https://ihlink-business-centre.onrender.com'+to.replace(/^\/business-centre(?=\/|$)/,'');
 return <a href={target} {...props}/>;
}
