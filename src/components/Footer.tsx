import { PlatformLink as Link } from './PlatformLink';
import { Logo } from './Logo';
import { productThemes, type ProductKey } from '@/lib/designTokens';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, ArrowRight, MessageCircle } from 'lucide-react';
import { IHLinkContact } from '@/lib/contact';

interface FooterProps {
  product?: ProductKey;
}

const footerLinks: Record<ProductKey, { title: string; links: { label: string; href: string }[] }[]> = {
  corporate: [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Services', href: '/services' },
        { label: 'Portfolio', href: '/portfolio' },
        { label: 'Case Studies', href: '/case-studies' },
        { label: 'Careers', href: '/careers' },
        { label: 'Partners', href: '/partners' },
      ],
    },
    {
      title: 'Divisions',
      links: [
        { label: 'Digital Services', href: '/services#digital' },
        { label: 'Technology & Engineering', href: '/services#technology' },
        { label: 'Business & Innovation', href: '/business-centre' },
      ],
    },
    {
      title: 'Products',
      links: [
        { label: 'IHLink DataSub', href: '/datasub' },
        { label: 'SchoolPro by IHLink', href: '/schoolpro' },
        { label: 'IHLink Hosting & Domains', href: '/host' },
        { label: 'IHLink Consult', href: '/consult' },
        { label: 'IHLink Engineering', href: '/engineering' },
        { label: 'Print & Branding', href: '/print' },
        { label: '3D & Fabrication Lab', href: '/fabrication' },
        { label: 'AI & Compute', href: '/compute' },
        { label: 'IHLink Academy', href: '/academy' },
        { label: 'Digital Business Centre', href: '/business-centre/digital-services' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Blog', href: '/blog' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Support', href: '/support' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
  datasub: [
    {
      title: 'Services',
      links: [
        { label: 'Airtime', href: '/datasub/airtime' },
        { label: 'Data Plans', href: '/datasub/data-plans' },
        { label: 'Electricity', href: '/datasub/electricity' },
        { label: 'Cable TV', href: '/datasub/cable' },
        { label: 'Education', href: '/datasub/education' },
      ],
    },
    {
      title: 'Platform',
      links: [
        { label: 'Reseller', href: '/datasub/reseller' },
        { label: 'Developer API', href: '/datasub/api' },
        { label: 'Pricing', href: '/datasub/pricing' },
        { label: 'FAQ', href: '/datasub/faq' },
        { label: 'Support', href: '/datasub/support' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register' },
        { label: 'Customer Dashboard', href: '/account' },
        { label: 'Wallet', href: '/datasub/wallet' },
        { label: 'Transactions', href: '/datasub/transactions' },
      ],
    },
  ],
  schoolpro: [
    {
      title: 'Platform',
      links: [
        { label: 'Features', href: '/schoolpro/features' },
        { label: 'Result Management', href: '/schoolpro/result-management' },
        { label: 'Pricing', href: '/schoolpro/pricing' },
        { label: 'Book a Demo', href: '/schoolpro/book-demo' },
        { label: 'FAQ', href: '/schoolpro/faq' },
      ],
    },
    {
      title: 'Portals',
      links: [
        { label: 'School Login', href: '/schoolpro/login' },
        { label: 'Parent Login', href: '/schoolpro/parent-login' },
        { label: 'Student Login', href: '/schoolpro/student-login' },
        { label: 'Teacher Login', href: '/schoolpro/teacher-login' },
        { label: 'Result Checker', href: '/schoolpro/result-checker' },
      ],
    },
    {
      title: 'Get Started',
      links: [
        { label: 'Register School', href: '/schoolpro/register' },
        { label: 'Support', href: '/schoolpro/support' },
        { label: 'Sign In', href: '/signin' },
        { label: 'IHLink Home', href: '/' },
      ],
    },
  ],
  consult: [
    {
      title: 'Services',
      links: [
        { label: 'Web & Mobile', href: '/consult/services/web-mobile' },
        { label: 'AI & ML', href: '/consult/services/ai-ml' },
        { label: 'Cloud & DevOps', href: '/consult/services/cloud-devops' },
        { label: 'Engineering', href: '/consult/services/engineering' },
      ],
    },
    {
      title: 'Engage',
      links: [
        { label: 'Book Consultation', href: '/consult/book' },
        { label: 'Get a Quote', href: '/consult/quote' },
        { label: 'Hire Us', href: '/consult/hire' },
        { label: 'Portfolio', href: '/consult/portfolio' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Client Portal', href: '/consult/portal' },
        { label: 'Support', href: '/support' },
        { label: 'Sign In', href: '/signin' },
        { label: 'IHLink Home', href: '/' },
      ],
    },
  ],
  host: [
    { title: 'Products', links: [
      { label: 'Domain Search', href: '/host/domains' }, { label: 'Web Hosting', href: '/host/hosting' },
      { label: 'Reseller Hosting', href: '/host/reseller' }, { label: 'VPS Servers', href: '/host/vps' },
      { label: 'Dedicated Servers', href: '/host/dedicated' },
    ] },
    { title: 'Customers', links: [
      { label: 'Dashboard', href: '/host/dashboard' }, { label: 'My Domains', href: '/host/dashboard/domains' },
      { label: 'My Services', href: '/host/dashboard/services' }, { label: 'Order Hosting', href: '/host/order' },
    ] },
    { title: 'Help', links: [
      { label: 'Support Centre', href: '/host/support' }, { label: 'Sign In', href: '/signin' },
      { label: 'Company Home', href: '/' }, { label: 'Terms', href: '/terms' },
    ] },
  ],
  engineering: [
    { title: 'Engineering', links: [
      { label: 'Control Systems', href: '/engineering/control' }, { label: 'Robotics & Automation', href: '/engineering/robotics' },
      { label: 'Instrumentation', href: '/engineering/instrumentation' }, { label: 'Networking', href: '/engineering/networking' },
    ] },
    { title: 'Work With Us', links: [
      { label: 'Request a Project', href: '/engineering/quote' }, { label: 'Engineering Portfolio', href: '/engineering/portfolio' },
      { label: 'Technical Support', href: '/engineering/support' }, { label: 'Client Workspace', href: '/engineering/dashboard' },
    ] },
    { title: 'Company', links: [
      { label: 'IHLink Home', href: '/' }, { label: 'IHLink Consult', href: '/consult' },
      { label: 'Contact', href: '/contact' }, { label: 'Terms', href: '/terms' },
    ] },
  ],
};

export function Footer({ product = 'corporate' }: FooterProps) {
  const theme = productThemes[product];
  const links = footerLinks[product];

  return (
    <footer className={`${theme.footerBg} ${theme.footerText} mt-20`}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-12 lg:gap-8">
          <div className="col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="rounded-xl border border-white/30 bg-white p-1.5 shadow-lg shadow-black/20 ring-1 ring-white/10 flex items-center justify-center">
                <Logo product={product} variant="icon" size="md" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">{productThemes[product].name}</p>
                <p className="text-xs opacity-70">A product of IHLink Co. Ltd.</p>
              </div>
            </div>
            <p className="text-sm opacity-70 max-w-xs mb-4">
              Connecting People, Businesses and Education Through Technology. Digital solutions, intelligent systems and engineering services built for Africa.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm opacity-70">
                <MapPin className="w-4 h-4 shrink-0" /> {IHLinkContact.address}
              </div>
              <a href={IHLinkContact.phoneHref} className="flex items-center gap-2.5 text-sm opacity-70 transition hover:opacity-100">
                <Phone className="w-4 h-4 shrink-0" /> {IHLinkContact.phoneDisplay}
              </a>
              <a href={IHLinkContact.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-sm opacity-70 transition hover:opacity-100">
                <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp IHLink
              </a>
              <a href={IHLinkContact.emailHref} className="flex items-center gap-2.5 break-all text-sm opacity-70 transition hover:opacity-100">
                <Mail className="w-4 h-4 shrink-0" /> {IHLinkContact.email}
              </a>
            </div>
          </div>

          {links.map((section) => (
            <div key={section.title} className="col-span-1 min-w-0 lg:col-span-2">
              <h4 className="text-sm font-bold text-white mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm leading-5 opacity-70 hover:opacity-100 hover:text-white transition-all flex items-start gap-1 group break-words">
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <p className="text-xs opacity-60">© 2026 IHLink Co. Ltd. All rights reserved. RC — Lagos, Nigeria.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs opacity-60 sm:flex sm:items-center">
            <Link to="/privacy" className="hover:opacity-100">Privacy Policy</Link>
            <Link to="/terms" className="hover:opacity-100">Terms & Conditions</Link>
            {import.meta.env.DEV&&<Link to="/design-index" className="hover:opacity-100">Design Index</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
