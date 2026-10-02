import {useEffect,useMemo,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ModulePage} from '@/components/ModulePage';
import {Card} from '@/components/ui/Card';
import {PrintStaffActions} from '@/components/PrintStaffActions';
import {adminSections} from './adminShared';
import {useAuth} from '@/context/AuthContext';
import {supabase} from '@/lib/supabase';
import {Button} from '@/components/ui/Button';

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
 const [products,setProducts]=useState<any[]>([]),[draft,setDraft]=useState({name:'',category:'',description:'',base_price:''}),[notice,setNotice]=useState('');
 const loadProducts=async()=>{if(!supabase)return;const r=await supabase.from('print_products').select('*').order('category').order('name');if(r.error)setNotice(r.error.message);else setProducts(r.data||[]);};
 useEffect(()=>{if(section==='catalogue')void loadProducts();},[section]);
 const saveProduct=async()=>{if(!supabase||!canEdit||!draft.name||!draft.category)return;const r=await supabase.from('print_products').insert({name:draft.name,category:draft.category,description:draft.description||null,base_price:Number(draft.base_price||0),active:true});setNotice(r.error?.message||'Product added.');if(!r.error){setDraft({name:'',category:'',description:'',base_price:''});await loadProducts();}};
 const updateProduct=async(id:string,values:any)=>{if(!supabase||!canEdit)return;const r=await supabase.from('print_products').update({...values,updated_at:new Date().toISOString()}).eq('id',id);setNotice(r.error?.message||'Product updated.');if(!r.error)await loadProducts();};
 return <ModulePage product="corporate" sections={adminSections} title={def.title} eyebrow="Print & Branding · Command Center" description={def.description} userName={[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||profile?.email||'Administrator'} userRole={role}>
  <div className="mb-4 flex flex-wrap gap-2"><Link to="/admin/print" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">← Print Control Centre</Link>{Object.entries(defs).map(([key,x])=><Link key={key} to={'/admin/print/workspace/'+key} className={'rounded-xl border px-3 py-2 text-xs font-semibold '+(key===section?'bg-pink-700 text-white':'bg-white')}>{x.title}</Link>)}</div>
  <Card padding="lg"><h2 className="font-bold">{def.title}</h2><p className="mt-1 text-sm text-muted">This is a native Super Admin workspace. It does not hand off to the standalone Print customer dashboard.</p></Card>
  {section==='catalogue'?<div className="mt-5 space-y-5">{notice&&<p className="rounded-xl border bg-white p-3 text-sm">{notice}</p>}<Card padding="lg"><h3 className="font-bold">Add Print product / service</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><input className="rounded-xl border p-3" placeholder="Product name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><input className="rounded-xl border p-3" placeholder="Category" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/><input className="rounded-xl border p-3" type="number" min="0" placeholder="Base price" value={draft.base_price} onChange={e=>setDraft({...draft,base_price:e.target.value})}/><input className="rounded-xl border p-3" placeholder="Description" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/><Button disabled={!canEdit} onClick={()=>void saveProduct()}>Add product</Button></div></Card><Card padding="none" className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Product</th><th>Category</th><th>Base price</th><th>Status</th><th>Action</th></tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-t"><td className="p-3"><b>{p.name}</b><p className="text-xs text-muted">{p.description||'—'}</p></td><td className="text-center">{p.category}</td><td className="text-center">₦{Number(p.base_price||0).toLocaleString()}</td><td className="text-center">{p.active?'Active':'Hidden'}</td><td className="p-3 text-center"><Button size="sm" variant="secondary" disabled={!canEdit} onClick={()=>void updateProduct(p.id,{active:!p.active})}>{p.active?'Hide':'Publish'}</Button></td></tr>)}</tbody></table></div></Card></div>:<PrintStaffActions canEdit={!!canEdit} userId={user?.id||''} mode={def.mode||'operations'}/>} 
 </ModulePage>
}