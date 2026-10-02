import {useAuth} from '@/context/AuthContext';
import {canOpenAdminPath} from '@/lib/adminNavigationPermissions';
import {AuthHandoffPage} from '@/pages/auth/AuthHandoffPage';
import {AdminPrintPage} from '@/pages/admin/AdminPrintPage';
import {AdminPrintWorkspace} from '@/pages/admin/AdminPrintWorkspace';
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
import { AdminDeletionRequestsPage } from '@/pages/admin/AdminDeletionRequestsPage';
import { AdminReadinessPage } from '@/pages/admin/AdminReadinessPage';
import { AdminIntegrationsPage } from '@/pages/admin/AdminIntegrationsPage';
import { AdminSchoolProCustomRequests } from '@/pages/admin/AdminSchoolProCustomRequests';
import { AdminSchoolProWorkspace } from '@/pages/admin/AdminSchoolProWorkspace';
import { AdminSchoolProResultTemplates } from '@/pages/admin/AdminSchoolProResultTemplates';
import { AdminSchoolProDocumentStudio } from '@/pages/admin/AdminSchoolProDocumentStudio';
import { AdminSchoolProBranding } from '@/pages/admin/AdminSchoolProBranding';
import { AdminStatePage } from '@/pages/admin/AdminStatePage';
import { AdminIdentityManagementPage } from '@/pages/admin/AdminIdentityManagementPage';
import { AdminLivePage } from '@/pages/admin/AdminLivePage';
import { AdminOperationalDirectoryPage } from '@/pages/admin/AdminOperationalDirectoryPage';
import { AdminSchoolProSubscriptions } from '@/pages/admin/AdminSchoolProSubscriptions';
import { AdminCommercialPricingPage } from '@/pages/admin/AdminCommercialPricingPage';
import { AdminTemplateStudioPage } from '@/pages/admin/AdminTemplateStudioPage';
import { AdminEmailTemplatesPage } from '@/pages/admin/AdminEmailTemplatesPage';
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
  <Route path="/admin/schoolpro/workspace/result-templates" element={<Guard product="schoolpro"><AdminSchoolProResultTemplates/></Guard>}/>
  <Route path="/admin/schoolpro/workspace/documents" element={<Guard product="schoolpro"><AdminSchoolProDocumentStudio/></Guard>}/>
  <Route path="/admin/schoolpro/workspace/branding" element={<Guard product="schoolpro"><AdminSchoolProBranding/></Guard>}/>
  <Route path="/admin/schoolpro/workspace/:section" element={<Guard product="schoolpro"><AdminSchoolProWorkspace/></Guard>}/>
  <Route path="/admin/consult" element={<Guard product="consult"><AdminConsultPage/></Guard>}/>
  <Route path="/admin/engineering" element={<Guard product="engineering"><AdminEngineeringPage/></Guard>}/>
  <Route path="/admin/host" element={<Guard product="host"><AdminHostPage/></Guard>}/>
  <Route path="/admin/business-centre" element={<Guard product="business_centre"><AdminBusinessPage unit="business_centre"/></Guard>}/>
  <Route path="/admin/print" element={<Guard product="print"><AdminPrintPage/></Guard>}/>
  <Route path="/admin/print/workspace/:section" element={<Guard product="print"><AdminPrintWorkspace/></Guard>}/>
  <Route path="/admin/fabrication" element={<Guard product="fabrication"><AdminBusinessPage unit="fabrication"/></Guard>}/>
  <Route path="/admin/compute" element={<Guard product="compute"><AdminBusinessPage unit="compute"/></Guard>}/>
  <Route path="/admin/academy" element={<Guard product="academy"><AdminBusinessPage unit="academy"/></Guard>}/>
  <Route path="/admin/digital-business" element={<Guard product="digital_business"><AdminBusinessPage unit="digital_business"/></Guard>}/>
  <Route path="/admin/finance" element={<Guard><AdminFinancePage/></Guard>}/>
  <Route path="/admin/support" element={<Guard><AdminSupportPage/></Guard>}/>
  <Route path="/admin/notifications" element={<Guard><AdminNotificationsPage/></Guard>}/>
  <Route path="/admin/templates" element={<Guard superOnly><AdminTemplateStudioPage/></Guard>}/>
  <Route path="/admin/email-templates" element={<Guard superOnly><AdminEmailTemplatesPage/></Guard>}/>
  <Route path="/admin/security" element={<Guard superOnly><AdminSecurityPage/></Guard>}/>
  <Route path="/admin/account-deletions" element={<Guard superOnly><AdminDeletionRequestsPage/></Guard>}/>
  <Route path="/admin/readiness" element={<Guard superOnly><AdminReadinessPage/></Guard>}/>
  <Route path="/admin/integrations" element={<Guard superOnly><AdminIntegrationsPage/></Guard>}/>
  <Route path="/admin/customers" element={<Guard><AdminLivePage module="customers"/></Guard>}/>
  <Route path="/admin/administrators" element={<Guard superOnly><AdminLivePage module="administrators"/></Guard>}/>
  <Route path="/admin/roles" element={<Guard superOnly><AdminLivePage module="roles"/></Guard>}/>
  <Route path="/admin/products" element={<Guard><AdminOperationalDirectoryPage mode="products"/></Guard>}/>
  <Route path="/admin/pricing" element={<Guard superOnly><AdminCommercialPricingPage/></Guard>}/>
  <Route path="/admin/audit-logs" element={<Guard superOnly><AdminOperationalDirectoryPage mode="audit-logs"/></Guard>}/>
  <Route path="/admin/settings" element={<Guard superOnly><AdminOperationalDirectoryPage mode="settings"/></Guard>}/>
  <Route path="/admin/subscriptions" element={<Guard superOnly><AdminSchoolProSubscriptions/></Guard>}/>
  <Route path="/admin/schools" element={<Navigate to="/admin/schoolpro" replace/>}/>
  <Route path="/admin/payments" element={<Navigate to="/admin/finance" replace/>}/>
  <Route path="/admin/projects" element={<Navigate to="/admin/products" replace/>}/>
  <Route path="/admin/leads" element={<Navigate to="/admin/customers" replace/>}/>
  <Route path="/admin/access-denied" element={<AdminStatePage state="access"/>}/>
  <Route path="/admin/session-expired" element={<AdminStatePage state="session"/>}/>
  <Route path="/admin/system-error" element={<AdminStatePage state="error"/>}/>
  <Route path="*" element={<Navigate to="/admin" replace/>}/>
</Routes>}
