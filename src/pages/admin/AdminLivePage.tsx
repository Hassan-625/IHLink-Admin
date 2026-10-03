import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, Check, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth, type UserProfile, type UserRole } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { adminSections, badge } from "./adminShared";
import { openPlatformWithHandoff } from "@/lib/platformHandoff";
import type { PlatformKey } from "@/lib/platformUrls";

type AccessRecord = {
  id: string;
  user_id: string;
  product: ProductKey;
  can_view: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_delete: boolean;
  can_manage: boolean;
  can_use_website_builder: boolean;
  can_use_command_center: boolean;
};
type ServiceAccessRecord = { id: string; user_id: string; product: ProductKey; status: "active" | "pending" | "suspended"; plan_name: string | null };

type PriceRecord = { id:string; business_unit_id:string|null; code:string; name:string; description:string|null; status:string; base_price:number|null; currency:string; updated_at:string; source_table:string|null; source_id:string|null; pricing_unit:string|null };
type AuditRecord = {
  id: number;
  actor_id: string | null;
  action: string;
  product: string | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
};

type ProductKey = "corporate" | "datasub" | "schoolpro" | "consult" | "host" | "engineering" | "business_centre" | "print" | "fabrication" | "compute" | "academy" | "digital_business";
const products: { key: ProductKey; label: string }[] = [
  { key: "corporate", label: "Corporate" },
  { key: "datasub", label: "DataSub" },
  { key: "schoolpro", label: "SchoolPro" },
  { key: "consult", label: "Consult" },
  { key: "host", label: "Host" },
  { key: "engineering", label: "Engineering" },
  { key: "business_centre", label: "Business & Innovation Centre" },
  { key: "print", label: "Print & Branding" },
  { key: "fabrication", label: "3D & Fabrication Lab" },
  { key: "compute", label: "AI & Compute" },
  { key: "academy", label: "IHLink Academy" },
  { key: "digital_business", label: "Digital Business Centre" },
];
const roles: UserRole[] = ["super_admin", "platform_admin", "support", "finance", "customer"];
const administratorRoles: UserRole[] = ["platform_admin", "support", "finance"];
const roleLabel = (role: UserRole) => role.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const platformWorkspace: Partial<Record<ProductKey,string>> = {
  corporate: "/",
  datasub: "/datasub/dashboard",
  schoolpro: "/schoolpro/admin-dashboard",
  consult: "/consult/operations",
  host: "/host/dashboard/operations",
  engineering: "/engineering/operations",
  business_centre: "/business-centre/workspace",
  print: "/print/order",
  fabrication: "/fabrication",
  compute: "/compute",
  academy: "/academy",
  digital_business: "/business-centre/digital-services",
};
const fullName = (profile: UserProfile) => [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed user";
const formatDate = (value: string) => new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function Notice({ error, success }: { error: string | null; success: string | null }) {
  if (!error && !success) return null;
  return <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
    {error ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}{error || success}
  </div>;
}

export function AdminLivePage({ module }: { module: "administrators" | "roles" | "customers" | "pricing" | "audit-logs" }) {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [access, setAccess] = useState<AccessRecord[]>([]);
  const [serviceAccess, setServiceAccess] = useState<ServiceAccessRecord[]>([]);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const canManage = currentProfile?.role === "super_admin";

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError(null);
    const [{ data: profileRows, error: profileError }, { data: accessRows, error: accessError }, { data: serviceRows, error: serviceError }, { data: logRows, error: logError }, { data: priceRows, error: priceError }] = await Promise.all([
      supabase.from("profiles").select("id,email,first_name,last_name,role,status,created_at").order("created_at", { ascending: false }),
      supabase.from("admin_product_access").select("id,user_id,product,can_view,can_edit,can_approve,can_delete,can_manage,can_use_website_builder,can_use_command_center"),
      supabase.from("customer_service_access").select("id,user_id,product,status,plan_name"),
      supabase.from("audit_logs").select("id,actor_id,action,product,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("service_catalog").select("id,business_unit_id,code,name,description,status,base_price,currency,updated_at,source_table,source_id,pricing_unit").order("name"),
    ]);
    const firstError = profileError || accessError || serviceError || logError || priceError;
    if (firstError) setError(firstError.message);
    setProfiles((profileRows || []) as UserProfile[]);
    setAccess((accessRows || []) as AccessRecord[]);
    setServiceAccess((serviceRows || []) as ServiceAccessRecord[]);
    setLogs((logRows || []) as AuditRecord[]);
    setPrices((priceRows || []).map((row:any)=>({...row,base_price:row.base_price==null?null:Number(row.base_price)})) as PriceRecord[]);
    setSelectedId((previous) => previous || profileRows?.find((row) => row.role !== "customer")?.id || profileRows?.[0]?.id || null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const admins = useMemo(() => profiles.filter((item) => item.role !== "customer"), [profiles]);
  const superAdminCount = profiles.filter((item) => item.role === "super_admin").length;
  const additionalSuperAdmins = Math.max(0, superAdminCount - 1);
  const selected = profiles.find((item) => item.id === selectedId) || null;
  const matches = (values: unknown[]) => !search.trim() || values.some(value => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()));
  const filteredProfiles = profiles.filter(item => matches([fullName(item), item.email, item.role, item.status]));
  const filteredAdmins = admins.filter(item => matches([fullName(item), item.email, item.role, item.status]));
  const filteredLogs = logs.filter(item => matches([item.action, item.product, item.target_type, item.target_id, item.actor_id]));

  async function recordAudit(action: string, targetId: string, product?: string) {
    if (!supabase || !currentProfile) return;
    await supabase.from("audit_logs").insert({ actor_id: currentProfile.id, action, product: product || "system", target_type: "profile", target_id: targetId });
  }

  async function updateBasePrice(row:PriceRecord,value:number|null){ if(!supabase||!canManage)return; setSaving(true);setError(null); const stamp=new Date().toISOString(); const {error:e}=await supabase.from("service_catalog").update({base_price:value,updated_at:stamp}).eq("id",row.id); if(e){setError(e.message);setSaving(false);return;} let sourceError:any=null; if(row.source_table&&row.source_id){ if(row.source_table==="business_catalog")({error:sourceError}=await supabase.from("business_catalog").update({base_price:value,updated_at:stamp}).eq("id",row.source_id)); else if(row.source_table==="host_plans"&&value!=null)({error:sourceError}=await supabase.from("host_plans").update({monthly_price:value,updated_at:stamp}).eq("id",row.source_id)); else if(row.source_table==="host_domain_prices"&&value!=null)({error:sourceError}=await supabase.from("host_domain_prices").update({registration_price:value,updated_at:stamp}).eq("id",row.source_id)); } if(sourceError)setError(`Central price saved, but source catalogue update failed: ${sourceError.message}`); else setSuccess("Customer base price updated across the linked platform catalogue."); await load();setSaving(false); }

  async function updateProfile(id: string, changes: Partial<Pick<UserProfile, "role" | "status">>) {
    if (!supabase || !canManage) return;
    const target = profiles.find((item) => item.id === id);
    if (changes.role === "super_admin" && target?.role !== "super_admin" && superAdminCount >= 3) {
      setError("IHLink allows a maximum of three Super Administrators: the protected primary owner plus up to two additional trusted administrators.");
      setSuccess(null);
      return;
    }
    setSaving(true); setError(null); setSuccess(null);
    const { error: updateError } = await supabase.from("profiles").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) setError(updateError.message);
    else {
      await recordAudit(changes.role ? `Role changed to ${changes.role}` : `Account status changed to ${changes.status}`, id);
      setSuccess("The account was updated successfully.");
      await load();
    }
    setSaving(false);
  }

  async function updateAccess(userId: string, product: ProductKey, field: "can_view" | "can_edit" | "can_approve" | "can_delete" | "can_manage" | "can_use_website_builder" | "can_use_command_center", value: boolean) {
    if (!supabase || !canManage) return;
    setSaving(true); setError(null); setSuccess(null);
    const existing = access.find((row) => row.user_id === userId && row.product === product);
    const payload = { user_id: userId, product, can_view: existing?.can_view || false, can_edit: existing?.can_edit || false, can_approve: existing?.can_approve || false, can_delete: existing?.can_delete || false, can_manage: existing?.can_manage || false, can_use_website_builder: existing?.can_use_website_builder || false, can_use_command_center: existing?.can_use_command_center || false, [field]: value };
    const { error: accessError } = await supabase.from("admin_product_access").upsert(payload, { onConflict: "user_id,product" });
    if (accessError) setError(accessError.message);
    else {
      await recordAudit(`${product} ${field.replace("can_", "")} permission ${value ? "granted" : "removed"}`, userId, product);
      setSuccess("Product permission saved.");
      await load();
    }
    setSaving(false);
  }

  async function updateCustomerService(userId: string, product: ProductKey, status: "none" | ServiceAccessRecord["status"]) {
    if (!supabase || !canManage) return;
    setSaving(true); setError(null); setSuccess(null);
    const existing = serviceAccess.find((row) => row.user_id === userId && row.product === product);
    const result = status === "none"
      ? existing ? await supabase.from("customer_service_access").delete().eq("id", existing.id) : { error: null }
      : await supabase.from("customer_service_access").upsert({ user_id: userId, product, status, plan_name: existing?.plan_name || (product === "corporate" ? "IHLink Account" : "Standard Access"), activated_at: status === "active" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "user_id,product" });
    if (result.error) setError(result.error.message);
    else {
      await recordAudit(`${product} customer access changed to ${status}`, userId, product);
      setSuccess(`${products.find((item) => item.key === product)?.label} access updated.`);
      await load();
    }
    setSaving(false);
  }

  const common = { product: "corporate" as const, sections: adminSections, eyebrow: "Live Supabase Administration", userName: currentProfile ? fullName(currentProfile) : "IHLink Administrator", userRole: currentProfile ? roleLabel(currentProfile.role) : "Administrator" };
  if (loading) return <ModulePage {...common} title="Loading administration data" description="Securely retrieving the latest IHLink records."><Card><div className="flex items-center gap-3 text-muted"><Loader2 className="h-5 w-5 animate-spin" />Loading live records…</div></Card></ModulePage>;

  if (module === "customers") {
    const active = profiles.filter((item) => item.status === "active").length;
    return <ModulePage {...common} title="Customers" description="Review every registered IHLink identity and control account status." primaryAction="Refresh" metrics={[{ label: "Registered Users", value: String(profiles.length) }, { label: "Active", value: String(active) }, { label: "Suspended", value: String(profiles.filter((item) => item.status === "suspended").length) }, { label: "New This Month", value: String(profiles.filter((item) => new Date(item.created_at || 0).getMonth() === new Date().getMonth()).length) }]}>
      <Notice error={error} success={success} /><LiveToolbar onRefresh={load} search={search} onSearch={setSearch} />
      <Card padding="none" className="overflow-hidden"><LiveTable headers={["Customer", "Email", "Role", "Services", "Account Status", "Manage"]}>{filteredProfiles.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{fullName(item)}</td><td className="p-4 text-sm">{item.email}</td><td className="p-4">{badge(roleLabel(item.role), "blue")}</td><td className="p-4 text-sm">{serviceAccess.filter(row=>row.user_id===item.id&&row.status==="active").length} active</td><td className="p-4"><select aria-label={`Status for ${item.email}`} disabled={!canManage || saving || item.id === currentProfile?.id} value={item.status} onChange={(event) => void updateProfile(item.id, { status: event.target.value as UserProfile["status"] })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:opacity-60"><option value="active">Active</option><option value="suspended">Suspended</option><option value="invited">Invited</option></select></td><td className="p-4"><Button size="sm" variant="secondary" onClick={()=>setSelectedId(item.id)}>Manage access</Button></td></tr>)}</LiveTable></Card>
      {selected&&<Card padding="none" className="overflow-hidden"><div className="border-b p-5"><h3 className="font-bold">Platform access — {fullName(selected)}</h3><p className="mt-1 text-sm text-muted">{selected.role==="super_admin"?"Super Administrators have unrestricted ecosystem access. Customer subscription/tier labels do not limit this identity.":"Activate only the services purchased or assigned to this account. Changes apply immediately."}</p></div><LiveTable headers={["Platform","Current access","Plan / authority"]}>{products.map(product=>{const row=serviceAccess.find(item=>item.user_id===selected.id&&item.product===product.key);const superAccess=selected.role==="super_admin";return <tr key={product.key} className="border-t"><td className="p-4 font-semibold">{product.label}</td><td className="p-4">{superAccess?<span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-bold text-royal-700">Full access</span>:<select aria-label={`${product.label} access for ${selected.email}`} disabled={!canManage||saving} value={row?.status||"none"} onChange={event=>void updateCustomerService(selected.id,product.key,event.target.value as "none"|ServiceAccessRecord["status"])} className="rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:opacity-60"><option value="none">No access</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select>}</td><td className="p-4 text-sm font-semibold">{superAccess?"Super Administrator · Full ecosystem access":row?.plan_name||"—"}</td></tr>})}</LiveTable></Card>}
    </ModulePage>;
  }

  if (module === "administrators") {
    return <ModulePage {...common} title="Administrators" description="Assign trusted staff roles and review their product access. IHLink supports the protected primary owner plus up to two additional Super Administrators." primaryAction="Refresh" metrics={[{ label: "Administrators", value: String(admins.length) }, { label: "Super Admins", value: `${superAdminCount} of 3` }, { label: "Additional Slots", value: String(Math.max(0, 2-additionalSuperAdmins)) }, { label: "Platform Admins", value: String(admins.filter((item) => item.role === "platform_admin").length) }]}>
      <Notice error={error} success={success} /><div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><strong>Super Admin appointments:</strong> Use the Role selector below to promote up to two trusted users. Use Roles & Permissions for staff who need only one platform or limited actions.</div><LiveToolbar onRefresh={load} search={search} onSearch={setSearch} />
      <Card padding="none" className="overflow-hidden"><LiveTable headers={["Administrator", "Email", "Role", "Product Access", "Status"]}>{filteredAdmins.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{fullName(item)}{item.id === currentProfile?.id && <span className="ml-2 text-xs text-royal-600">You</span>}</td><td className="p-4 text-sm">{item.email}</td><td className="p-4"><select aria-label={`Role for ${item.email}`} disabled={!canManage || saving || item.id === currentProfile?.id} value={item.role} onChange={(event) => void updateProfile(item.id, { role: event.target.value as UserRole })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:opacity-60">{roles.map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select></td><td className="p-4 text-sm">{item.role==="super_admin" ? "All platforms · Full ecosystem access" : access.filter((row) => row.user_id === item.id && row.can_view).map((row) => products.find((p) => p.key === row.product)?.label).filter(Boolean).join(", ") || "No product access"}</td><td className="p-4">{badge(item.status === "active" ? "Active" : item.status, item.status === "active" ? "green" : "amber")}</td></tr>)}</LiveTable></Card>
    </ModulePage>;
  }

  if (module === "roles") {
    return <ModulePage {...common} title="Roles & Permissions" description="Promote any IHLink Corporate account to an administrator, then control exactly what that administrator can view, edit, approve, delete, manage, and whether they can use the Website Builder or platform Command Centre." primaryAction="Save automatically" metrics={[{ label: "System Roles", value: String(roles.length) }, { label: "Administrators", value: String(admins.length) }, { label: "Products", value: String(products.length) }, { label: "Access Rules", value: String(access.length) }]}>
      <Notice error={error} success={success} />
      <Card><div className="flex flex-wrap items-end justify-between gap-4"><div><label className="mb-2 block text-xs font-bold uppercase text-muted">IHLink Corporate account</label><select value={selectedId || ""} onChange={(event) => setSelectedId(event.target.value)} className="min-w-72 rounded-lg border border-border bg-white px-3 py-2.5 text-sm">{profiles.map((item) => <option key={item.id} value={item.id}>{fullName(item)} — {item.email} — {roleLabel(item.role)}</option>)}</select>{selected&&<div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-bold uppercase text-muted">Role</span><select aria-label={`Role for ${selected.email}`} disabled={!canManage||saving||selected.id===currentProfile?.id} value={selected.role} onChange={(event)=>void updateProfile(selected.id,{role:event.target.value as UserRole})} className="rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:opacity-60">{roles.map(role=><option key={role} value={role}>{role==="platform_admin"?"Administrator":roleLabel(role)}</option>)}</select>{selected.role==="super_admin"&&<span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-bold text-royal-700">{selected.email.toLowerCase()==="hassanisahassan12@gmail.com"?"Primary Owner · Super Administrator · Administrator":"Super Administrator · Full ecosystem access"}</span>}</div>}</div>{!canManage && <p className="text-sm text-amber-700">Only a Super Administrator can change permissions.</p>}</div></Card>
      <Card padding="none" className="overflow-hidden"><LiveTable headers={["Platform", "Direct platform access", "View", "Edit", "Approve", "Delete", "Manage", "Website Builder", "Command Centre"]}>{products.map((product) => { const row = access.find((item) => item.user_id === selectedId && item.product === product.key); const selectedIsSuper=selected?.role==="super_admin"; const canOpen=Boolean(selectedIsSuper||row?.can_view); return <tr key={product.key} className="border-t"><td className="p-4 font-semibold">{product.label}</td><td className="p-4">{canOpen && platformWorkspace[product.key] ? (product.key==="corporate"?<a href="/" className="inline-flex items-center rounded-lg border border-royal-200 bg-royal-50 px-3 py-2 text-xs font-bold text-royal-700 hover:bg-royal-100">Open platform</a>:<button type="button" onClick={()=>void openPlatformWithHandoff(product.key as PlatformKey,platformWorkspace[product.key]!)} className="inline-flex items-center rounded-lg border border-royal-200 bg-royal-50 px-3 py-2 text-xs font-bold text-royal-700 hover:bg-royal-100">Open platform</button>) : <span className="text-xs text-muted">{canOpen ? "Workspace route coming soon" : selected?.role==="customer" ? "Assign an administrator role first" : "Grant View access first"}</span>}</td>{(["can_view", "can_edit", "can_approve", "can_delete", "can_manage", "can_use_website_builder", "can_use_command_center"] as const).map((field) => <td className="p-4" key={field}><input type="checkbox" aria-label={`${field} ${product.label}`} disabled={!selected || !canManage || saving || selectedIsSuper || !administratorRoles.includes(selected?.role as UserRole)} checked={selectedIsSuper || row?.[field] || false} onChange={(event) => selected && void updateAccess(selected.id, product.key, field, event.target.checked)} className="h-5 w-5 accent-blue-600" /></td>)}</tr>; })}</LiveTable></Card>
    </ModulePage>;
  }

  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  return <ModulePage {...common} title="Audit Logs" description="Review sensitive role, status and product-permission changes across IHLink." primaryAction="Refresh" metrics={[{ label: "Recent Events", value: String(logs.length) }, { label: "Role Changes", value: String(logs.filter((item) => item.action.startsWith("Role changed")).length) }, { label: "Permission Changes", value: String(logs.filter((item) => item.action.includes("permission")).length) }, { label: "Actors", value: String(new Set(logs.map((item) => item.actor_id).filter(Boolean)).size) }]}>
    <Notice error={error} success={success} /><LiveToolbar onRefresh={load} search={search} onSearch={setSearch} />
    <Card padding="none" className="overflow-hidden"><LiveTable headers={["Action", "Administrator", "Platform", "Target", "Time"]}>{filteredLogs.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{item.action}</td><td className="p-4 text-sm">{item.actor_id && profileMap.get(item.actor_id) ? fullName(profileMap.get(item.actor_id)!) : "System"}</td><td className="p-4">{badge(item.product || "System", "blue")}</td><td className="p-4 text-xs text-muted">{item.target_id || "—"}</td><td className="p-4 text-sm text-muted">{formatDate(item.created_at)}</td></tr>)}</LiveTable></Card>
  </ModulePage>;
}

function LiveToolbar({ onRefresh, search, onSearch }: { onRefresh: () => Promise<void>; search?: string; onSearch?: (value:string)=>void }) { return <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4" />Live data protected by Supabase row-level security</div><div className="flex items-center gap-2">{onSearch&&<label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted"/><input aria-label="Search table" value={search||""} onChange={e=>onSearch(e.target.value)} placeholder="Search…" className="w-56 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm"/></label>}<Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void onRefresh()}>Refresh</Button></div></div>; }
function LiveTable({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="max-h-[70vh] overflow-auto"><table className="w-full text-left"><thead className="sticky top-0 z-20 bg-gray-50 shadow-sm"><tr>{headers.map((header) => <th key={header} className="p-4 text-xs font-bold uppercase tracking-wide text-muted">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
