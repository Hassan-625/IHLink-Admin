import {ModulePage} from '@/components/ModulePage';
import {useAuth} from '@/context/AuthContext';
import {adminSections} from './adminShared';
import {BusinessOperationsPanel} from './BusinessOperationsPanel';
export function AdminBusinessPage({unit='business_centre'}:{unit?:string}){const {profile}=useAuth();const name=profile?[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.email:'Administrator';return <ModulePage product="corporate" sections={adminSections} title={unit.replaceAll('_',' ')+' operations'} eyebrow="Business & Innovation Centre" description="Authorized requests, quotations, invoices, production, learning records and support." userName={name} userRole="Authorized Administration"><BusinessOperationsPanel unit={unit}/></ModulePage>;}
