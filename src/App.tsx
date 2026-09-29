import {useAuth} from '@/context/AuthContext';
import {canOpenAdminPath} from '@/lib/adminNavigationPermissions';
import {AuthHandoffPage} from '@/pages/auth/AuthHandoffPage';
import {AdminPrintPage} from '@/pages/admin/AdminPrintPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminModulePage } from '@/pages/admin/AdminModulePage';
import { AdminContentManager } from '@/pages/admin/AdminContentManager';
import { AdminDataSubPage } from '@/pages/admin/AdminDataSubPage';
import { AdminDataSubProviderPricing } from '@/pages/admin/AdminDataSubProviderPricing';
import { AdminConsultPage } from '@/pages/admin/AdminConsultPage';
import { AdminEngineeringPage } from '@/pages/admin/AdminEngineeringPage';
import { AdminHostPage } from '@/pages/admin/AdminHostPage';
import { AdminBusinessPage } from '@/pages/admin/AdminBusinessPage';
import { AdminFinancePage } from '@/pages/admin/AdminFinancePage';
import { AdminSupportPage } from '@/pages/admin/AdminSupportPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { AdminSecurityPage } from '@/pages/admin/AdminSecurityPage';
import { AdminReadinessPage } from '@/pages/admin/AdminReadinessPage';
import { AdminIntegrationsPage } from '@/pages/admin/AdminIntegrationsPage';
import { AdminSchoolProCustomRequests } from '@/pages/admin/AdminSchoolProCustomRequests';
import { AdminStatePage } from '@/pages/admin/AdminStatePage';
import type { ProductKey } from '@/context/AuthContext';

const adminRoles = ['super_admin', 'platform_admin', 'support', 'finance'] as const;
function Guard({children,product,superOnly=false,permission="view"}:{children:ReactNode;product?:ProductKey;superOnly?:boolean;permission?:"view"|"edit"}) {
  const {profile,adminAccess,loading}=useAuth();const {pathname}=useLocation();
  if(!loading&&profile&&!canOpenAdminPath(pathname,profile,adminAccess))return <Navigate to="/admin/access-denied" replace/>;
  return <ProtectedRoute roles={superOnly?['super_admin']:[...adminRoles]} product={product} permission={permission}>{children}</ProtectedRoute>;
}
const module = (name:string) => <Guard><AdminModulePage module={name}/></Guard>;
export default function App(){return <Routes><Route path="/auth/handoff" element={<AuthHandoffPage/>}/>
  <Route path="/" element={<Navigate to="/admin" replace/>}/>
  <Route path="/signin" element={<AdminLogin/>}/>
  <Route path="/admin/login" element={<AdminLogin/>}/>
  <Route path="/admin" element={<Guard><AdminDashboard/></Guard>}/>
  <Route path="/admin/content" element={<Guard superOnly><AdminContentManager/></Guard>}/>
  <Route path="/admin/datasub" element={<Guard product="datasub"><AdminDataSubPage/></Guard>}/>
  <Route path="/admin/datasub/provider-pricing" element={<Guard product="datasub"><AdminDataSubProviderPricing/></Guard>}/>
  <Route path="/admin/schoolpro" element={module('schoolpro')}/>
  <Route path="/admin/schoolpro/custom-requests" element={<Guard superOnly><AdminSchoolProCustomRequests/></Guard>}/>
  <Route path="/admin/consult" element={<Guard product="consult"><AdminConsultPage/></Guard>}/>
  <Route path="/admin/engineering" element={<Guard product="engineering"><AdminEngineeringPage/></Guard>}/>
  <Route path="/admin/host" element={<Guard product="host"><AdminHostPage/></Guard>}/>
  <Route path="/admin/business-centre" element={<Guard product="business_centre" permission="edit"><AdminBusinessPage unit="business_centre"/></Guard>}/>
  <Route path="/admin/print" element={<Guard product="print"><AdminPrintPage/></Guard>}/>
  <Route path="/admin/fabrication" element={<Guard product="fabrication" permission="edit"><AdminBusinessPage unit="fabrication"/></Guard>}/>
  <Route path="/admin/compute" element={<Guard product="compute" permission="edit"><AdminBusinessPage unit="compute"/></Guard>}/>
  <Route path="/admin/academy" element={<Guard product="academy" permission="edit"><AdminBusinessPage unit="academy"/></Guard>}/>
  <Route path="/admin/digital-business" element={<Guard product="digital_business" permission="edit"><AdminBusinessPage unit="digital_business"/></Guard>}/>
  <Route path="/admin/finance" element={<Guard><AdminFinancePage/></Guard>}/>
  <Route path="/admin/support" element={<Guard><AdminSupportPage/></Guard>}/>
  <Route path="/admin/notifications" element={<Guard><AdminNotificationsPage/></Guard>}/>
  <Route path="/admin/security" element={<Guard superOnly><AdminSecurityPage/></Guard>}/>
  <Route path="/admin/readiness" element={<Guard superOnly><AdminReadinessPage/></Guard>}/>
  <Route path="/admin/integrations" element={<Guard superOnly><AdminIntegrationsPage/></Guard>}/>
  {['products','pricing','customers','administrators','roles','audit-logs','settings','subscriptions','leads','projects','payments','schools'].map(name=><Route key={name} path={`/admin/${name}`} element={module(name)}/>)}
  <Route path="/admin/access-denied" element={<AdminStatePage state="access"/>}/>
  <Route path="/admin/session-expired" element={<AdminStatePage state="session"/>}/>
  <Route path="/admin/system-error" element={<AdminStatePage state="error"/>}/>
  <Route path="*" element={<Navigate to="/admin" replace/>}/>
</Routes>}
