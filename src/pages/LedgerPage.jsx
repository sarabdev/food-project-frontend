import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Banknote, CalendarDays, CheckCircle2,
  ChevronRight, CircleDollarSign, Landmark, ReceiptText, Search, WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const today = new Date().toISOString().slice(0, 10);
const emptyPayment = {
  order_id: "",
  amount: "",
  payment_date: today,
  reference_number: "",
  notes: ""
};

export function LedgerPage() {
  const [parties, setParties] = useState([]);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState(emptyPayment);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { can } = useAuth();

  async function loadSummary() {
    const { data } = await api.get("/ledger");
    setParties(data.parties);
  }

  async function loadDetail(partyId, keepOrder = false) {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/ledger/parties/${partyId}`);
      setDetail(data);
      setPayment((current) => {
        const currentOrder = keepOrder && data.orders.some(
          (order) => String(order.id) === String(current.order_id)
            && Number(order.remaining_amount) > 0.004
        );
        return currentOrder
          ? current
          : { ...emptyPayment, payment_date: current.payment_date || today };
      });
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadSummary()
      .catch((requestError) => setError(messageFromError(requestError)))
      .finally(() => setLoading(false));
  }, []);

  const filteredParties = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return parties;
    return parties.filter((party) =>
      [party.name, party.country].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [parties, search]);

  const overview = useMemo(() => {
    const currencies = new Set();
    let openClients = 0;
    let orders = 0;
    for (const party of parties) {
      let hasBalance = false;
      for (const balance of party.balances) {
        currencies.add(balance.currency);
        orders += Number(balance.order_count);
        if (Number(balance.remaining_amount) > 0.004) hasBalance = true;
      }
      if (hasBalance) openClients += 1;
    }
    return { currencies: currencies.size, openClients, orders };
  }, [parties]);

  const detailBalances = useMemo(() => groupOrderBalances(detail?.orders || []), [detail]);
  const selectedOrder = detail?.orders.find(
    (order) => String(order.id) === String(payment.order_id)
  );
  const outstandingOrders = detail?.orders.filter(
    (order) => Number(order.remaining_amount) > 0.004
  ) || [];

  async function openLedger(partyId) {
    setError("");
    setSuccess("");
    setDetail(null);
    await loadDetail(partyId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeLedger() {
    setDetail(null);
    setPayment(emptyPayment);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function recordPayment(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/ledger/payments", payment);
      await Promise.all([loadSummary(), loadDetail(detail.party.id)]);
      setSuccess("Payment recorded. The order and client balances are now updated.");
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (detailLoading) {
    return (
      <>
        <PageHeader eyebrow="Accounts" title="Opening client ledger" description="Loading orders and payment history..." />
        <div className="panel grid min-h-72 place-items-center">
          <div className="text-center text-slate-400">
            <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" />
            Preparing ledger...
          </div>
        </div>
      </>
    );
  }

  if (detail) {
    return (
      <ClientLedger
        detail={detail}
        balances={detailBalances}
        outstandingOrders={outstandingOrders}
        selectedOrder={selectedOrder}
        payment={payment}
        setPayment={setPayment}
        saving={saving}
        error={error}
        success={success}
        canRecord={can("ledger.record_payment")}
        onBack={closeLedger}
        onSubmit={recordPayment}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Party ledger"
        description="See what every client has ordered, paid and still owes."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard icon={Landmark} label="Active clients" value={parties.length} helper="Client accounts" />
        <OverviewCard icon={WalletCards} label="Open balances" value={overview.openClients} helper="Clients with amount due" warning />
        <OverviewCard icon={ReceiptText} label="Export orders" value={overview.orders} helper="Across all client ledgers" />
        <OverviewCard icon={CircleDollarSign} label="Currencies" value={overview.currencies} helper="Kept separate for accuracy" />
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
          <div>
            <h2 className="text-lg font-bold">Client accounts</h2>
            <p className="mt-1 text-sm text-slate-500">Select a client to open their complete ledger.</p>
          </div>
          <label className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="field pl-11"
              placeholder="Search client or country..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-2">
          {filteredParties.map((party) => (
            <ClientCard key={party.id} party={party} onOpen={() => openLedger(party.id)} />
          ))}
        </div>

        {loading && <EmptyState icon={Landmark} text="Loading client accounts..." />}
        {!loading && !filteredParties.length && (
          <EmptyState icon={Search} text={search ? "No clients match your search." : "No client accounts yet."} />
        )}
      </section>
    </>
  );
}

function ClientLedger({
  detail, balances, outstandingOrders, selectedOrder, payment, setPayment,
  saving, error, success, canRecord, onBack, onSubmit
}) {
  const paymentHistory = [
    ...detail.orders
      .filter((order) => Number(order.opening_advance) > 0.004)
      .map((order) => ({
        id: `advance-${order.id}`,
        order_id: order.id,
        payment_date: order.contract_date,
        amount: order.opening_advance,
        reference_number: `Advance ${compact(order.advance_percentage)}%`,
        notes: "Opening advance calculated from the export order.",
        recorded_by: "Export order",
        is_opening_advance: true
      })),
    ...detail.payments.map((receipt) => ({ ...receipt, is_opening_advance: false }))
  ].sort((left, right) => {
    const dateDifference = String(right.payment_date).localeCompare(String(left.payment_date));
    if (dateDifference) return dateDifference;
    return String(right.id).localeCompare(String(left.id));
  });

  return (
    <>
      <PageHeader
        eyebrow="Client account"
        title={detail.party.name}
        description="Order balances, received payments and transaction history in one place."
        action={
          <button className="btn-secondary" onClick={onBack} data-testid="back-to-clients">
            <ArrowLeft size={17} /> All clients
          </button>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="success">{success}</Notice>}

      <section className="overflow-hidden rounded-2xl bg-forest-900 text-white shadow-panel">
        <div className="grid gap-7 p-6 md:p-8 xl:grid-cols-[1fr_2fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Account overview</div>
            <h2 className="mt-2 text-2xl font-bold">{detail.party.name}</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {[detail.party.contact_person, detail.party.phone, detail.party.email, detail.party.country]
                .filter(Boolean).join(" · ") || "No contact information added"}
            </p>
            <div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75">
              {detail.orders.length} export {detail.orders.length === 1 ? "order" : "orders"}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {balances.map((balance) => (
              <div key={balance.currency} className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/55">{balance.currency} account</div>
                  <Banknote size={18} className="text-emerald-300" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <DarkMetric label="Order value" value={money(balance.total, balance.currency)} />
                  <DarkMetric label="Received" value={money(balance.paid, balance.currency)} />
                  <DarkMetric label="Still due" value={money(balance.remaining, balance.currency)} highlight />
                </div>
              </div>
            ))}
            {!balances.length && <div className="text-sm text-white/50">No export orders for this client.</div>}
          </div>
        </div>
      </section>

      <div className={`mt-6 grid items-start gap-6 ${canRecord ? "xl:grid-cols-[1.35fr_0.85fr]" : ""}`}>
        <section className="panel overflow-hidden">
          <SectionTitle
            icon={ReceiptText}
            title="Export orders"
            description="Each order shows exactly how much has been settled."
          />
          <div className="divide-y">
            {detail.orders.map((order) => <OrderBalance key={order.id} order={order} />)}
          </div>
          {!detail.orders.length && <EmptyState icon={ReceiptText} text="No export orders for this client." />}
        </section>

        {canRecord && (
          <section className="panel p-5 md:p-6 xl:sticky xl:top-24">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700">
                <WalletCards size={20} />
              </div>
              <div>
                <h2 className="font-bold">Record a payment</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Apply a received amount to one outstanding export order.</p>
              </div>
            </div>

            {outstandingOrders.length ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <label>
                  <span className="label">Export order</span>
                  <select
                    className="field"
                    required
                    value={payment.order_id}
                    onChange={(event) => setPayment({ ...payment, order_id: event.target.value, amount: "" })}
                  >
                    <option value="">Choose order...</option>
                    {outstandingOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.invoice_number} · {money(order.remaining_amount, order.currency)} due
                      </option>
                    ))}
                  </select>
                </label>

                {selectedOrder && (
                  <div className="rounded-xl bg-amber-50 p-3 text-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Outstanding balance</div>
                    <div className="mt-1 text-lg font-bold text-amber-800">
                      {money(selectedOrder.remaining_amount, selectedOrder.currency)}
                    </div>
                  </div>
                )}

                <label>
                  <span className="label">Amount received</span>
                  <div className="flex gap-2">
                    <input
                      className="field"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={selectedOrder ? Number(selectedOrder.remaining_amount).toFixed(2) : undefined}
                      value={payment.amount}
                      onChange={(event) => setPayment({ ...payment, amount: event.target.value })}
                    />
                    {selectedOrder && (
                      <button
                        type="button"
                        className="btn-secondary shrink-0 px-3"
                        onClick={() => setPayment({
                          ...payment,
                          amount: Number(selectedOrder.remaining_amount).toFixed(2)
                        })}
                      >
                        Pay full
                      </button>
                    )}
                  </div>
                </label>

                <label>
                  <span className="label">Payment date</span>
                  <input
                    className="field"
                    required
                    type="date"
                    value={payment.payment_date}
                    onChange={(event) => setPayment({ ...payment, payment_date: event.target.value })}
                  />
                </label>

                <label>
                  <span className="label">Reference / transaction no.</span>
                  <input
                    className="field"
                    value={payment.reference_number}
                    onChange={(event) => setPayment({ ...payment, reference_number: event.target.value })}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <span className="label">Notes</span>
                  <textarea
                    className="field min-h-20 resize-y"
                    value={payment.notes}
                    onChange={(event) => setPayment({ ...payment, notes: event.target.value })}
                    placeholder="Bank or remittance details"
                  />
                </label>

                <button className="btn-primary w-full" disabled={saving || !payment.order_id}>
                  <WalletCards size={18} /> {saving ? "Recording payment..." : "Record payment"}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-forest-50 p-5 text-center">
                <CheckCircle2 className="mx-auto text-forest-600" />
                <div className="mt-2 font-bold text-forest-800">All orders are paid</div>
                <p className="mt-1 text-xs text-forest-600">There is no outstanding balance for this client.</p>
              </div>
            )}
          </section>
        )}
      </div>

      <section className="panel mt-6 overflow-hidden">
        <SectionTitle
          icon={Landmark}
          title="Payment history"
          description="Opening advances from export orders and every later received payment."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Payment date</th>
                <th className="px-5 py-3">Export order</th>
                <th className="px-5 py-3">Payment type</th>
                <th className="px-5 py-3">Amount received</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paymentHistory.map((receipt) => {
                const order = detail.orders.find((item) => item.id === receipt.order_id);
                return (
                  <tr key={receipt.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" />{formatDate(receipt.payment_date)}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold">{order?.invoice_number || `Order #${receipt.order_id}`}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        receipt.is_opening_advance
                          ? "bg-amber-50 text-amber-700"
                          : "bg-forest-50 text-forest-700"
                      }`}>
                        {receipt.is_opening_advance ? "Opening advance" : "Later receipt"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-forest-700">{money(receipt.amount, order?.currency)}</td>
                    <td className="px-5 py-4">{receipt.reference_number || "—"}</td>
                    <td className="max-w-xs px-5 py-4 text-slate-500">{receipt.notes || "—"}</td>
                    <td className="px-5 py-4">{receipt.recorded_by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!paymentHistory.length && <EmptyState icon={Landmark} text="No advances or later payments are available." />}
      </section>
    </>
  );
}

function ClientCard({ party, onOpen }) {
  const orderCount = party.balances.reduce(
    (sum, balance) => sum + Number(balance.order_count), 0
  );
  const hasOutstanding = party.balances.some(
    (balance) => Number(balance.remaining_amount) > 0.004
  );

  return (
    <article className="group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-panel">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-50 font-bold text-forest-700">
          {party.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="truncate text-lg font-bold">{party.name}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{party.country || "Country not set"} · {orderCount} {orderCount === 1 ? "order" : "orders"}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${hasOutstanding ? "bg-amber-50 text-amber-700" : "bg-forest-50 text-forest-700"}`}>
              {hasOutstanding ? "Payment due" : "Settled"}
            </span>
          </div>

          <div className="mt-5 space-y-2">
            {party.balances.map((balance) => (
              <div key={balance.currency} className="grid grid-cols-[54px_1fr_1fr] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <span className="font-bold text-slate-500">{balance.currency}</span>
                <span>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Paid</span>
                  <strong className="text-forest-700">{amount(balance.paid_amount)}</strong>
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Remaining</span>
                  <strong className={Number(balance.remaining_amount) > 0.004 ? "text-amber-700" : "text-slate-600"}>
                    {amount(balance.remaining_amount)}
                  </strong>
                </span>
              </div>
            ))}
            {!party.balances.length && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-400">No export orders yet.</div>}
          </div>
        </div>
      </div>

      <button
        className="mt-5 flex w-full items-center justify-between border-t pt-4 text-sm font-bold text-forest-700"
        onClick={onOpen}
        data-testid={`open-ledger-${party.id}`}
      >
        <span>Open client ledger</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-forest-50 transition group-hover:bg-forest-700 group-hover:text-white">
          <ArrowRight size={16} />
        </span>
      </button>
    </article>
  );
}

