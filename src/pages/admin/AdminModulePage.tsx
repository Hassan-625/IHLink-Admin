import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, RefreshCw } from 'lucide-react';
import { ModulePage } from '@/components/ModulePage';
import { Card } from '@/components/ui/Card';
import { adminSections } from './adminShared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type MetricDef={label:string;table:string;filter?:[string,string|boolean];href?:string};
type ModuleDef={title:string;desc:string;action:string;metrics:MetricDef[];links:{label:string;href:string;description:string}[]};

const defs:Record<string,ModuleDef>={
 products:{title:'Products & Services',desc:'Live overview of IHLink service catalogues and operational products.',action:'Review Platforms',metrics:[
  {label:'DataSub Products',table:'datasub_products',filter:['is_active',true],href:'/admin/datasub'},
  {label:'Hosting Plans',table:'host_plans',filter:['is_active',true],href:'/admin/host'},
  {label:'Schools',table:'schoolpro_schools',href:'/admin/schoolpro'},
  {label:'Service Access',table:'customer_service_access',href:'/admin/customers'},{label:'Business Services',table:'business_catalog',filter:['is_active',true],href:'/admin/business-centre'},{label:'Business Orders',table:'business_orders',href:'/admin/business-centre'},{label:'Academy Courses',table:'academy_courses',filter:['is_active',true],href:'/admin/academy'}],
  links:[{label:'DataSub Control',href:'/admin/datasub',description:'Products, pricing, providers and reseller operations.'},{label:'SchoolPro Control',href:'/admin/schoolpro',description:'Schools, academics, results and access.'},{label:'Hosting Control',href:'/admin/host',description:'Hosting plans, domains, orders and services.'},{label:'Consult Control',href:'/admin/consult',description:'Requests, quotations and consulting projects.'},{label:'Engineering Control',href:'/admin/engineering',description:'Engineering requests, projects and field operations.'},{label:'Business & Innovation',href:'/admin/business-centre',description:'Business Centre operations and fulfilment.'},{label:'Print & Branding',href:'/admin/print',description:'Print and branding orders.'},{label:'3D & Fabrication',href:'/admin/fabrication',description:'Fabrication and prototype jobs.'},{label:'AI & Compute',href:'/admin/compute',description:'AI and compute workloads.'},{label:'Academy',href:'/admin/academy',description:'Courses, enrolments and learning operations.'},{label:'Digital Business Centre',href:'/admin/digital-business',description:'Digital business service requests.'}]},
 datasub:{title:'DataSub Administration',desc:'Live DataSub catalogue, transactions, wallets, resellers and provider operations.',action:'Manage DataSub',metrics:[
  {label:'Active Products',table:'datasub_products',filter:['is_active',true]},{label:'Transactions',table:'datasub_transactions'},{label:'Wallets',table:'datasub_wallets'},{label:'Resellers',table:'datasub_reseller_accounts'}],
  links:[{label:'Products & Pricing',href:'/admin/datasub',description:'Review the customer-facing live product catalogue.'},{label:'Developer API',href:'/admin/datasub',description:'Review API products and developer access.'},{label:'DataSub Dashboard',href:'/admin/datasub',description:'Open the operational DataSub dashboard.'}]},
 schoolpro:{title:'SchoolPro Control Centre',desc:'IHLink-wide live control surface for schools, subscriptions, students, admissions, academics, CBT, results, finance, managed websites and document-template operations.',action:'Manage SchoolPro',metrics:[
  {label:'Schools',table:'schoolpro_schools'},{label:'Subscriptions',table:'schoolpro_subscriptions'},{label:'Students',table:'schoolpro_students'},{label:'Staff & Members',table:'schoolpro_members'},{label:'Admissions',table:'schoolpro_admissions'},{label:'Results',table:'schoolpro_results'},{label:'CBT Tests',table:'schoolpro_cbt_tests'},{label:'Invoices',table:'schoolpro_invoices'},{label:'Document Templates',table:'schoolpro_document_templates'},{label:'Issued Documents',table:'schoolpro_document_issues'},{label:'Custom Web Requests',table:'schoolpro_custom_requests'},{label:'Email Queue',table:'schoolpro_email_queue'},{label:'Library Books',table:'schoolpro_library_books'},{label:'Transport Routes',table:'schoolpro_transport_routes'},{label:'Hostel Rooms',table:'schoolpro_hostel_rooms'},{label:'Inventory Assets',table:'schoolpro_inventory_assets'},{label:'Payroll Records',table:'schoolpro_payroll_records'}],
  links:[
{label:'School Administration',href:'/admin/schoolpro/workspace/overview',description:'Open the selected school administration dashboard.'},
{label:'Students & Enrollment',href:'/admin/schoolpro/workspace/students',description:'Open enrolled students and school records.'},
{label:'Admissions',href:'/admin/schoolpro/workspace/admissions',description:'Applications, verification, offers and enrollment.'},
{label:'Admissions Workspace',href:'/admin/schoolpro/workspace/admissions',description:'Open the dedicated admissions operations workspace.'},
{label:'Results & Assessment',href:'/admin/schoolpro/workspace/results',description:'Scores, approvals and result workflows.'},
{label:'Result Templates',href:'/admin/schoolpro/workspace/result-templates',description:'Open the dedicated report-card template designer and mappings.'},
{label:'Broadsheets',href:'/admin/schoolpro/workspace/reports',description:'Open positions, publication and broadsheet reporting.'},
{label:'Advanced Reports',href:'/admin/schoolpro/workspace/reports',description:'Open the dedicated academic reports page.'},
{label:'Report Card',href:'/admin/schoolpro/workspace/results',description:'Open the individual report-card page.'},
{label:'Class Results Print',href:'/admin/schoolpro/workspace/results',description:'Open bulk class result printing.'},
{label:'CBT Management',href:'/admin/schoolpro/workspace/cbt',description:'Create tests, control eligibility, review attempts and theory marking.'},
{label:'Question Bank',href:'/admin/schoolpro/workspace/question-bank',description:'Create and maintain CBT questions.'},
{label:'Student CBT',href:'/admin/schoolpro/workspace/cbt',description:'Open the student CBT workspace.'},
{label:'Fees & Finance',href:'/admin/schoolpro/workspace/finance',description:'Fee structures, invoices, receipts and debt controls.'},
{label:'Invoice Designer',href:'/admin/schoolpro/workspace/finance',description:'Open the dedicated SchoolPro invoice template designer.'},
{label:'Payments',href:'/admin/schoolpro/workspace/finance',description:'Open SchoolPro payment records and workflows.'},
{label:'Subscription',href:'/admin/subscriptions',description:'Open the school subscription workspace.'},
{label:'Document & Certificate Studio',href:'/admin/schoolpro/workspace/documents',description:'PDF/DOCX certificates, admission letters, transcripts, IDs and custom documents.'},
{label:'Branding & School Portal',href:'/admin/schoolpro/workspace/branding',description:'School identity, portal branding and managed website configuration.'},
{label:'Classes',href:'/admin/schoolpro/workspace/academics',description:'Open classes, arms and academic structure.'},
{label:'Subjects',href:'/admin/schoolpro/workspace/academics',description:'Open subjects and curriculum structure.'},
{label:'Staff',href:'/admin/schoolpro/workspace/staff',description:'Open staff and school memberships.'},
{label:'Parents & Guardians',href:'/admin/schoolpro/workspace/guardians',description:'Guardian records, student links and parent access.'},
{label:'Attendance',href:'/admin/schoolpro/workspace/attendance',description:'Open daily attendance.'},
{label:'Timetable',href:'/admin/schoolpro/workspace/attendance',description:'Open the timetable workspace.'},
{label:'Assignments',href:'/admin/schoolpro/workspace/learning',description:'Open learning assignments.'},
{label:'Announcements',href:'/admin/schoolpro/workspace/learning',description:'Open school announcements.'},
{label:'Library',href:'/admin/schoolpro/workspace/library',description:'Open library operations.'},
{label:'Transport',href:'/admin/schoolpro/workspace/transport',description:'Open transport operations.'},
{label:'Hostel',href:'/admin/schoolpro/workspace/hostel',description:'Open hostel operations.'},
{label:'Inventory',href:'/admin/schoolpro/workspace/inventory',description:'Open inventory and asset operations.'},
{label:'Payroll',href:'/admin/schoolpro/workspace/payroll',description:'Open payroll operations.'},
{label:'Discipline',href:'/admin/schoolpro/workspace/discipline',description:'Open discipline records.'},
{label:'Medical',href:'/admin/schoolpro/workspace/medical',description:'Open clinic and medical records.'},
{label:'Calendar',href:'/admin/schoolpro/workspace/calendar',description:'Open school calendar operations.'},
{label:'Lesson Notes',href:'/admin/schoolpro/workspace/lesson-notes',description:'Open lesson-note workflows.'},
{label:'Leave',href:'/admin/schoolpro/workspace/leave',description:'Open staff leave workflows.'},
{label:'Promotions',href:'/admin/schoolpro/workspace/promotions',description:'Open student promotion workflows.'},
{label:'Operations Overview',href:'/admin/schoolpro/workspace/operations',description:'Open the consolidated school operations overview.'},
{label:'Roles',href:'/admin/schoolpro/workspace/permissions',description:'Open school role management.'},
{label:'User Permissions',href:'/admin/schoolpro/workspace/permissions',description:'Open granular SchoolPro permission management.'},
{label:'Notifications',href:'/admin/schoolpro/workspace/notifications',description:'Open SchoolPro notifications.'},
{label:'Custom Website Requests',href:'/admin/schoolpro/custom-requests',description:'IHLink quotation, approval and provisioning queue.'}
]},
 consult:{title:'Consult Administration',desc:'Live consulting requests, quotations, projects and client operations.',action:'Manage Consult',metrics:[
  {label:'Requests',table:'consult_requests'},{label:'Quotations',table:'consult_quotations'},{label:'Projects',table:'consult_projects'},{label:'Payments',table:'consult_payments'}],
  links:[{label:'Consult Portal',href:'/admin/consult',description:'Open the live client and project workspace.'},{label:'Consult Operations',href:'/admin/consult',description:'Open the dedicated consulting operations workspace.'},{label:'Payments',href:'/admin/consult',description:'Open Consult payment operations.'}]},
 engineering:{title:'Engineering Administration',desc:'Live engineering requests, projects, equipment and support operations.',action:'Manage Engineering',metrics:[
  {label:'Requests',table:'engineering_requests'},{label:'Projects',table:'engineering_projects'},{label:'Equipment',table:'engineering_equipment'},{label:'Support Tickets',table:'engineering_support_tickets'}],
  links:[{label:'Engineering Dashboard',href:'/admin/engineering',description:'Open the engineering client workspace.'},{label:'Projects',href:'/admin/engineering',description:'Open the dedicated engineering project workspace.'},{label:'Operations',href:'/admin/engineering',description:'Open engineering operations.'},{label:'Documents',href:'/admin/engineering',description:'Open project documents and proofs.'},{label:'Billing & Payments',href:'/admin/engineering',description:'Open the dedicated engineering payments page.'},{label:'Management',href:'/admin/engineering',description:'Open the engineering management desk.'}]},
 host:{title:'Hosting Administration',desc:'Live hosting plans, orders, services and support operations.',action:'Manage Hosting',metrics:[
  {label:'Plans',table:'host_plans'},{label:'Orders',table:'host_orders'},{label:'Services',table:'host_services'},{label:'Support Tickets',table:'host_support_tickets'}],
  links:[{label:'Hosting Dashboard',href:'/admin/host',description:'Open hosting customer and service operations.'},{label:'Service Operations',href:'/admin/host',description:'Open the dedicated hosting operations workspace.'},{label:'Hosting Plans',href:'/admin/host',description:'Review live hosting plans.'},{label:'Domain Search & Pricing',href:'/admin/host',description:'Review configured domain pricing and search.'},{label:'Payments',href:'/admin/host',description:'Open hosting payment operations.'},{label:'Settings',href:'/admin/host',description:'Open hosting account and service settings.'}]},
 integrations:{title:'Integrations',desc:'Live visibility into provider connections, payment intents and notification delivery infrastructure.',action:'Review Integrations',metrics:[
  {label:'Provider Connections',table:'datasub_provider_connections'},{label:'Provider Events',table:'datasub_provider_events'},{label:'DataSub Payments',table:'payment_transactions',filter:['platform','datasub']},{label:'SchoolPro Payments',table:'schoolpro_payment_intents'}],
  links:[{label:'DataSub Providers',href:'/admin/datasub',description:'Review provider-backed DataSub operations.'},{label:'Notifications',href:'/admin/notifications',description:'Review templates, campaigns and deliveries.'},{label:'Security Centre',href:'/admin/security',description:'Review production security controls.'}]},
 finance:{title:'Finance',desc:'Live finance ledger, refund and platform payment activity.',action:'Review Finance',metrics:[
  {label:'Ledger Entries',table:'finance_ledger_entries'},{label:'Refund Requests',table:'finance_refund_requests'},{label:'School Fee Payments',table:'schoolpro_fee_payments'},{label:'Reseller Commissions',table:'datasub_reseller_commissions'}],
  links:[{label:'DataSub Transactions',href:'/admin/datasub',description:'Review DataSub financial operations.'},{label:'SchoolPro',href:'/admin/schoolpro',description:'Review SchoolPro finance operations.'}]},
 settings:{title:'System Settings',desc:'Production configuration and governance entry points for the IHLink platform.',action:'Review Settings',metrics:[
  {label:'Administrators',table:'admin_product_access'},{label:'Security Controls',table:'security_controls'},{label:'Readiness Checks',table:'launch_readiness_checks'},{label:'Content Blocks',table:'site_content_blocks'}],
  links:[{label:'Roles & Permissions',href:'/admin/roles',description:'Manage administrative access boundaries.'},{label:'Security Centre',href:'/admin/security',description:'Review security controls and incidents.'},{label:'Launch Readiness',href:'/admin/readiness',description:'Review production readiness checks.'},{label:'Website Builder',href:'/admin/content',description:'Manage database-backed website content.'}]}
};

