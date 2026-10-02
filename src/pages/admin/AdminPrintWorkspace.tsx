import {useMemo} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ModulePage} from '@/components/ModulePage';
import {Card} from '@/components/ui/Card';
import {PrintStaffActions} from '@/components/PrintStaffActions';
import {adminSections} from './adminShared';
import {useAuth} from '@/context/AuthContext';

const defs:Record<string,{title:string;description:string;mode?:'operations'|'artwork'|'inventory'|'qc'|'delivery'}>={
 pricing:{title:'Print Pricing Management',description:'Administer quotation pricing and approved commercial values inside Command Center.',mode:'operations'},
 artwork:{title:'Design & Artwork',description:'Manage artwork proof issuance and production artwork workflows.',mode:'artwork'},
 inventory:{title:'Inventory & Procurement',description:'Record stock receipts, usage and inventory corrections.',mode:'inventory'},
 qc:{title:'Quality Control',description:'Record production inspection outcomes and rework requirements.',mode:'qc'},
 delivery:{title:'Delivery & Collection',description:'Dispatch jobs and confirm customer collection or delivery.',mode:'delivery'},
 finance:{title:'Payments & Finance',description:'Administer quotation, invoicing and paid-production workflows.',mode:'operations'},
 production:{title:'Production Jobs',description:'Advance verified paid jobs through prepress, production, finishing and QC.',mode:'operations'},
 catalogue:{title:'Product Catalogue',description:'Administer Print product and service catalogue records from Command Center.'}
};
export function AdminPrintWorkspace(){
 const {section='production'}=useParams();const def=defs[section]||defs.production;const {user,profile,adminAccess}=useAuth();
 const canEdit=profile?.status==='active'&&(profile.role==='super_admin'||adminAccess.some(x=>x.product==='print'&&x.can_view&&(x.can_edit||x.can_manage)));
 const role=useMemo(()=>profile?.role?.replaceAll('_',' ')||'Print administration',[profile?.role]);
 return <ModulePage product="corporate" sections={adminSections} title={def.title} eyebrow="Print & Branding · Command Center" description={def.description} userName={[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||profile?.email||'Administrator'} userRole={role}>
  <div className="mb-4 flex flex-wrap gap-2"><Link to="/admin/print" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">← Print Control Centre</Link>{Object.entries(defs).map(([key,x])=><Link key={key} to={'/admin/print/workspace/'+key} className={'rounded-xl border px-3 py-2 text-xs font-semibold '+(key===section?'bg-pink-700 text-white':'bg-white')}>{x.title}</Link>)}</div>
  <Card padding="lg"><h2 className="font-bold">{def.title}</h2><p className="mt-1 text-sm text-muted">This is a native Super Admin workspace. It does not hand off to the standalone Print customer dashboard.</p></Card>
  {section==='catalogue'?<Card className="mt-5" padding="lg"><p className="text-sm text-muted">Catalogue management is retained inside Command Center. Product/service editing will use the production catalogue tables rather than redirecting to the customer application.</p></Card>:<PrintStaffActions canEdit={!!canEdit} userId={user?.id||''} mode={def.mode||'operations'}/>}
 </ModulePage>
}