function OrderBalance({ order }) {
  const total = Number(order.order_total);
  const paid = Number(order.paid_amount);
  const percentage = total > 0 ? Math.min(100, paid / total * 100) : 0;

  return (
    <article className="p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <ReceiptText size={18} />
          </div>
          <div>
            <Link to={`/orders/${order.id}`} className="font-bold text-forest-800 hover:underline">{order.invoice_number}</Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{formatDate(order.contract_date)}</span>
              <span>•</span>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </div>
        <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
          View order <ChevronRight size={16} />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OrderMetric label="Order total" value={money(order.order_total, order.currency)} />
        <OrderMetric label={`Opening advance · ${compact(order.advance_percentage)}%`} value={money(order.opening_advance, order.currency)} />
        <OrderMetric label="Later receipts" value={money(order.additional_received, order.currency)} />
        <OrderMetric label="Remaining" value={money(order.remaining_amount, order.currency)} warning={Number(order.remaining_amount) > 0.004} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500">{compact(percentage)}% paid</span>
          <span className="text-slate-400">{money(order.paid_amount, order.currency)} received</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-forest-600" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </article>
  );
}

function OverviewCard({ icon: Icon, label, value, helper, warning }) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${warning ? "bg-amber-50 text-amber-700" : "bg-forest-50 text-forest-700"}`}>
        <Icon size={21} />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 text-2xl font-bold">{value}</div>
        <div className="text-xs text-slate-400">{helper}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b px-5 py-4 md:px-6">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={17} /></div>
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function OrderMetric({ label, value, warning }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-bold ${warning ? "text-amber-700" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function DarkMetric({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-white/45">{label}</div>
      <div className={`mt-1 text-sm font-bold md:text-base ${highlight ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Notice({ tone, children }) {
  const success = tone === "success";
  return (
    <div className={`mb-5 rounded-xl border p-4 text-sm ${success ? "border-forest-200 bg-forest-50 text-forest-700" : "border-red-200 bg-red-50 text-red-700"}`}>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="px-5 py-14 text-center text-sm text-slate-400">
      <Icon className="mx-auto mb-3" />{text}
    </div>
  );
}

function groupOrderBalances(orders) {
  const grouped = new Map();
  for (const order of orders) {
    const current = grouped.get(order.currency) || {
      currency: order.currency,
      total: 0,
      paid: 0,
      remaining: 0
    };
    current.total += Number(order.order_total);
    current.paid += Number(order.paid_amount);
    current.remaining += Number(order.remaining_amount);
    grouped.set(order.currency, current);
  }
  return [...grouped.values()];
}

function money(value, currency = "USD") {
  return `${currency || "USD"} ${amount(value)}`;
}

function amount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function compact(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString();
}
