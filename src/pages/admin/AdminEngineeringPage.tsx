import { useCallback, useEffect, useState } from "react";
import { ModulePage } from "@/components/ModulePage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { adminSections, badge } from "./adminShared";

type Request = {
  id: string;
  user_id: string;
  request_number: string;
  project_title: string;
  discipline: string;
  location: string | null;
  preferred_assessment_date: string | null;
  status: string;
};
type Project = {
  id: string;
  user_id: string;
  request_id: string | null;
  project_number: string;
  name: string;
  discipline: string;
  stage: string;
  progress: number;
  status: string;
};
type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
};
const field =
  "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-amber-500";

export function AdminEngineeringPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [proposals,setProposals]=useState<any[]>([]),[invoices,setInvoices]=useState<any[]>([]),[paymentIntents,setPaymentIntents]=useState<any[]>([]),[directTransfers,setDirectTransfers]=useState<any[]>([]),[risks,setRisks]=useState<any[]>([]),[tests,setTests]=useState<any[]>([]),[milestones,setMilestones]=useState<any[]>([]),[documents,setDocuments]=useState<any[]>([]),[changes,setChanges]=useState<any[]>([]),[team,setTeam]=useState<any[]>([]),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState("");
  const [operation, setOperation] = useState({
    project_id: "",
    kind: "assessment",
    title: "",
    details: "",
    date: "",
  });
  const load = useCallback(async () => {
    if (!supabase) return;
    const [r, p, t] = await Promise.all([
      supabase
        .from("engineering_requests")
        .select(
          "id,user_id,request_number,project_title,discipline,location,preferred_assessment_date,status",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("engineering_projects")
        .select(
          "id,user_id,request_id,project_number,name,discipline,stage,progress,status",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("engineering_support_tickets")
        .select("id,subject,category,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setRequests((r.data || []) as Request[]);
    setProjects((p.data || []) as Project[]);
    setTickets((t.data || []) as Ticket[]);
    setOperation((v) => ({
      ...v,
      project_id: v.project_id || p.data?.[0]?.id || "",
    }));
    const [pp,ii,pi,dt,rr,tt,mm,dd,cc,tm]=await Promise.all([supabase.from('engineering_proposals').select('*').order('created_at',{ascending:false}),supabase.from('engineering_invoices').select('*').order('created_at',{ascending:false}),supabase.from('engineering_payment_intents').select('*').order('created_at',{ascending:false}),supabase.from('ihlink_direct_transfer_submissions').select('*').eq('platform','engineering').order('created_at',{ascending:false}),supabase.from('engineering_risks').select('*').order('created_at',{ascending:false}),supabase.from('engineering_tests').select('*').order('created_at',{ascending:false}),supabase.from('engineering_milestones').select('*').order('created_at',{ascending:false}),supabase.from('engineering_documents').select('*').order('created_at',{ascending:false}),supabase.from('engineering_change_requests').select('*').order('created_at',{ascending:false}),supabase.from('engineering_team_members').select('*').order('created_at',{ascending:false})]);setPaymentIntents(pi.data||[]);setDirectTransfers(dt.data||[]);setMilestones(mm.data||[]);setDocuments(dd.data||[]);setChanges(cc.data||[]);setTeam(tm.data||[]);setProposals(pp.data||[]);setInvoices(ii.data||[]);setRisks(rr.data||[]);setTests(tt.data||[]);setNotice(r.error?.message || p.error?.message || t.error?.message || pp.error?.message || ii.error?.message || pi.error?.message || dt.error?.message || rr.error?.message || tt.error?.message || mm.error?.message || dd.error?.message || cc.error?.message || tm.error?.message || "");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function updateRequest(id: string, status: string) {
    if (!supabase) return;
    setBusy(id);
    const { error } = await supabase
      .from("engineering_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusy("");
    setNotice(error?.message || "Request workflow updated.");
    await load();
  }
  async function createProject(r: Request) {
    if (!supabase) return;
    setBusy(r.id);
    const { data, error } = await supabase
      .from("engineering_projects")
      .insert({
        user_id: r.user_id,
        request_id: r.id,
        name: r.project_title,
        discipline: r.discipline,
        stage: "site_assessment",
        progress: 5,
        status: "active",
      })
      .select("id")
      .single();
    if (error) {
      setBusy("");
      setNotice(error.message);
      return;
    }
    if (r.preferred_assessment_date)
      await supabase
        .from("engineering_site_assessments")
        .insert({
          project_id: data.id,
          scheduled_at: `${r.preferred_assessment_date}T09:00:00Z`,
          site_address: r.location,
          status: "scheduled",
        });
    await supabase
      .from("engineering_requests")
      .update({
        status: r.preferred_assessment_date
          ? "assessment_scheduled"
          : "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setBusy("");
    setNotice("Engineering project workspace created.");
    await load();
  }
  async function updateProject(p: Project, stage: string, progress: number) {
    if (!supabase) return;
    setBusy(p.id);
    const { error } = await supabase
      .from("engineering_projects")
      .update({
        stage,
        progress,
        status: progress === 100 ? "completed" : p.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    setBusy("");
    setNotice(error?.message || "Project stage updated.");
    await load();
  }
  async function addOperation() {
    if (!supabase || !operation.project_id || !operation.title) return;
    setBusy("operation");
    let error: { message: string } | null = null;
    if (operation.kind === "assessment") {
      ({ error } = await supabase
        .from("engineering_site_assessments")
        .insert({
          project_id: operation.project_id,
          scheduled_at: operation.date ? `${operation.date}T09:00:00Z` : null,
          site_address: operation.title,
          recommendations: operation.details,
          status: "scheduled",
        }));
    } else if (operation.kind === "equipment") {
      ({ error } = await supabase
        .from("engineering_equipment")
        .insert({
          project_id: operation.project_id,
          item_name: operation.title,
          specification: operation.details,
          status: "planned",
        }));
    } else if (operation.kind === "report") {
      const user = (await supabase.auth.getUser()).data.user;
      ({ error } = await supabase
        .from("engineering_field_reports")
        .insert({
          project_id: operation.project_id,
          work_completed: operation.title,
          observations: operation.details,
          created_by: user?.id,
        }));
    } else {
      ({ error } = await supabase
        .from("engineering_maintenance")
        .insert({
          project_id: operation.project_id,
          title: operation.title,
          scheduled_date:
            operation.date || new Date().toISOString().slice(0, 10),
          notes: operation.details,
          status: "scheduled",
        }));
    }
    setBusy("");
    setNotice(error?.message || "Project operation added.");
    if (!error)
      setOperation({ ...operation, title: "", details: "", date: "" });
  }
  async function patchRecord(table:string,id:string,values:any){if(!supabase)return;setBusy(id);const {error}=await supabase.from(table).update({...values,updated_at:new Date().toISOString()}).eq('id',id);setBusy('');setNotice(error?.message||'Engineering record updated.');if(!error)await load()}async function updateTicket(id: string, status: string) {
    if (!supabase) return;
    setBusy(id);
    const { error } = await supabase
      .from("engineering_support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusy("");
    setNotice(error?.message || "Support ticket updated.");
    await load();
  }
  return (
    <ModulePage
      product="corporate"
      sections={adminSections}
      title="Engineering Operations"
      eyebrow="Central Administration"
      description="Review engineering briefs, schedule site work, control delivery stages and maintenance."
      userName={profile?.first_name || "Administrator"}
      userRole="Engineering Administrator"
      primaryAction="Live Engineering Desk"
      metrics={[
        { label: "Requests", value: String(requests.length) },
        {
          label: "Active projects",
          value: String(projects.filter((x) => x.status === "active").length),
        },
        {
          label: "Site assessments",
          value: String(
            requests.filter((x) => x.status === "assessment_scheduled").length,
          ),
        },
        {
          label: "Open support",
          value: String(
            tickets.filter((x) => !["resolved", "closed"].includes(x.status))
              .length,
          ),
        },
      ]}
    >
      {notice && (
        <div className="rounded-xl border bg-white p-3 text-sm">{notice}</div>
      )}
      <Card padding="none" className="overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-bold">Engineering request pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Request", "Discipline", "Status", "Workflow"].map((x) => (
                  <th key={x} className="p-3 text-xs uppercase text-muted">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <b>{r.project_title}</b>
                    <p className="text-xs text-muted">
                      {r.request_number} · {r.location || "Location pending"}
                    </p>
                  </td>
                  <td className="p-3 capitalize">{r.discipline}</td>
                  <td className="p-3">
                    {badge(
                      r.status,
                      r.status === "accepted"
                        ? "green"
                        : r.status === "declined"
                          ? "red"
                          : "amber",
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === r.id}
                        onClick={() => void updateRequest(r.id, "reviewing")}
                      >
                        Review
                      </Button>
                      {!projects.some((p) => p.request_id === r.id) && (
                        <Button
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => void createProject(r)}
                        >
                          Create project
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-bold">Project stages</h3>
          <div className="mt-4 divide-y">
            {projects.map((p) => (
              <div key={p.id} className="py-4">
                <div className="flex justify-between">
                  <div>
                    <b>{p.name}</b>
                    <p className="text-xs text-muted">
                      {p.project_number} · {p.stage.replaceAll("_", " ")}
                    </p>
                  </div>
                  <b>{p.progress}%</b>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === p.id}
                    onClick={() => void updateProject(p, "design", 25)}
                  >
                    Design
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === p.id}
                    onClick={() => void updateProject(p, "procurement", 45)}
                  >
                    Procurement
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === p.id}
                    onClick={() => void updateProject(p, "installation", 70)}
                  >
                    Installation
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === p.id}
                    onClick={() => void updateProject(p, "commissioning", 90)}
                  >
                    Commissioning
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === p.id}
                    onClick={() => void updateProject(p, "completed", 100)}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">Add project operation</h3>
          <div className="mt-4 space-y-3">
            <select
              className={field}
              value={operation.project_id}
              onChange={(e) =>
                setOperation({ ...operation, project_id: e.target.value })
              }
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} · {p.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={operation.kind}
              onChange={(e) =>
                setOperation({ ...operation, kind: e.target.value })
              }
            >
              <option value="assessment">Site assessment</option>
              <option value="equipment">Equipment item</option>
              <option value="report">Field report</option>
              <option value="maintenance">Maintenance schedule</option>
            </select>
            <input
              className={field}
              placeholder={
                operation.kind === "assessment"
                  ? "Site address"
                  : "Title or item name"
              }
              value={operation.title}
              onChange={(e) =>
                setOperation({ ...operation, title: e.target.value })
              }
            />
            {["assessment", "maintenance"].includes(operation.kind) && (
              <input
                type="date"
                className={field}
                value={operation.date}
                onChange={(e) =>
                  setOperation({ ...operation, date: e.target.value })
                }
              />
            )}
            <textarea
              className={field}
              placeholder="Specifications, findings or notes"
              value={operation.details}
              onChange={(e) =>
                setOperation({ ...operation, details: e.target.value })
              }
            />
            <Button
              disabled={busy === "operation" || !projects.length}
              onClick={() => void addOperation()}
            >
              Add operation
            </Button>
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="font-bold">Engineering support desk</h3>
        <div className="mt-4 divide-y">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <b>{t.subject}</b>
                <p className="text-xs text-muted">
                  {t.category} · {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {badge(t.status, t.status === "resolved" ? "green" : "amber")}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === t.id}
                  onClick={() => void updateTicket(t.id, "in_progress")}
                >
                  Start
                </Button>
                <Button
                  size="sm"
                  disabled={busy === t.id}
                  onClick={() => void updateTicket(t.id, "resolved")}
                >
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
<Card><h3 className="font-bold">Payment reconciliation</h3><p className="mt-1 text-sm text-muted">Verified Engineering settlement records. BillStack/webhook verification or the dedicated direct-transfer review workflow must settle payments; this panel cannot manufacture a paid state.</p><div className="mt-4 grid gap-5 xl:grid-cols-2"><div><h4 className="font-bold">BillStack payment intents</h4><div className="mt-2 space-y-2">{paymentIntents.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{x.reference||x.transaction_ref||'Payment intent'}</b><p className="text-xs text-muted">₦{Number(x.amount||0).toLocaleString()} · {x.transaction_ref||'awaiting transaction reference'}</p></div>{badge(String(x.status||'pending'),x.status==='paid'||x.status==='success'?'green':x.status==='failed'||x.status==='rejected'?'red':'amber')}</div>{x.paid_at&&<p className="mt-2 text-xs text-muted">Settled {new Date(x.paid_at).toLocaleString('en-NG')}</p>}</div>)}{!paymentIntents.length&&<p className="text-sm text-muted">No Engineering payment intents yet.</p>}</div></div><div><h4 className="font-bold">Direct bank transfers</h4><div className="mt-2 space-y-2">{directTransfers.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{x.source_reference||x.customer_reference||'Transfer submission'}</b><p className="text-xs text-muted">₦{Number(x.amount||0).toLocaleString()} · {x.customer_reference||'reference pending'}</p></div>{badge(String(x.status||'pending'),x.status==='approved'||x.status==='paid'?'green':x.status==='rejected'?'red':'amber')}</div></div>)}{!directTransfers.length&&<p className="text-sm text-muted">No Engineering direct-transfer submissions yet.</p>}</div></div></div></Card><Card><h3 className="font-bold">Commercial & technical controls</h3><p className="mt-1 text-sm text-muted">Manage production-backed proposals, invoices, risks and commissioning/test records.</p><div className="mt-4 grid gap-5 xl:grid-cols-2"><div><h4 className="font-bold">Proposals & invoices</h4><div className="mt-2 space-y-2">{proposals.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{x.title||x.proposal_number||'Proposal'}</b><p className="text-xs text-muted">{x.status}</p></div><div className="flex gap-2">{x.status!=='approved'&&<Button size="sm" onClick={()=>void patchRecord('engineering_proposals',x.id,{status:'approved'})}>Approve</Button>}<Button size="sm" variant="secondary" onClick={()=>void patchRecord('engineering_proposals',x.id,{status:'rejected'})}>Reject</Button></div></div></div>)}{invoices.map(x=><div key={x.id} className="rounded-xl border p-3"><b>{x.invoice_number||'Invoice'}</b><p className="text-xs text-muted">{x.status} · ₦{Number(x.amount||0).toLocaleString()}</p></div>)}</div></div><div><h4 className="font-bold">Risks & tests</h4><div className="mt-2 space-y-2">{risks.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{x.title||x.risk_type||'Risk'}</b><p className="text-xs text-muted">{x.status} · {x.severity||x.impact||'unrated'}</p></div>{x.status!=='closed'&&<Button size="sm" onClick={()=>void patchRecord('engineering_risks',x.id,{status:'closed'})}>Close risk</Button>}</div></div>)}{tests.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{x.title||x.test_type||'Test / commissioning'}</b><p className="text-xs text-muted">{x.status}</p></div>{x.status!=='completed'&&<Button size="sm" onClick={()=>void patchRecord('engineering_tests',x.id,{status:'completed',performed_at:new Date().toISOString()})}>Complete test</Button>}</div></div>)}</div></div></div></Card><Card><h3 className="font-bold">Project delivery controls</h3><p className="mt-1 text-sm text-muted">Milestones, controlled documents, change requests and project-team assignments are managed here against live Engineering projects.</p><div className="mt-4 grid gap-5 xl:grid-cols-2"><div><h4 className="font-bold">Milestones & documents</h4><div className="mt-2 space-y-2">{milestones.map(x=><div key={x.id} className="rounded-xl border p-3"><b>{x.title}</b><p className="text-xs text-muted">{x.status} · {x.progress}%</p><div className="mt-2 flex gap-2">{x.status!=='completed'&&<Button size="sm" onClick={()=>void patchRecord('engineering_milestones',x.id,{status:'completed',progress:100})}>Complete</Button>}</div></div>)}{documents.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><div><b>{x.title}</b><p className="text-xs text-muted">{x.document_type} · {x.approval_status}</p></div><div className="flex gap-2">{x.file_url&&<a className="rounded-lg border px-3 py-2 text-xs font-bold" href={x.file_url} target="_blank" rel="noreferrer">Open ↗</a>}{x.approval_status!=='approved'&&<Button size="sm" onClick={()=>void patchRecord('engineering_documents',x.id,{approval_status:'approved'})}>Approve</Button>}</div></div></div>)}</div></div><div><h4 className="font-bold">Changes & team</h4><div className="mt-2 space-y-2">{changes.map(x=><div key={x.id} className="rounded-xl border p-3"><b>{x.title}</b><p className="text-xs text-muted">{x.status} · cost impact ₦{Number(x.cost_impact||0).toLocaleString()} · {x.schedule_impact_days||0} day(s)</p>{x.status==='pending'&&<div className="mt-2 flex gap-2"><Button size="sm" onClick={()=>void patchRecord('engineering_change_requests',x.id,{status:'approved'})}>Approve</Button><Button size="sm" variant="secondary" onClick={()=>void patchRecord('engineering_change_requests',x.id,{status:'rejected'})}>Reject</Button></div>}</div>)}{team.map(x=><div key={x.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><div><b>{x.display_name}</b><p className="text-xs text-muted">{x.role_title} · {x.discipline||'general'}</p></div><Button size="sm" variant="secondary" onClick={()=>void patchRecord('engineering_team_members',x.id,{is_active:!x.is_active})}>{x.is_active?'Deactivate':'Activate'}</Button></div></div>)}</div></div></div></Card>
    </ModulePage>
  );
}
