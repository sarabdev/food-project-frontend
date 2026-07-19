import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, Boxes, CircleDollarSign, FileCheck2, PackageCheck,
  Plus, RefreshCw, TrendingUp, UsersRound, WalletCards
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const emptyData = {
  stats: {},
  financialSummary: [],
  statusSummary: [],
  monthlyExports: [],
  recentOrders: [],
  recentPayments: [],
  generatedAt: null
};

export function DashboardPage() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { can } = useAuth();

  async function load({ refresh = false } = {}) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/dashboard");
      setData(response);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: "All export orders", value: data.stats.total || 0, helper: `${data.stats.drafts || 0} drafts`, icon: FileCheck2, color: "bg-forest-50 text-forest-700" },
    { label: "Active orders", value: data.stats.active || 0, helper: "Confirmed through ready", icon: PackageCheck, color: "bg-blue-50 text-blue-700" },
    { label: "Completed shipments", value: Number(data.stats.shipped || 0) + Number(data.stats.completed || 0), helper: `${data.stats.ready_to_ship || 0} ready to ship`, icon: TrendingUp, color: "bg-violet-50 text-violet-700" },
    { label: "Active clients", value: data.stats.clients || 0, helper: `${data.stats.products || 0} active products`, icon: UsersRound, color: "bg-amber-50 text-amber-700" }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Live overview"
        title="Export operations"
        description={data.generatedAt ? `Live database snapshot · Updated ${formatTime(data.generatedAt)}` : "Orders, collections and outstanding balances from the live database."}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => load({ refresh: true })} disabled={refreshing}>
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing..." : "Refresh"}
            </button>
            {can("orders.create") && <Link to="/orders/new" className="btn-primary"><Plus size={18} /> New export order</Link>}
          </div>
        }
      />

      {error && (
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{error}</span>
          <button className="font-bold underline" onClick={() => load()}>Try again</button>
        </div>
      )}

      {loading ? <DashboardLoading /> : (
        <>
          {Number(data.stats.low_stock_products || 0) > 0 && (
            <Link to="/products" className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle size={20} />
              <span className="flex-1 font-semibold">{data.stats.low_stock_products} product{Number(data.stats.low_stock_products) === 1 ? "" : "s"} at or below the stock alert level.</span>
              <span className="font-bold">View stock</span>
            </Link>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, helper, icon: Icon, color }) => (
              <div key={label} className="panel p-5">
                <div className="flex items-start justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon size={21} /></div>
                  <div className="text-3xl font-bold">{Number(value).toLocaleString()}</div>
                </div>
                <div className="mt-5 text-sm font-bold">{label}</div>
                <div className="mt-1 text-xs text-slate-400">{helper}</div>
              </div>
            ))}
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between">
              <div><h2 className="text-lg font-bold">Financial position</h2><p className="text-xs text-slate-500">Currencies are always kept separate.</p></div>
              {can("reports.view") && <Link to="/reports" className="text-sm font-semibold text-forest-700">Open reports</Link>}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.financialSummary.map((summary) => (
                <article key={summary.currency} className="panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{summary.currency} account</span>
                    <CircleDollarSign size={20} className="text-forest-600" />
                  </div>
                  <div className="mt-4 text-2xl font-bold">{money(summary.total_amount, summary.currency)}</div>
                  <div className="mt-1 text-xs text-slate-400">{summary.order_count} non-cancelled orders</div>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                    <Metric label="Received" value={money(summary.paid_amount, summary.currency)} />
                    <Metric label="Outstanding" value={money(summary.remaining_amount, summary.currency)} warning />
                  </div>
                </article>
              ))}
              {!data.financialSummary.length && <div className="panel py-14 text-center text-sm text-slate-400">No financial order data yet.</div>}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
            <section className="panel p-5 md:p-6">
              <div><h2 className="font-bold">Six-month export value</h2><p className="mt-1 text-xs text-slate-500">Live commercial order totals by month and currency.</p></div>
              <MonthlyExportChart rows={data.monthlyExports} />
            </section>
            <section className="panel p-5 md:p-6">
              <div><h2 className="font-bold">Order pipeline</h2><p className="mt-1 text-xs text-slate-500">Current status of every export order.</p></div>
              <StatusBreakdown rows={data.statusSummary} />
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
            <RecentOrders orders={data.recentOrders} />
            <RecentPayments payments={data.recentPayments} canViewLedger={can("ledger.view")} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MasterStat icon={Boxes} label="Active products" value={data.stats.products} to="/products" />
            <MasterStat icon={UsersRound} label="Active clients" value={data.stats.clients} to="/parties" />
            <MasterStat icon={FileCheck2} label="System users" value={data.stats.users} to={can("users.view") ? "/users" : null} />
          </div>
        </>
      )}
    </>
  );
}

