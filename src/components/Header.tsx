import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Search, Bell, Menu, X, Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { EcosystemLogo, type EcosystemKey } from './EcosystemLogo';
import { Dropdown, DropdownItem, DropdownDivider, DropdownLabel } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { productThemes, type ProductKey } from '@/lib/designTokens';
import { platformUrl } from '@/lib/platformUrls';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string; children?: { label: string; href: string }[] }[];
}

const productNavs: Record<ProductKey, NavItem[]> = {
  corporate: [
    { label: 'Home', href: platformUrl('corporate') },
    {
      label: 'Divisions', href: '/services',
      children: [
        { label: 'Digital Services', href: '/services#digital', description: 'Digital platforms and education technology', children: [
          { label: 'IHLink DataSub', href: platformUrl('datasub') },
          { label: 'SchoolPro by IHLink', href: platformUrl('schoolpro') },
          { label: 'IHLink Hosting & Domains', href: platformUrl('host') },
        ] },
        { label: 'Technology & Engineering', href: '/services#technology', description: 'Consulting and engineering solutions', children: [
          { label: 'IHLink Consult', href: platformUrl('consult') },
          { label: 'IHLink Engineering', href: platformUrl('engineering') },
        ] },
        { label: 'Business & Innovation Centre', href: '/business-centre', description: 'Create, print, learn and innovate', children: [
          { label: 'Print & Branding', href: platformUrl('print') },
          { label: '3D & Fabrication Lab', href: platformUrl('fabrication') },
          { label: 'AI & Compute', href: platformUrl('compute') },
          { label: 'IHLink Academy', href: platformUrl('academy') },
          { label: 'Digital Business Centre', href: platformUrl('digital_business') },
        ] },
      ],
    },
    { label: 'About Us', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Contact', href: '/contact' },
    { label: 'Support', href: '/support' },
  ],
  datasub: [
    { label: 'Home', href: platformUrl('datasub') },
    { label: 'Airtime', href: '/datasub/airtime' },
    { label: 'Data Plans', href: '/datasub/data-plans' },
    { label: 'Electricity', href: '/datasub/electricity' },
    { label: 'Cable TV', href: '/datasub/cable' },
    { label: 'Reseller', href: '/datasub/reseller' },
    { label: 'API', href: '/datasub/api' },
    { label: 'Pricing', href: '/datasub/pricing' },
    {
      label: 'Other Services', href: '/datasub/support',
      children: [
        { label: 'Airtime to Cash', href: '/datasub/airtime-to-cash', description: 'Convert supported airtime through the configured conversion service' },
        { label: 'Print Data Card', href: '/datasub/print-cards?type=data', description: 'Prepare printable data voucher card batches' },
        { label: 'Print Airtime Card', href: '/datasub/print-cards?type=airtime', description: 'Prepare printable airtime voucher card batches' },
        { label: 'Education PINs', href: '/datasub/education', description: 'Education and examination service catalogue' },
        { label: 'Wallet', href: '/datasub/wallet', description: 'Funding and wallet activity' },
        { label: 'Transactions', href: '/datasub/transactions', description: 'Transaction history and receipts' },
        { label: 'Support', href: '/datasub/support', description: 'Help and service support' },
      ],
    },
  ],
  schoolpro: [
    { label: 'Home', href: platformUrl('schoolpro') },
    { label: 'Features', href: '/schoolpro/features' },
    { label: 'Result Management', href: '/schoolpro/result-management' },
    { label: 'Pricing', href: '/schoolpro/pricing' },
    { label: 'Book a Demo', href: '/schoolpro/book-demo' },
    { label: 'FAQ', href: '/schoolpro/faq' },
  ],
  consult: [
    { label: 'Home', href: platformUrl('consult') },
    {
      label: 'Services', href: '/consult/services',
      children: [
        { label: 'Web & Mobile', href: '/consult/services/web-mobile', description: 'Development services' },
        { label: 'AI & ML', href: '/consult/services/ai-ml', description: 'Machine learning' },
        { label: 'Cloud & DevOps', href: '/consult/services/cloud-devops', description: 'Infrastructure' },
        { label: 'Computer Engineering', href: '/consult/services/engineering', description: 'Hardware & control' },
      ],
    },
    { label: 'Portfolio', href: '/consult/portfolio' },
    { label: 'Book Consultation', href: '/consult/book' },
    { label: 'Get a Quote', href: '/consult/quote' },
    { label: 'Hire Us', href: '/consult/hire' },
    { label: 'Client Portal', href: '/consult/portal' },
    { label: 'Operations', href: '/consult/operations' },
  ],
  host: [
    { label: 'Home', href: platformUrl('host') },
    { label: 'Domains', href: '/host/domains' },
    { label: 'Web Hosting', href: '/host/hosting' },
    { label: 'VPS', href: '/host/vps' },
    { label: 'Dedicated', href: '/host/dedicated' },
    { label: 'Support', href: '/host/support' },
    { label: 'Dashboard', href: '/host/dashboard' },
  ],
  engineering: [
    { label: 'Home', href: platformUrl('engineering') },
    { label: 'Control Systems', href: '/engineering/control' },
    { label: 'Robotics', href: '/engineering/robotics' },
    { label: 'Instrumentation', href: '/engineering/instrumentation' },
    { label: 'Networking', href: '/engineering/networking' },
    { label: 'Request Project', href: '/engineering/quote' },
    { label: 'Project Dashboard', href: '/engineering/dashboard' },
    { label: 'Operations', href: '/engineering/operations' },
    { label: 'Support', href: '/engineering/support' },
  ],
};

const productLinks: { key: EcosystemKey; label: string; href: string; description: string }[] = [
  { key: 'datasub', label: 'IHLink DataSub', href: platformUrl('datasub'), description: 'Airtime, data, bills and utilities' },
  { key: 'schoolpro', label: 'SchoolPro by IHLink', href: platformUrl('schoolpro'), description: 'School management and education technology' },
  { key: 'host', label: 'IHLink Hosting & Domains', href: platformUrl('host'), description: 'Domains, hosting and digital infrastructure' },
  { key: 'consult', label: 'IHLink Consult', href: platformUrl('consult'), description: 'Technology strategy and development' },
  { key: 'engineering', label: 'IHLink Engineering', href: platformUrl('engineering'), description: 'Control, robotics, IoT and instrumentation' },
  { key: 'print', label: 'IHLink Print & Branding', href: platformUrl('print'), description: 'Print, design and branding' },
  { key: 'fabrication', label: 'IHLink 3D & Fabrication Lab', href: platformUrl('fabrication'), description: '3D printing, CAD and prototyping' },
  { key: 'compute', label: 'IHLink AI & Compute', href: platformUrl('compute'), description: 'AI, data science and compute services' },
  { key: 'academy', label: 'IHLink Academy', href: platformUrl('academy'), description: 'Training, skills and certification' },
  { key: 'digital_business', label: 'Digital Business Centre', href: platformUrl('digital_business'), description: 'Documents, online services and business support' },
];

interface HeaderProps {
  product?: ProductKey;
  showAnnouncement?: boolean;
  announcementText?: string;
}

export function Header({ product = 'corporate', showAnnouncement = true, announcementText }: HeaderProps) {
  const theme = productThemes[product];
  const nav = productNavs[product];
  const location = useLocation();
  const { user, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDivision, setOpenDivision] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === '/' && product !== 'corporate') return false;
    return location.pathname === href || (href !== '/' && location.pathname.startsWith(href));
  };

  return (
    <>
      {showAnnouncement && (
        <div className={`${theme.announcementBg} ${theme.announcementText} text-xs font-medium px-4 py-2 text-center`}>
          {announcementText || 'Welcome to IHLink Co. Ltd. — Connecting People, Businesses and Education Through Technology'}
        </div>
      )}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Logo product={product} size="md" />
              <span className="text-2xs text-muted font-medium hidden lg:block">A product of IHLink Co. Ltd.</span>
            </div>

            <nav className="hidden xl:flex items-center gap-0.5 whitespace-nowrap">
              {nav.map((item) =>
                item.children ? (
                  <Dropdown
                    key={item.label}
                    align="left"
                    width={280}
                    trigger={
                      <button className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${isActive(item.href) ? theme.textClass : 'text-ink hover:bg-gray-50'}`}>
                        {item.label}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        <DropdownLabel>{item.label}</DropdownLabel>
                        {item.children!.map((child) => (
                          <div key={child.label} className="border-t border-border/60 first:border-t-0">
                            <div className="flex items-center">
                              {child.children ? (
                                <button type="button" onClick={() => setOpenDivision(openDivision === child.label ? null : child.label)} className="w-full min-w-0 px-3.5 py-2 hover:bg-gray-50 text-left flex items-center justify-between gap-3">
                                  <span className="min-w-0 flex-1"><span className="font-semibold block text-sm">{child.label}</span>{child.description && <span className="text-xs text-muted block whitespace-normal leading-4">{child.description}</span>}</span>
                                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDivision === child.label ? 'rotate-180' : ''}`} />
                                </button>
                              ) : (
                                <Link to={child.href} onClick={close} className="flex-1 px-3.5 py-2 hover:bg-gray-50">
                                  <span className="font-semibold block text-sm">{child.label}</span>
                                  {child.description && <span className="text-xs text-muted">{child.description}</span>}
                                </Link>
                              )}
                            </div>
                            {child.children && openDivision === child.label && (
                              <div className="pb-2 pl-4">
                                {child.children.map((sub) => (
                                  sub.href.startsWith('http') ? <a key={sub.label} href={sub.href} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-sm text-muted hover:text-ink hover:bg-gray-50 rounded-lg">
                                    <ArrowRight className="w-3.5 h-3.5" />{sub.label}</a> : <Link key={sub.label} to={sub.href} onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-sm text-muted hover:text-ink hover:bg-gray-50 rounded-lg"><ArrowRight className="w-3.5 h-3.5" />{sub.label}</Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </Dropdown>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${isActive(item.href) ? theme.textClass : 'text-ink hover:bg-gray-50'}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {product === 'corporate' && <Dropdown
                width={280}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors">
                    <span className={`w-4 h-4 rounded ${theme.btnClass}`} />
                    Products
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                }
              >
                {() => (
                  <>
                    <DropdownLabel>Switch Product</DropdownLabel>
                    {productLinks.map((p) => (
                      <DropdownItem key={p.label} icon={<EcosystemLogo service={p.key} iconOnly />}>
                        {p.href.startsWith('http')?<a href={p.href} className="block"><span className="font-semibold block">{p.label}</span><span className="text-xs text-muted">{p.description}</span></a>:<Link to={p.href} className="block">
                          <span className="font-semibold block">{p.label}</span>
                          <span className="text-xs text-muted">{p.description}</span>
                        </Link>}
                      </DropdownItem>
                    ))}
                  </>
                )}
              </Dropdown>}

              {user ? <><Link to="/account" className="hidden xl:flex items-center whitespace-nowrap"><Button variant="ghost" size="md">My Dashboard</Button></Link>{profile?.role==="super_admin"&&<Link to="/admin" className="hidden xl:flex items-center whitespace-nowrap"><Button size="md" themeClass={theme.btnClass}>Super Admin</Button></Link>}</> : <><Link to="/signin" className="hidden xl:flex items-center whitespace-nowrap"><Button variant="ghost" size="md">Sign In</Button></Link><Link to="/register" className="hidden xl:flex items-center whitespace-nowrap"><Button size="md" themeClass={theme.btnClass}>Get Started</Button></Link></>}

              <button className="xl:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="xl:hidden border-t border-border bg-white p-4 space-y-1 animate-fade-in">
            {nav.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold rounded-lg ${isActive(item.href) ? theme.textClass : 'text-ink hover:bg-gray-50'}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border flex gap-2">{user ? <><Link to="/account" className="flex-1"><Button variant="secondary" fullWidth>My Dashboard</Button></Link>{profile?.role==="super_admin"&&<Link to="/admin" className="flex-1"><Button fullWidth themeClass={theme.btnClass}>Super Admin</Button></Link>}</> : <><Link to="/signin" className="flex-1"><Button variant="secondary" fullWidth>Sign In</Button></Link><Link to="/register" className="flex-1"><Button fullWidth themeClass={theme.btnClass}>Get Started</Button></Link></>}</div>
          </div>
        )}
      </header>
    </>
  );
}
