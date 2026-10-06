import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Row = Record<string, any>;
const fields: Record<string, string[]> = {
  business_catalog: ['name', 'category', 'description', 'pricing_unit', 'is_active'],
  consult_service_catalog: ['name', 'category', 'description', 'typical_timeline', 'is_active'],
  host_plans: ['name', 'category', 'description', 'is_active'],
  print_products: ['name', 'category', 'description', 'active'],
  academy_courses: ['title', 'category', 'description', 'duration_text', 'delivery_mode', 'is_active'],
  schoolpro_announcements: ['title', 'body', 'audience'],
  schoolpro_calendar_events: ['title', 'event_date', 'event_type', 'details'],
  schoolpro_hostel_rooms: ['hostel_name', 'room'],
  schoolpro_inventory_assets: ['name', 'category', 'condition', 'location'],
  schoolpro_library_books: ['title', 'author', 'isbn'],
  schoolpro_transport_routes: ['name', 'vehicle', 'driver_name', 'driver_phone'],
};
const label = (key: string) => key.replaceAll('_', ' ');

export function AdminOperationalRecordActions({ table, row, onSaved }: { table: string; row: Row; onSaved: () => Promise<unknown> }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState<Row>({}), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const keys = fields[table];
  if (profile?.role !== 'super_admin' || profile.status !== 'active' || !keys) return null;
  const removable = ['schoolpro_announcements', 'schoolpro_calendar_events'].includes(table);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!supabase || busy) return;
    const changes: Row = {}, expected: Row = {};
    for (const key of keys) if ((draft[key] ?? null) !== (row[key] ?? null)) { changes[key] = draft[key] ?? null; expected[key] = row[key] ?? null; }
    if (!Object.keys(changes).length) { setNotice('No fields changed.'); return; }
    setBusy(true); setNotice('');
    try {
      const result = await (supabase as any).rpc('admin_edit_operational_record', { p_table: table, p_id: row.id, p_changes: changes, p_expected: expected });
      if (result.error) throw result.error;
      if (result.data?.id !== row.id) throw new Error('The record was not saved.');
      await onSaved(); setOpen(false); setNotice('Saved and recorded in the audit log.');
    } catch (error) { setNotice((error as { message?: string })?.message || 'Unable to save this record.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!supabase || busy || !window.confirm(`Delete ${row.title}? This removes this school communication.`)) return;
    setBusy(true); setNotice('');
    try {
      const result = await (supabase as any).rpc('admin_delete_school_communication', { p_table: table, p_id: row.id, p_expected: row });
      if (result.error) throw result.error;
      if (result.data !== row.id) throw new Error('The record was not deleted.');
      await onSaved();
    } catch (error) { setNotice((error as { message?: string })?.message || 'Unable to delete this record.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 border-t pt-4">
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setDraft(Object.fromEntries(keys.map(key => [key, row[key] ?? null]))); setOpen(!open); setNotice(''); }}>{open ? 'Close editor' : 'Edit record'}</Button>{removable && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void remove()}>Delete communication</Button>}</div>
    {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
    {open && <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={event => void save(event)}>{keys.map(key => <label key={key} className="text-sm capitalize">{label(key)}{['is_active', 'active'].includes(key) ? <input className="ml-3" type="checkbox" checked={!!draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} /> : <input className="mt-1 block w-full rounded-xl border p-3" type={key === 'event_date' ? 'date' : 'text'} maxLength={10000} required={['name', 'title', 'category', 'hostel_name', 'room'].includes(key)} value={draft[key] ?? ''} onChange={event => setDraft({ ...draft, [key]: event.target.value || null })} />}</label>)}<Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></form>}
  </div>;
}

export function AdminOperationalCatalogs() {
  const { profile } = useAuth();
  const [table, setTable] = useState('business_catalog'), [rows, setRows] = useState<Row[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const tables = ['business_catalog', 'consult_service_catalog', 'host_plans', 'print_products', 'academy_courses'];
  const scope = useRef(''); scope.current = `${profile?.id}:${table}`;
  async function load() {
    if (!supabase || profile?.role !== 'super_admin') return;
    const requestScope = scope.current;
    setLoading(true); setError('');
    const result = await supabase.from(table).select('*').order(table === 'academy_courses' ? 'title' : 'name');
    if (requestScope !== scope.current) return;
    if (result.error) { setError(result.error.message); setRows([]); } else setRows(result.data || []);
    setLoading(false);
  }
  useEffect(() => { setRows([]); void load(); }, [table, profile?.id]);
  if (profile?.role !== 'super_admin') return null;
  return <Card className="mt-6"><h2 className="text-xl font-black">Service catalogue management</h2><p className="mt-2 text-sm">Edit service descriptions and availability. Disable a service to remove it from sale while retaining existing customer orders.</p><label className="mt-4 block text-sm">Catalogue<select className="ml-3 rounded-xl border p-3" value={table} onChange={event => setTable(event.target.value)}>{tables.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>{error && <p role="alert" className="mt-4 text-rose-700">{error}</p>}{loading ? <p className="mt-4">Loading catalogue…</p> : <div className="mt-4 space-y-3">{rows.map(row => <div className="rounded-xl border p-4" key={row.id}><h3 className="font-bold">{row.name || row.title}</h3><AdminOperationalRecordActions key={table + row.id} table={table} row={row} onSaved={load} /></div>)}{!rows.length && <p>No catalogue records.</p>}</div>}</Card>;
}