function MonthlyExportChart({ rows }) {
  const grouped = useMemo(() => {
    const result = {};
    for (const row of rows) (result[row.currency] ||= []).push(row);
    return result;
  }, [rows]);

  return (
    <div className="mt-6 space-y-7">
      {Object.entries(grouped).map(([currency, currencyRows]) => {
        const max = Math.max(...currencyRows.map((row) => Number(row.total_amount)), 1);
        return (
          <div key={currency}>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{currency}</div>
            <div className="grid min-h-44 items-end gap-2" style={{ gridTemplateColumns: `repeat(${currencyRows.length}, minmax(42px, 1fr))` }} role="img" aria-label={`${currency} export values for the last six months`}>
              {currencyRows.map((row) => {
                const height = Math.max(4, Number(row.total_amount) / max * 120);
                return (
                  <div key={row.month} className="flex min-w-0 flex-col items-center justify-end">
                    <div className="mb-2 text-center text-[10px] font-semibold text-slate-500">{compactMoney(row.total_amount)}</div>
                    <div className="w-full max-w-14 rounded-t-lg bg-forest-600" style={{ height }} title={`${row.month}: ${money(row.total_amount, currency)}`} />
                    <div className="mt-2 text-[10px] text-slate-400">{monthLabel(row.month)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {!rows.length && <div className="py-16 text-center text-sm text-slate-400">No export values in the last six months.</div>}
    </div>
  );
}

function StatusBreakdown({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.order_count), 0);
  return (
    <div className="mt-6 space-y-4">
      {rows.map((row) => {
        const percentage = total ? Number(row.order_count) / total * 100 : 0;
        return (
          <div key={row.status}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold capitalize text-slate-600">{row.status.replaceAll("_", " ")}</span>
              <span><strong>{row.order_count}</strong> <span className="text-slate-400">· {Math.round(percentage)}%</span></span>
            </div>
            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-forest-600" style={{ width: `${percentage}%` }} /></div>
          </div>
        );
      })}
      {!rows.length && <div className="py-16 text-center text-sm text-slate-400">No orders available.</div>}
    </div>
  );
}

function RecentOrders({ orders }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 className="font-bold">Recent orders</h2><p className="text-xs text-slate-500">Latest order values and balances</p></div>
        <Link to="/orders" className="text-sm font-semibold text-forest-700">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Order value</th><th className="px-5 py-3 text-right">Outstanding</th><th /></tr></thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-4"><div className="font-semibold">{order.invoice_number}</div><div className="text-xs text-slate-400">{formatDate(order.contract_date)}</div></td>
                <td className="px-5 py-4 text-slate-600">{order.client_name}</td>
                <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                <td className="px-5 py-4 text-right font-semibold">{money(order.order_total, order.currency)}</td>
                <td className="px-5 py-4 text-right font-semibold text-amber-700">{money(order.remaining_amount, order.currency)}</td>
                <td className="pr-5 text-right"><Link to={`/orders/${order.id}`} className="inline-grid h-9 w-9 place-items-center rounded-lg hover:bg-forest-50 hover:text-forest-700"><ArrowUpRight size={17} /></Link></td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-400">No export orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentPayments({ payments, canViewLedger }) {
  return (
    <aside className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 className="font-bold">Latest receipts</h2><p className="text-xs text-slate-500">Manually recorded payments</p></div>
        {canViewLedger && <Link to="/ledger" className="text-sm font-semibold text-forest-700">Ledger</Link>}
      </div>
      <div className="divide-y">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center gap-3 px-5 py-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><WalletCards size={18} /></div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{payment.client_name}</div><div className="truncate text-xs text-slate-400">{payment.invoice_number} · {formatDate(payment.payment_date)}</div></div>
            <div className="text-right"><div className="text-sm font-bold text-forest-700">{money(payment.amount, payment.currency)}</div><div className="text-[10px] text-slate-400">{payment.reference_number || "No reference"}</div></div>
          </div>
        ))}
        {!payments.length && <div className="px-5 py-12 text-center text-sm text-slate-400">No later receipts recorded.</div>}
      </div>
    </aside>
  );
}

function MasterStat({ icon: Icon, label, value, to }) {
  const content = <><div className="grid h-10 w-10 place-items-center rounded-xl bg-sand text-forest-800"><Icon size={19} /></div><div className="flex-1"><div className="text-xs text-slate-400">{label}</div><div className="text-xl font-bold">{Number(value || 0).toLocaleString()}</div></div>{to && <ArrowUpRight size={17} className="text-slate-300" />}</>;
  return to ? <Link to={to} className="panel flex items-center gap-4 p-4 transition hover:border-forest-300">{content}</Link> : <div className="panel flex items-center gap-4 p-4">{content}</div>;
}

function Metric({ label, value, warning }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className={`mt-1 text-sm font-bold ${warning ? "text-amber-700" : "text-ink"}`}>{value}</div></div>;
}

function DashboardLoading() {
  return <div className="panel grid min-h-80 place-items-center"><div className="text-center text-sm text-slate-400"><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" />Loading live dashboard...</div></div>;
}

function money(value, currency = "USD") {
  return `${currency || "USD"} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function compactMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}m`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function formatDate(value) { return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"; }
function formatTime(value) { return new Date(value).toLocaleString(); }
function monthLabel(value) { return new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" }); }
