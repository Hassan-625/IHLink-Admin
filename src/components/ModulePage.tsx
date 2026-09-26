import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Download, Filter, Plus, Search } from 'lucide-react';
import { DashboardLayout, type SidebarSection } from './Sidebar';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { ProductKey } from '@/lib/designTokens';

export interface Metric { label: string; value: string; change?: string; tone?: string }
export interface Column { key: string; label: string }
export interface ModulePageProps {
  product: ProductKey;
  sections: SidebarSection[];
  title: string;
  eyebrow?: string;
  description: string;
  userName: string;
  userRole: string;
  metrics?: Metric[];
  columns?: Column[];
  rows?: Record<string, ReactNode>[];
  primaryAction?: string;
  children?: ReactNode;
}

export function ModulePage({ product, sections, title, eyebrow, description, userName, userRole, metrics = [], columns = [], rows = [], primaryAction = 'Add New', children }: ModulePageProps) {
  const [tableSearch, setTableSearch] = useState('');
  const filteredRows = useMemo(() => !tableSearch.trim() ? rows : rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(tableSearch.trim().toLowerCase()))), [rows, tableSearch]);
  return (
    <DashboardLayout product={product} sections={sections} userName={userName} userRole={userRole} pageTitle={title}
      rightActions={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>{primaryAction}</Button>}>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-navy-900 via-royal-700 to-royal-500 p-7 text-white overflow-hidden relative">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative max-w-3xl">
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">{eyebrow}</p>}
            <h2 className="text-2xl font-extrabold">{title}</h2>
            <p className="mt-2 text-sm text-white/80 leading-relaxed">{description}</p>
          </div>
        </section>

        {metrics.length > 0 && <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric, i) => <Card key={metric.label} padding="sm">
            <p className="text-xs font-semibold text-muted">{metric.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-extrabold text-ink">{metric.value}</p>
              {metric.change && <span className={`text-xs font-bold ${metric.tone || 'text-emerald-600'}`}>{metric.change}</span>}
            </div>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-royal-500 to-purple-500" style={{ width: `${58 + (i * 9) % 35}%` }} /></div>
          </Card>)}
        </section>}

        <AutoTableTools>{children}</AutoTableTools>

        {columns.length > 0 && <Card padding="none" className="overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <div><h3 className="font-bold text-ink">Records</h3><p className="text-xs text-muted mt-1">Manage and review the latest information.</p></div>
            <div className="flex gap-2">
              <div className="relative"><Search className="w-4 h-4 text-muted absolute left-3 top-2.5" /><input className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-royal-200" placeholder="Search records" value={tableSearch} onChange={e => setTableSearch(e.target.value)} /></div>
              <Button variant="secondary" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
              <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm"><tr>{columns.map(c => <th key={c.key} className="px-5 py-3 text-2xs uppercase tracking-wide text-muted">{c.label}</th>)}<th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-y divide-border">{filteredRows.map((row, i) => <tr key={i} className="hover:bg-gray-50/70">{columns.map(c => <td key={c.key} className="px-5 py-4 text-sm text-ink">{row[c.key]}</td>)}<td className="px-5 py-4 text-right"><button className="p-1.5 rounded-lg hover:bg-royal-50 text-royal-600"><ArrowUpRight className="w-4 h-4" /></button></td></tr>)}</tbody>
          </table></div>
        </Card>}
      </div>
    </DashboardLayout>
  );
}

function AutoTableTools({children}:{children:ReactNode}) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const host=root.current;if(!host)return;
    const enhance=()=>host.querySelectorAll<HTMLTableElement>('table').forEach((table,index)=>{
      if(table.dataset.searchEnhanced==='true')return;
      table.dataset.searchEnhanced='true';
      table.querySelector('thead')?.classList.add('sticky','top-0','z-20','bg-gray-50','shadow-sm');
      const shell=table.parentElement;if(!shell)return;
      const bar=document.createElement('div');bar.className='ihlink-table-search flex items-center justify-end border-b bg-white p-3';
      const input=document.createElement('input');input.type='search';input.placeholder='Search this table';input.setAttribute('aria-label',`Search table ${index+1}`);input.className='w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200';
      input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row=>{row.style.display=!q||row.textContent?.toLowerCase().includes(q)?'':'none';});});
      bar.appendChild(input);shell.parentElement?.insertBefore(bar,shell);
    });
    enhance();const observer=new MutationObserver(enhance);observer.observe(host,{childList:true,subtree:true});return()=>observer.disconnect();
  },[]);
  return <div ref={root}>{children}</div>;
}
