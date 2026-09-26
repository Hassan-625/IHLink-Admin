import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePage } from "@/components/ModulePage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { adminSections, badge } from "./adminShared";

type Ticket = {
  id: string;
  source: "central" | "host" | "engineering" | "business";
  ticket: string;
  product: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  message?: string;
};
const field =
  "w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:border-royal-500";

export function AdminSupportPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [filter, setFilter] = useState("open"),
    [selected, setSelected] = useState<Ticket | null>(null),
    [reply, setReply] = useState(""),
    [internal, setInternal] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!supabase) return;
    const [central, host, engineering, business] = await Promise.all([
      supabase
        .from("support_tickets")
        .select(
          "id,ticket_number,product,subject,category,priority,status,created_at,message",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("host_support_tickets")
        .select(
          "id,ticket_number,subject,category,priority,status,created_at,message",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("engineering_support_tickets")
        .select("id,subject,category,status,created_at,message")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("business_support_tickets").select("id,unit_code,subject,priority,status,created_at,message").order("created_at",{ascending:false}).limit(100),
    ]);
    const rows: Ticket[] = [
      ...(central.data || []).map((x) => ({
        id: x.id,
        source: "central" as const,
        ticket: x.ticket_number,
        product: x.product,
        subject: x.subject,
        category: x.category,
        priority: x.priority,
        status: x.status,
        created_at: x.created_at,
        message: x.message,
      })),
      ...(host.data || []).map((x) => ({
        id: x.id,
        source: "host" as const,
        ticket: x.ticket_number,
        product: "host",
        subject: x.subject,
        category: x.category,
        priority: x.priority,
        status: x.status,
        created_at: x.created_at,
        message: x.message,
      })),
      ...(business.data || []).map((x) => ({id:x.id,source:"business" as const,ticket:`BIZ-${x.id.slice(0,6).toUpperCase()}`,product:x.unit_code,subject:x.subject,category:x.unit_code,priority:x.priority,status:x.status,created_at:x.created_at,message:x.message})),
      ...(engineering.data || []).map((x) => ({
        id: x.id,
        source: "engineering" as const,
        ticket: `ENG-${x.id.slice(0, 6).toUpperCase()}`,
        product: "engineering",
        subject: x.subject,
        category: x.category,
        priority: "normal",
        status: x.status,
        created_at: x.created_at,
        message: x.message,
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setTickets(rows);
    setNotice(
      central.error?.message ||
        host.error?.message ||
        engineering.error?.message || business.error?.message || "",
    );
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      filter === "all"
        ? tickets
        : tickets.filter((t) =>
            filter === "open"
              ? !["resolved", "closed"].includes(t.status)
              : t.product === filter,
          ),
    [tickets, filter],
  );
  async function changeStatus(ticket: Ticket, status: string) {
    if (!supabase) return;
    setBusy(true);
    const table =
      ticket.source === "central"
        ? "support_tickets"
        : ticket.source === "host"
          ? "host_support_tickets"
          : ticket.source === "engineering" ? "engineering_support_tickets" : "business_support_tickets";
    const nextStatus =
      ticket.source === "host" && status === "waiting_customer"
        ? "in_progress"
        : status;
    const payload: Record<string, string | null> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved" && ticket.source === "central")
      payload.resolved_at = new Date().toISOString();
    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", ticket.id);
    setBusy(false);
    setNotice(error?.message || "Ticket status updated.");
    await load();
    setSelected(null);
  }
  async function sendReply() {
    if (
      !supabase ||
      !profile ||
      !selected ||
      selected.source !== "central" ||
      !reply.trim()
    )
      return;
    setBusy(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: selected.id,
      sender_id: profile.id,
      message: reply.trim(),
      is_internal: internal,
    });
    if (!error)
      await supabase
        .from("support_tickets")
        .update({
          status: internal ? selected.status : "waiting_customer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
    setBusy(false);
    setNotice(
      error?.message ||
        (internal ? "Internal note added." : "Reply added for the customer."),
    );
    if (!error) {
      setReply("");
      setInternal(false);
    }
  }
  const open = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status),
  ).length;
  return (
    <ModulePage
      product="corporate"
      sections={adminSections}
      title="Support Operations"
      eyebrow="Central Administration"
      description="Manage customer requests across IHLink Corporate, DataSub, SchoolPro, Consult, Host, Engineering and every Business & Innovation unit from one queue."
      userName={profile?.first_name || "Administrator"}
      userRole="Support Administrator"
      primaryAction="Unified Ticket Queue"
      metrics={[
        { label: "All tickets", value: String(tickets.length) },
        { label: "Open", value: String(open) },
        {
          label: "Urgent",
          value: String(
            tickets.filter(
              (t) =>
                t.priority === "urgent" &&
                !["resolved", "closed"].includes(t.status),
            ).length,
          ),
        },
        {
          label: "Resolved",
          value: String(tickets.filter((t) => t.status === "resolved").length),
        },
      ]}
    >
      {notice && (
        <div className="rounded-xl border bg-white p-3 text-sm">{notice}</div>
      )}
      <Card>
        <div className="flex flex-wrap gap-2">
          {[
            "open",
            "all",
            "datasub",
            "schoolpro",
            "consult",
            "host",
            "engineering",
            "business_centre","print","fabrication","compute","academy","digital_business",
            "corporate",
          ].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "primary" : "secondary"}
              onClick={() => setFilter(value)}
            >
              {value.replaceAll("_", " ")}
            </Button>
          ))}
        </div>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Ticket",
                  "Platform",
                  "Priority",
                  "Status",
                  "Created",
                  "Action",
                ].map((h) => (
                  <th key={h} className="p-4 text-xs uppercase text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={`${t.source}-${t.id}`} className="border-t">
                  <td className="p-4">
                    <b>{t.subject}</b>
                    <p className="text-xs text-muted">
                      {t.ticket} · {t.category}
                    </p>
                  </td>
                  <td className="p-4 capitalize">{t.product}</td>
                  <td className="p-4">
                    {badge(
                      t.priority,
                      t.priority === "urgent" || t.priority === "high"
                        ? "red"
                        : "blue",
                    )}
                  </td>
                  <td className="p-4">
                    {badge(
                      t.status,
                      t.status === "resolved"
                        ? "green"
                        : t.status === "open"
                          ? "amber"
                          : "blue",
                    )}
                  </td>
                  <td className="p-4 text-muted">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelected(t)}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No tickets in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-royal-600">
                {selected.ticket} · {selected.product}
              </p>
              <h3 className="mt-1 text-xl font-bold">{selected.subject}</h3>
              <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-muted">
                {selected.message}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-muted"
            >
              Close panel
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void changeStatus(selected, "in_progress")}
            >
              Start work
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void changeStatus(selected, "waiting_customer")}
            >
              Waiting customer
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void changeStatus(selected, "resolved")}
            >
              Resolve
            </Button>
          </div>
          {selected.source === "central" && (
            <div className="mt-6 border-t pt-5">
              <h4 className="font-bold">Reply or internal note</h4>
              <textarea
                className={`${field} mt-3`}
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a response or internal investigation note"
              />
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                Internal note — hidden from customer
              </label>
              <Button
                className="mt-3"
                disabled={busy || !reply.trim()}
                onClick={() => void sendReply()}
              >
                {internal ? "Add Internal Note" : "Send Customer Reply"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </ModulePage>
  );
}
