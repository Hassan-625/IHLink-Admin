import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { type ProductKey } from '@/lib/designTokens';

interface PageShellProps {
  product?: ProductKey;
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showAnnouncement?: boolean;
  announcementText?: string;
  maxWidth?: number;
}

export function PageShell({
  product = 'corporate',
  children,
  showHeader = true,
  showFooter = true,
  showAnnouncement = true,
  announcementText,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {showHeader && <Header product={product} showAnnouncement={showAnnouncement} announcementText={announcementText} />}
      <main className="flex-1">
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
      {showFooter && <Footer product={product} />}
    </div>
  );
}
