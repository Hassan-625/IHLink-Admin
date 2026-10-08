import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { adminSections, badge } from "./adminShared";
import { InvoiceWorkbench } from "@/components/InvoiceWorkbench";

type Row = {
  id: string;
  source: string;
  reference: string;
  product: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  status: string;
  created_at: string;
  classification: "company" | "customer_funds" | "school_collection" | "receivable";
};
type Ledger = {
  id: string;
  reference: string;
  product: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  entry_type: string;
  status: string;
  occurred_at: string;
};
type Bank={id:string;label:string;bank_name:string;account_name:string;account_number:string;is_active:boolean;is_default:boolean};type DirectTransfer={id:string;bank_account_id:string;platform_code:string;source_reference:string;amount:number;sender_name:string;sender_bank:string|null;customer_reference:string;status:string;created_at:string;proof_storage_path:string|null;admin_note:string|null;transferred_at:string|null};
type Refund = {
  id: string;
  refund_number: string;
  product: string;
  source_reference: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
};
const input =
  "w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:border-royal-500";
const money = (value: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
const ok = (status: string) =>
  [
    "successful",
    "approved",
    "paid",
    "completed",
    "active",
    "posted",
    "processed",
  ].includes(status.toLowerCase());
const pending = (status: string) =>
  [
    "pending",
    "pending_review",
    "awaiting_payment",
    "initiated",
    "requested",
    "reviewing",
    "approved",
    "draft",
  ].includes(status.toLowerCase());

const businessUnit=(row:any)=>{const invoice=Array.isArray(row.business_invoices)?row.business_invoices[0]:row.business_invoices;const relation=row.business_orders||invoice?.business_orders;const order=Array.isArray(relation)?relation[0]:relation;return order?.unit_code||'business_centre';};
export function AdminFinancePage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]); const[banks,setBanks]=useState<Bank[]>([]);const[transfers,setTransfers]=useState<DirectTransfer[]>([]);const[bank,setBank]=useState({label:"IHLink Main Account",bank_name:"",account_name:"",account_number:""});
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState({
    product: "corporate",
    direction: "credit",
    entry_type: "revenue",
    reference: "",
    description: "",
    amount: "",
  });

  const load = useCallback(async () => {
    if (!supabase) return;
    const [dt, wf, dc, sp, si, ho, cp, bp, bi, le, rr,ba,tr,subscriptionInvoices] = await Promise.all([
      supabase
        .from("datasub_transactions")
        .select("id,reference,service_type,amount,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("datasub_wallet_funding_requests")
        .select("id,payment_reference,amount,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("datasub_reseller_commissions")
        .select("id,commission_amount,tier_code,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("schoolpro_fee_payments")
        .select("id,reference,amount,method,paid_at,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("schoolpro_payment_intents")
        .select("id,reference,amount,gateway,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("host_orders")
        .select(
          "id,order_number,order_type,domain_name,amount,status,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("consult_payments")
        .select(
          "id,payment_reference,amount,description,status,paid_at,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("business_payments").select("id,amount,status,paid_at,created_at,invoice_id,provider_reference,business_invoices!inner(business_orders!inner(unit_code))").order("created_at",{ascending:false}).limit(100),
      supabase.from("business_invoices").select("id,invoice_number,amount,status,created_at,order_id,business_orders!inner(unit_code)").order("created_at",{ascending:false}).limit(100),
      supabase
        .from("finance_ledger_entries")
        .select(
          "id,reference,product,description,amount,direction,entry_type,status,occurred_at",
        )
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("finance_refund_requests")
        .select(
          "id,refund_number,product,source_reference,amount,reason,status,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),supabase.from("ihlink_bank_accounts").select("*").order("is_default",{ascending:false}),supabase.from("direct_transfer_submissions").select("id,bank_account_id,platform_code,source_reference,amount,sender_name,sender_bank,customer_reference,status,created_at,proof_storage_path,admin_note,transferred_at").order("created_at",{ascending:false}).limit(100),
      supabase.from('schoolpro_subscription_intents').select('id,reference,amount,status,created_at,invoice_kind').order('created_at',{ascending:false}).limit(200),
    ]);
    const combined: Row[] = [
      ...(subscriptionInvoices.data||[]).map(x=>({id:x.id,source:'SchoolPro subscription invoice',reference:x.reference,product:'schoolpro',description:x.invoice_kind==='demo'?'Free SchoolPro demo invoice':'SchoolPro annual subscription invoice',amount:Number(x.amount),direction:'credit' as const,status:x.status,created_at:x.created_at,classification:'receivable' as const})),
      ...(dt.data || []).map((x) => ({
        id: x.id,
        source: "DataSub transaction",
        reference: x.reference,
        product: "datasub",
        description: x.service_type,
        amount: Number(x.amount),
        direction: "credit" as const,
        status: String(x.status),
        created_at: x.created_at,
        classification: "company" as const,
      })),
      ...(wf.data || []).map((x) => ({
        id: x.id,
        source: "Wallet funding",
        reference: x.payment_reference,
        product: "datasub",
        description: "Customer wallet deposit",
        amount: Number(x.amount),
        direction: "credit" as const,
        status: String(x.status),
        created_at: x.created_at,
        classification: "customer_funds" as const,
      })),
      ...(dc.data || []).map((x) => ({
        id: x.id,
        source: "Reseller commission",
        reference: `COM-${x.id.slice(0, 8)}`,
        product: "datasub",
        description: `${x.tier_code} reseller commission`,
        amount: Number(x.commission_amount),
        direction: "debit" as const,
        status: "posted",
        created_at: x.created_at,
        classification: "company" as const,
      })),
      ...(sp.data || []).map((x) => ({
        id: x.id,
        source: "School fee",
        reference: x.reference,
        product: "schoolpro",
        description: `School collection · ${x.method}`,
        amount: Number(x.amount),
        direction: "credit" as const,
        status: "paid",
        created_at: x.paid_at || x.created_at,
        classification: "school_collection" as const,
      })),
      ...(si.data || []).map((x) => ({
        id: x.id,
        source: "School fee intent",
        reference: x.reference,
        product: "schoolpro",
        description: `School checkout · ${x.gateway}`,
        amount: Number(x.amount),
        direction: "credit" as const,
        status: x.status,
        created_at: x.created_at,
        classification: "school_collection" as const,
      })),
      ...(ho.data || []).map((x) => ({
        id: x.id,
        source: "Host order",
        reference: x.order_number,
        product: "host",
        description: x.domain_name || x.order_type,
        amount: Number(x.amount),
        direction: "credit" as const,
        status: x.status,
        created_at: x.created_at,
        classification: "company" as const,
      })),
      ...(bp.data || []).map((x) => ({id:x.id,source:"Business payment",reference:x.provider_reference||`BIZPAY-${x.id.slice(0,8)}`,product:businessUnit(x),description:"Business & Innovation payment",amount:Number(x.amount),direction:"credit" as const,status:x.status,created_at:x.paid_at||x.created_at,classification:"company" as const})),
      ...(bi.data || []).map((x) => ({id:x.id,source:"Business invoice",reference:x.invoice_number,product:businessUnit(x),description:"Invoice document (not an additional payment)",amount:Number(x.amount),direction:"credit" as const,status:x.status,created_at:x.created_at,classification:"receivable" as const})),
      ...(cp.data || []).map((x) => ({
        id: x.id,
        source: "Consult payment",
        reference: x.payment_reference,
        product: "consult",
        description: x.description,
        amount: Number(x.amount),
        direction: "credit" as const,
        status: x.status,
        created_at: x.paid_at || x.created_at,
        classification: "company" as const,
      })),
      ...(le.data || []).map((x) => ({
        id: x.id,
        source: `Ledger ${x.entry_type}`,
        reference: x.reference,
        product: x.product,
        description: x.description,
        amount: Number(x.amount),
        direction: x.direction as "credit" | "debit",
        status: x.status,
        created_at: x.occurred_at,
        classification: "company" as const,
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setRows(combined);
    setLedger(
      (le.data || []).map(
        (x) => ({ ...x, amount: Number(x.amount) }) as Ledger,
      ),
    );
    setRefunds(
      (rr.data || []).map(
        (x) => ({ ...x, amount: Number(x.amount) }) as Refund,
      ),
    );
    setBanks((ba.data||[]) as Bank[]);setTransfers((tr.data||[]) as DirectTransfer[]);
    setNotice(
      dt.error?.message ||
        wf.error?.message ||
        dc.error?.message ||
        sp.error?.message ||
        si.error?.message ||
        ho.error?.message ||
        cp.error?.message || bp.error?.message || bi.error?.message ||
        le.error?.message ||
        rr.error?.message || ba.error?.message || tr.error?.message ||
        "",
    );
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => rows.filter((r) => filter === "all" || r.product === filter),
    [rows, filter],
  );
  const companyGross = rows
    .filter(
      (r) =>
        r.classification === "company" &&
        r.direction === "credit" &&
        ok(r.status),
    )
    .reduce((n, r) => n + r.amount, 0);
  const companyDebits =
    rows
      .filter(
        (r) =>
          r.classification === "company" &&
          r.direction === "debit" &&
          ok(r.status),
      )
      .reduce((n, r) => n + r.amount, 0) +
    refunds
      .filter((r) => r.status === "processed")
      .reduce((n, r) => n + r.amount, 0);
  const pendingAmount = rows
    .filter((r) => ["company","receivable"].includes(r.classification) && pending(r.status))
    .reduce((n, r) => n + r.amount, 0);
  const schoolVolume = rows
    .filter((r) => r.classification === "school_collection" && ok(r.status))
    .reduce((n, r) => n + r.amount, 0);

  async function addEntry() {
    if (!supabase || !profile) return;
    const amount = Number(entry.amount);
    if (!entry.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a description and an amount greater than zero.");
      return;
    }
    setBusy(true);
    const payload = {
      ...entry,
      amount,
      description: entry.description.trim(),
      created_by: profile.id,
      status: "pending",
      ...(entry.reference ? {} : { reference: undefined }),
    };
    const { error } = await supabase
      .from("finance_ledger_entries")
      .insert(payload);
    setBusy(false);
    setNotice(error?.message || "Finance entry submitted for approval.");
    if (!error) {
      setEntry({ ...entry, reference: "", description: "", amount: "" });
      await load();
    }
  }
  async function updateLedger(id: string, status: string) {
    if (!supabase || !profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("finance_ledger_entries")
      .update({
        status,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(false);
    setNotice(error?.message || `Ledger entry ${status}.`);
    await load();
  }
  async function reviewRefund(id:string,decision:"approved"|"rejected"){if(!supabase)return;const note=prompt(decision==="approved"?"Approval note (optional)":"Reason for rejection (at least 3 characters)");if(note===null)return;setBusy(true);const{error}=await supabase.rpc("review_finance_refund",{p_refund:id,p_decision:decision,p_note:note||null});setBusy(false);setNotice(error?.message||`Refund ${decision}.`);await load()}
  async function processRefund(id:string){if(!supabase)return;const reference=prompt("Enter the provider/bank refund reference after the money has actually been returned");if(!reference?.trim())return;setBusy(true);const{error}=await supabase.rpc("mark_finance_refund_processed",{p_refund:id,p_provider_reference:reference.trim()});setBusy(false);setNotice(error?.message||"Refund marked processed and audit trail recorded.");await load()}

  async function saveBank(){if(!supabase||!profile)return;if(!bank.bank_name.trim()||!bank.account_name.trim()||!/^[0-9]{10}$/.test(bank.account_number.trim()))return setNotice("Enter the bank name, account holder and a 10-digit account number.");setBusy(true);const{error}=await supabase.from("ihlink_bank_accounts").insert({...bank,bank_name:bank.bank_name.trim(),account_name:bank.account_name.trim(),account_number:bank.account_number.trim(),is_active:true,is_default:banks.length===0,created_by:profile.id});setBusy(false);setNotice(error?.message||"IHLink bank account saved.");if(!error){setBank({label:"IHLink Main Account",bank_name:"",account_name:"",account_number:""});await load()}}
  async function openTransferProof(path:string|null){if(!supabase||!path)return;const{data,error}=await supabase.storage.from("direct-transfer-proofs").createSignedUrl(path,300);if(error)return setNotice(error.message);window.open(data.signedUrl,"_blank","noopener,noreferrer")}
  async function reviewTransfer(id:string,status:"approved"|"rejected"){if(!supabase||!profile)return;const note=prompt(status==="approved"?"Finance verification / reconciliation note (at least 3 characters)":"Reason for rejection (at least 3 characters)");if(note===null)return;if(note.trim().length<3)return setNotice("Enter a Finance verification or rejection note of at least 3 characters.");setBusy(true);const{error}=await supabase.rpc("review_direct_bank_transfer",{p_submission:id,p_decision:status,p_note:note||null});setBusy(false);setNotice(error?.message||`Direct transfer ${status}. The linked invoice or service subscription has been reconciled where applicable.`);await load()}

  function exportCsv() {
    const header = [
      "Reference",
      "Platform",
      "Source",
      "Description",
      "Amount",
      "Direction",
      "Status",
      "Date",
    ];
    const data = visible.map((r) => [
      r.reference,
      r.product,
      r.source,
      r.description,
      r.amount,
      r.direction,
      r.status,
      r.created_at,
    ]);
    const csv = [header, ...data]
      .map((line) =>
        line.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ihlink-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModulePage
      product="corporate"
      sections={adminSections}
      title="Finance & Billing"
      eyebrow="Central Administration"
      description="Monitor real cross-platform payment activity while separating IHLink revenue, customer wallet funds and school-owned fee collections."
      userName={profile?.first_name || "Administrator"}
      userRole="Finance Administrator"
      primaryAction="Live Finance Control"
      metrics={[
        { label: "Company gross inflow", value: money(companyGross) },
        { label: "Company debits", value: money(companyDebits) },
        { label: "Pending company flow", value: money(pendingAmount) },
        { label: "School collections", value: money(schoolVolume) },
      ]}
    >
      <InvoiceWorkbench />
      {notice && (
        <div className="rounded-xl border bg-white p-3 text-sm">{notice}</div>
      )}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              "all",
              "datasub",
              "schoolpro",
              "consult",
              "host",
              "engineering",
              "business_centre",
              "print",
              "fabrication",
              "compute",
              "academy",
              "digital_business",
              "corporate",
            ].map((v) => (
              <Button
                key={v}
                size="sm"
                variant={filter === v ? "primary" : "secondary"}
                onClick={() => setFilter(v)}
              >
                {v}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void load()}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Reference",
                  "Platform / source",
                  "Description",
                  "Amount",
                  "Classification",
                  "Status",
                  "Date",
                ].map((h) => (
                  <th key={h} className="p-4 text-xs uppercase text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={`${r.source}-${r.id}`} className="border-t">
                  <td className="p-4 font-semibold">{r.reference}</td>
                  <td className="p-4 capitalize">
                    {r.product}
                    <p className="text-xs text-muted">{r.source}</p>
                  </td>
                  <td className="p-4">{r.description}</td>
                  <td
                    className={`p-4 font-bold ${r.direction === "debit" ? "text-rose-600" : "text-emerald-700"}`}
                  >
                    {r.direction === "debit" ? "−" : "+"}
                    {money(r.amount)}
                  </td>
                  <td className="p-4">
                    {badge(
                      r.classification.replaceAll("_", " "),
                      r.classification === "company" ? "blue" : "amber",
                    )}
                  </td>
                  <td className="p-4">
                    {badge(
                      r.status,
                      ok(r.status)
                        ? "green"
                        : pending(r.status)
                          ? "amber"
                          : "red",
                    )}
                  </td>
                  <td className="p-4 text-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No finance records in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2"><Card><h3 className="font-bold">IHLink direct-transfer bank accounts</h3><p className="mt-1 text-xs text-muted">These accounts are for IHLink-owned services only. School fee collection remains school-owned.</p><div className="mt-4 grid gap-3"><input className={input} placeholder="Bank name" value={bank.bank_name} onChange={e=>setBank({...bank,bank_name:e.target.value})}/><input className={input} placeholder="Account name" value={bank.account_name} onChange={e=>setBank({...bank,account_name:e.target.value})}/><input className={input} placeholder="Account number" value={bank.account_number} onChange={e=>setBank({...bank,account_number:e.target.value})}/><Button disabled={busy} onClick={()=>void saveBank()}>Add bank account</Button></div><div className="mt-4 divide-y">{banks.map(x=><div className="py-3 text-sm" key={x.id}><b>{x.bank_name} · {x.account_number}</b><p>{x.account_name} {x.is_default?"· Default":""}</p></div>)}</div></Card><Card><h3 className="font-bold">Direct transfers awaiting verification</h3><div className="mt-4 divide-y">{transfers.filter(x=>x.status==="awaiting_verification").map(x=><div className="py-4" key={x.id}><div className="flex justify-between gap-3"><div><b>{x.customer_reference}</b><p className="text-xs text-muted">{x.platform_code} · {x.source_reference} · {x.sender_name}{x.sender_bank?` · ${x.sender_bank}`:""}</p></div><b>{money(x.amount)}</b></div><p className="mt-2 text-xs font-bold">Receiving account: {banks.find(b=>b.id===x.bank_account_id)?.bank_name||"Account unavailable"} · {banks.find(b=>b.id===x.bank_account_id)?.account_number||"Finance review required"}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={!x.proof_storage_path} onClick={()=>void openTransferProof(x.proof_storage_path)}>Open receipt / proof</Button><Button size="sm" disabled={busy||!x.proof_storage_path} onClick={()=>void reviewTransfer(x.id,"approved")}>Approve & reconcile</Button><Button size="sm" variant="danger" disabled={busy} onClick={()=>void reviewTransfer(x.id,"rejected")}>Reject</Button></div></div>)}{!transfers.some(x=>x.status==="awaiting_verification")&&<p className="py-5 text-sm text-muted">No direct transfers awaiting verification.</p>}</div></Card></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-bold">Manual ledger entry</h3>
          <p className="mt-1 text-xs text-muted">
            For Corporate, DataSub, SchoolPro, Consult, Hosting, Engineering and every Business & Innovation unit when an entry is not generated automatically by another module.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              className={input}
              value={entry.product}
              onChange={(e) => setEntry({ ...entry, product: e.target.value })}
            >
              {[
                "corporate",
                "datasub",
                "schoolpro",
                "consult",
                "host",
                "engineering",
                "business_centre",
                "print",
                "fabrication",
                "compute",
                "academy",
                "digital_business",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className={input}
              value={entry.direction}
              onChange={(e) =>
                setEntry({ ...entry, direction: e.target.value })
              }
            >
              <option value="credit">Credit / inflow</option>
              <option value="debit">Debit / outflow</option>
            </select>
            <select
              className={input}
              value={entry.entry_type}
              onChange={(e) =>
                setEntry({ ...entry, entry_type: e.target.value })
              }
            >
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
              <option value="settlement">Settlement</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <input
              className={input}
              placeholder="External reference (optional)"
              value={entry.reference}
              onChange={(e) =>
                setEntry({ ...entry, reference: e.target.value })
              }
            />
            <input
              type="number"
              min="1"
              className={input}
              placeholder="Amount"
              value={entry.amount}
              onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
            />
            <input
              className={input}
              placeholder="Description"
              value={entry.description}
              onChange={(e) =>
                setEntry({ ...entry, description: e.target.value })
              }
            />
          </div>
          <Button
            className="mt-4"
            disabled={busy}
            onClick={() => void addEntry()}
          >
            Submit for approval
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">Automatic refund queue</h3>
          <p className="mt-1 text-sm text-muted">Refund requests are created from verified settled payments when paid fulfilment fails. Finance cannot manually change the customer, platform, source reference or amount.</p>
          <p className="mt-3 text-xs text-muted">Review queued refunds below. Processing requires the actual provider/bank refund reference.</p>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-bold">Pending ledger approvals</h3>
          <div className="mt-4 divide-y">
            {ledger
              .filter((x) =>
                ["draft", "pending", "approved"].includes(x.status),
              )
              .map((x) => (
                <div key={x.id} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{x.description}</b>
                      <p className="text-xs text-muted">
                        {x.reference} · {x.product} · {x.entry_type}
                      </p>
                    </div>
                    <b>{money(x.amount)}</b>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void updateLedger(x.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void updateLedger(x.id, "posted")}
                    >
                      Post
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void updateLedger(x.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            {!ledger.some((x) =>
              ["draft", "pending", "approved"].includes(x.status),
            ) && (
              <p className="py-5 text-sm text-muted">
                No ledger approvals pending.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">Refund workflow</h3>
          <div className="mt-4 divide-y">
            {refunds.map((x) => (
              <div key={x.id} className="py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <b>{x.refund_number}</b>
                    <p className="text-xs text-muted">
                      {x.product} · {x.source_reference} · {x.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <b>{money(x.amount)}</b>
                    <div>
                      {badge(
                        x.status,
                        x.status === "processed"
                          ? "green"
                          : x.status === "rejected"
                            ? "red"
                            : "amber",
                      )}
                    </div>
                  </div>
                </div>
                {!["processed", "rejected"].includes(x.status) && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void reviewRefund(x.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void processRefund(x.id)}
                    >
                      Mark processed
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void reviewRefund(x.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {!refunds.length && (
              <p className="py-5 text-sm text-muted">No refund requests.</p>
            )}
          </div>
        </Card>
      </div>
    </ModulePage>
  );
}