export function AdminModulePage({module}:{module:string}){
 const {profile}=useAuth();
 const d=defs[module]||{title:module.replaceAll('-',' ').replace(/\b\w/g,x=>x.toUpperCase()),desc:'Production-backed administrative workspace.',action:'Production Control',metrics:[],links:[]};
 const [counts,setCounts]=useState<Record<string,number|null>>({}),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const userName=profile?[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.email:'Administrator';
 const load=async()=>{const client=supabase;if(!client){setError('Supabase is not configured.');setLoading(false);return;}setLoading(true);setError(null);
  const results=await Promise.all(d.metrics.map(async metric=>{let query=client.from(metric.table).select('*',{count:'exact',head:true});if(metric.filter)query=query.eq(metric.filter[0],metric.filter[1]);const {count,error}=await query;return{label:metric.label,count,error};}));
  const next:Record<string,number|null>={};for(const result of results){next[result.label]=result.error?null:result.count??0;if(result.error)setError(current=>current||result.error!.message);}setCounts(next);setLoading(false);};
 useEffect(()=>{void load();},[module]);
 const metrics=useMemo(()=>d.metrics.map(metric=>({label:metric.label,value:loading?'…':counts[metric.label]==null?'Unavailable':String(counts[metric.label]),change:undefined})),[d,counts,loading]);
 return <ModulePage product="corporate" sections={adminSections} title={d.title} eyebrow="Central Administration" description={d.desc} userName={userName} userRole={profile?.role?.replaceAll('_',' ')||'Authorized Administration'} primaryAction={d.action} metrics={metrics}>
  {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Some live data could not be loaded: {error}</div>}
  <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
   <Card padding="lg"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Database className="h-5 w-5 text-royal-600"/><h3 className="font-bold">Live production workspace</h3></div><p className="mt-2 text-sm text-muted">The figures above are queried from the production database. Zero means there is currently no matching production record; demonstration records are never substituted.</p></div><button onClick={()=>void load()} className="rounded-lg border p-2 text-muted hover:bg-gray-50" aria-label="Refresh live data"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{d.links.map(link=><Link key={link.label+link.href} to={link.href} className="group rounded-xl border border-border p-4 transition hover:border-royal-200 hover:bg-royal-50/40"><div className="flex items-center justify-between gap-2"><span className="font-bold text-ink">{link.label}</span><ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5"/></div><p className="mt-1 text-xs leading-5 text-muted">{link.description}</p></Link>)}</div>
   </Card>
   <Card padding="lg"><h3 className="font-bold">Data policy</h3><p className="mt-2 text-sm leading-6 text-muted">This control surface only displays live database-backed counts and routes to genuine operational pages. Customer, transaction, revenue, staff, incident and provider information is not fabricated when records do not exist.</p><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">Production data mode active</div></Card>
  </div>
 </ModulePage>;
}
