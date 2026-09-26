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
    setNotice(r.error?.message || p.error?.message || t.error?.message || "");
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
  async function updateTicket(id: string, status: string) {
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
    </ModulePage>
  );
}
