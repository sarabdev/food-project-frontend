import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, CalendarRange, Download, FileBarChart2, Filter,
  Landmark, Printer, ReceiptText, RefreshCw, TrendingUp, WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api, messageFromError } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);
const yearStart = `${today.slice(0, 4)}-01-01`;
const initialFilters = {
  date_from: yearStart,
  date_to: today,
  client_id: "",
  status: "",
  currency: ""
};

const reportTabs = [
  { id: "executive", label: "Executive summary", icon: TrendingUp },
  { id: "sales", label: "Sales & orders", icon: FileBarChart2 },
  { id: "receivables", label: "Outstanding", icon: Landmark },
  { id: "statement", label: "Client statement", icon: ReceiptText },
  { id: "payments", label: "Payments", icon: WalletCards }
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState("executive");
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [options, setOptions] = useState({ clients: [], currencies: [], statuses: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/reports/filters")
      .then(({ data: response }) => setOptions(response))
      .catch((requestError) => setError(messageFromError(requestError)));
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeReport, appliedFilters]);

  async function loadReport() {
    if (activeReport === "statement" && !appliedFilters.client_id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = activeReport === "statement"
        ? {}
        : Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value));
      const url = activeReport === "statement"
        ? `/reports/client-statement/${appliedFilters.client_id}`
        : `/reports/${activeReport}`;
      const { data: response } = await api.get(url, { params });
      setData(response);
    } catch (requestError) {
      setError(messageFromError(requestError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function changeReport(reportId) {
    setActiveReport(reportId);
    setData(null);
    setError("");
  }

  return (
    <div className="report-print">
      <PageHeader
        eyebrow="Business intelligence"
        title="Reporting"
        description="Financial and operational reports built directly from export orders and payment records."
      />

      <div className="no-print mb-6 flex gap-2 overflow-x-auto pb-1">
        {reportTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => changeReport(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeReport === id
                ? "bg-forest-800 text-white shadow-panel"
                : "border bg-white text-slate-600 hover:border-forest-400 hover:text-forest-700"
            }`}
          >
            <Icon size={17} />{label}
          </button>
        ))}
      </div>

      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        options={options}
        statementOnly={activeReport === "statement"}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <ReportLoading />}

      {!loading && activeReport === "statement" && !appliedFilters.client_id && (
        <div className="panel mt-6 py-20 text-center">
          <Landmark className="mx-auto text-slate-300" size={34} />
          <h2 className="mt-3 font-bold">Select a client</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a client above to prepare their complete account statement.</p>
        </div>
      )}

      {!loading && data && (
        <div className="mt-6">
          {activeReport === "executive" && <ExecutiveReport data={data} />}
          {activeReport === "sales" && <SalesReport data={data} />}
          {activeReport === "receivables" && <ReceivablesReport data={data} />}
          {activeReport === "statement" && <StatementReport data={data} />}
          {activeReport === "payments" && <PaymentsReport data={data} />}
        </div>
      )}
    </div>
  );
}

function FilterPanel({ filters, setFilters, options, statementOnly, onApply, onReset }) {
  return (
    <form onSubmit={onApply} className="panel no-print p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex items-center gap-3 xl:mr-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-700"><Filter size={18} /></div>
          <div>
            <div className="font-bold">Report filters</div>
            <div className="text-xs text-slate-500">{statementOnly ? "Select the client account" : "Narrow the reporting period and records"}</div>
          </div>
        </div>
        <div className={`grid flex-1 gap-3 ${statementOnly ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-5"}`}>
          {!statementOnly && (
            <>
              <FilterField label="From date">
                <input className="field py-2" type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} />
              </FilterField>
              <FilterField label="To date">
                <input className="field py-2" type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} />
              </FilterField>
            </>
          )}
          <FilterField label="Client">
            <select className="field py-2" value={filters.client_id} onChange={(event) => setFilters({ ...filters, client_id: event.target.value })}>
              <option value="">{statementOnly ? "Select client..." : "All clients"}</option>
              {options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </FilterField>
          {!statementOnly && (
            <>
              <FilterField label="Status">
                <select className="field py-2" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option value="">All statuses</option>
                  {options.statuses.filter((status) => status !== "cancelled").map((status) => (
                    <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Currency">
                <select className="field py-2" value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value })}>
                  <option value="">All currencies</option>
                  {options.currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </FilterField>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-3" onClick={onReset}><RefreshCw size={16} /> Reset</button>
          <button className="btn-primary px-5"><Filter size={16} /> Apply</button>
        </div>
      </div>
    </form>
  );
}

function ExecutiveReport({ data }) {
  const groupedMonths = groupBy(data.monthlySales, "currency");
  return (
    <>
      <ReportHeading title="Executive summary" subtitle="Order value, collections and outstanding balances for the selected period." exportRows={executiveExport(data)} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.currencySummary.map((summary) => (
          <article key={summary.currency} className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{summary.currency} performance</div>
              <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-bold text-forest-700">{summary.order_count} orders</span>
            </div>
            <div className="mt-5 text-2xl font-bold">{money(summary.total_amount, summary.currency)}</div>
            <div className="mt-1 text-xs text-slate-400">Total export value</div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
              <Metric label="Received" value={money(summary.paid_amount, summary.currency)} />
              <Metric label="Outstanding" value={money(summary.remaining_amount, summary.currency)} warning />
            </div>
          </article>
        ))}
      </div>
      {!data.currencySummary.length && <EmptyReport />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <section className="panel p-5 md:p-6">
          <h2 className="font-bold">Monthly export value</h2>
          <p className="mt-1 text-xs text-slate-500">Each currency is charted separately.</p>
          <div className="mt-6 space-y-8">
            {Object.entries(groupedMonths).map(([currency, rows]) => (
              <MonthlyChart key={currency} currency={currency} rows={rows} />
            ))}
            {!data.monthlySales.length && <div className="py-12 text-center text-sm text-slate-400">No monthly sales in this period.</div>}
          </div>
        </section>
        <section className="panel p-5 md:p-6">
          <h2 className="font-bold">Order status</h2>
          <p className="mt-1 text-xs text-slate-500">Current stage of filtered orders.</p>
          <StatusChart rows={data.statusSummary} />
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <SectionHeading title="Top clients" subtitle="Ranked by export value without combining currencies." />
        <Table>
          <thead><tr><Th>Client</Th><Th>Currency</Th><Th>Orders</Th><Th right>Export value</Th><Th right>Outstanding</Th></tr></thead>
          <tbody>{data.topClients.map((row) => (
            <tr key={`${row.client_id}-${row.currency}`}>
              <Td><Link className="font-semibold text-forest-700" to={`/ledger?party=${row.client_id}`}>{row.client_name}</Link></Td>
              <Td>{row.currency}</Td><Td>{row.order_count}</Td>
              <Td right>{money(row.total_amount, row.currency)}</Td>
              <Td right warning>{money(row.remaining_amount, row.currency)}</Td>
            </tr>
          ))}</tbody>
        </Table>
      </section>
    </>
  );
}

function SalesReport({ data }) {
  const summaries = summarizeByCurrency(data.orders, "order_total", "paid_amount", "remaining_amount");
  const rows = data.orders.map((order) => ({
    Date: formatDate(order.contract_date),
    Invoice: order.invoice_number,
    Client: order.client_name,
    Status: order.status,
    Currency: order.currency,
    "Order total": order.order_total,
    "Opening advance": order.opening_advance,
    Received: order.paid_amount,
    Remaining: order.remaining_amount,
    Destination: order.final_destination || order.port_of_destination || ""
  }));
  return (
    <>
      <ReportHeading title="Sales and export orders" subtitle={`${data.orders.length} orders match the selected filters.`} exportRows={rows} />
      <CurrencySummary summaries={summaries} />
      <section className="panel mt-6 overflow-hidden">
        <Table minWidth="1150px">
          <thead><tr><Th>Date / invoice</Th><Th>Client</Th><Th>Status</Th><Th>Destination</Th><Th right>Order total</Th><Th right>Advance</Th><Th right>Received</Th><Th right>Remaining</Th><Th /></tr></thead>
          <tbody>{data.orders.map((order) => (
            <tr key={order.id}>
              <Td><div className="font-semibold">{formatDate(order.contract_date)}</div><div className="text-xs text-slate-400">{order.invoice_number}</div></Td>
              <Td>{order.client_name}</Td><Td><StatusBadge status={order.status} /></Td>
              <Td>{order.final_destination || order.port_of_destination || "—"}</Td>
              <Td right>{money(order.order_total, order.currency)}</Td>
              <Td right>{money(order.opening_advance, order.currency)}</Td>
              <Td right>{money(order.paid_amount, order.currency)}</Td>
              <Td right warning>{money(order.remaining_amount, order.currency)}</Td>
              <Td><Link className="font-semibold text-forest-700" to={`/orders/${order.id}`}>Open</Link></Td>
            </tr>
          ))}</tbody>
        </Table>
        {!data.orders.length && <EmptyReport />}
      </section>
    </>
  );
}

function ReceivablesReport({ data }) {
  const summaries = summarizeByCurrency(data.receivables, "order_total", "paid_amount", "remaining_amount");
  const aging = groupCounts(data.receivables, "aging_bucket");
  const rows = data.receivables.map((item) => ({
    Client: item.client_name,
    Invoice: item.invoice_number,
    Currency: item.currency,
    "Order total": item.order_total,
    Paid: item.paid_amount,
    Outstanding: item.remaining_amount,
    "Days outstanding": item.days_outstanding,
    Aging: item.aging_bucket
  }));
  return (
    <>
      <ReportHeading title="Outstanding receivables" subtitle="Current unpaid order balances and their age." exportRows={rows} />
      <CurrencySummary summaries={summaries} outstandingOnly />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {["Current", "1-30 days", "31-60 days", "61-90 days", "Over 90 days"].map((bucket) => (
          <div key={bucket} className="panel p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{bucket}</div>
            <div className="mt-1 text-2xl font-bold">{aging[bucket] || 0}</div>
            <div className="text-xs text-slate-400">open orders</div>
          </div>
        ))}
      </div>
      <section className="panel mt-6 overflow-hidden">
        <Table minWidth="1050px">
          <thead><tr><Th>Client / invoice</Th><Th>Due reference</Th><Th>Aging</Th><Th right>Order total</Th><Th right>Paid</Th><Th right>Outstanding</Th><Th /></tr></thead>
          <tbody>{data.receivables.map((item) => (
            <tr key={item.id}>
              <Td><div className="font-semibold">{item.client_name}</div><div className="text-xs text-slate-400">{item.invoice_number}</div></Td>
              <Td>{formatDate(item.valid_until || item.contract_date)}</Td>
              <Td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${agingColor(item.aging_bucket)}`}>{item.aging_bucket}</span><div className="mt-1 text-xs text-slate-400">{item.days_outstanding} days</div></Td>
              <Td right>{money(item.order_total, item.currency)}</Td>
              <Td right>{money(item.paid_amount, item.currency)}</Td>
              <Td right warning>{money(item.remaining_amount, item.currency)}</Td>
              <Td><Link className="font-semibold text-forest-700" to={`/orders/${item.id}`}>Open</Link></Td>
            </tr>
          ))}</tbody>
        </Table>
        {!data.receivables.length && <EmptyReport text="No outstanding balances match these filters." />}
      </section>
    </>
  );
}

function StatementReport({ data }) {
  const rows = data.transactions.map((transaction) => ({
    Date: formatDate(transaction.date),
    Invoice: transaction.invoice_number,
    Description: transaction.description,
    Reference: transaction.reference_number || "",
    Currency: transaction.currency,
    Debit: transaction.debit,
    Credit: transaction.credit,
    Balance: transaction.running_balance
  }));
  return (
    <>
      <ReportHeading title={`Client statement · ${data.party.name}`} subtitle={[data.party.contact_person, data.party.phone, data.party.email, data.party.country].filter(Boolean).join(" · ") || "Complete account history"} exportRows={rows} printable />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.summary.map((summary) => (
          <div key={summary.currency} className="panel p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{summary.currency} closing balance</div>
            <div className="mt-2 text-2xl font-bold text-amber-700">{money(summary.closing_balance, summary.currency)}</div>
            <div className="mt-1 text-xs text-slate-400">Amount currently outstanding</div>
          </div>
        ))}
      </div>
      <section className="panel mt-6 overflow-hidden">
        <Table minWidth="1050px">
          <thead><tr><Th>Date</Th><Th>Invoice</Th><Th>Description</Th><Th>Reference</Th><Th right>Debit</Th><Th right>Credit</Th><Th right>Running balance</Th></tr></thead>
          <tbody>{data.transactions.map((transaction) => (
            <tr key={transaction.id}>
              <Td>{formatDate(transaction.date)}</Td>
              <Td><Link className="font-semibold text-forest-700" to={`/orders/${transaction.order_id}`}>{transaction.invoice_number}</Link></Td>
              <Td>{transaction.description}</Td><Td>{transaction.reference_number || "—"}</Td>
              <Td right>{Number(transaction.debit) ? money(transaction.debit, transaction.currency) : "—"}</Td>
              <Td right>{Number(transaction.credit) ? money(transaction.credit, transaction.currency) : "—"}</Td>
              <Td right warning>{money(transaction.running_balance, transaction.currency)}</Td>
            </tr>
          ))}</tbody>
        </Table>
        {!data.transactions.length && <EmptyReport text="This client has no account activity." />}
      </section>
    </>
  );
}

function PaymentsReport({ data }) {
  const totals = summarizeCollections(data.payments);
  const rows = data.payments.map((payment) => ({
    Date: formatDate(payment.payment_date),
    Client: payment.client_name,
    Invoice: payment.invoice_number,
    Type: payment.payment_type,
    Currency: payment.currency,
    Amount: payment.amount,
    Reference: payment.reference_number || "",
    Notes: payment.notes || "",
    "Recorded by": payment.recorded_by
  }));
  return (
    <>
      <ReportHeading title="Payment collections" subtitle="Opening advances and later receipts for the selected period." exportRows={rows} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {totals.map((summary) => (
          <div key={summary.currency} className="panel p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{summary.currency} collected</div>
            <div className="mt-2 text-2xl font-bold text-forest-700">{money(summary.total, summary.currency)}</div>
            <div className="mt-1 text-xs text-slate-400">{summary.count} payment references</div>
          </div>
        ))}
      </div>
      <section className="panel mt-6 overflow-hidden">
        <Table minWidth="1100px">
          <thead><tr><Th>Date</Th><Th>Client / invoice</Th><Th>Type</Th><Th right>Amount</Th><Th>Reference</Th><Th>Notes</Th><Th>Recorded by</Th></tr></thead>
          <tbody>{data.payments.map((payment) => (
            <tr key={payment.id}>
              <Td>{formatDate(payment.payment_date)}</Td>
              <Td><div className="font-semibold">{payment.client_name}</div><div className="text-xs text-slate-400">{payment.invoice_number}</div></Td>
              <Td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${payment.payment_type === "opening_advance" ? "bg-amber-50 text-amber-700" : "bg-forest-50 text-forest-700"}`}>{payment.payment_type === "opening_advance" ? "Opening advance" : "Later receipt"}</span></Td>
              <Td right>{money(payment.amount, payment.currency)}</Td>
              <Td>{payment.reference_number || "—"}</Td><Td>{payment.notes || "—"}</Td><Td>{payment.recorded_by}</Td>
            </tr>
          ))}</tbody>
        </Table>
        {!data.payments.length && <EmptyReport text="No payments match these filters." />}
      </section>
    </>
  );
}

function ReportHeading({ title, subtitle, exportRows, printable = true }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
      <div className="no-print flex gap-2">
        <button className="btn-secondary" onClick={() => downloadCsv(title, exportRows)} disabled={!exportRows.length}><Download size={16} /> Export CSV</button>
        {printable && <button className="btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print</button>}
      </div>
    </div>
  );
}

function MonthlyChart({ currency, rows }) {
  const width = 720;
  const height = 220;
  const padding = { left: 55, right: 18, top: 25, bottom: 42 };
  const max = Math.max(...rows.map((row) => Number(row.total_amount)), 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const slot = plotWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(42, slot * 0.58);
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{currency}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${currency} monthly export value chart`}>
        <title>{currency} monthly export value</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight - plotHeight * ratio;
          return <g key={ratio}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" /><text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{compact(max * ratio)}</text></g>;
        })}
        {rows.map((row, index) => {
          const value = Number(row.total_amount);
          const barHeight = value / max * plotHeight;
          const x = padding.left + index * slot + (slot - barWidth) / 2;
          const y = padding.top + plotHeight - barHeight;
          return <g key={row.month}><rect x={x} y={y} width={barWidth} height={barHeight} rx="5" fill="#106b4c"><title>{row.month}: {money(value, currency)}</title></rect><text x={x + barWidth / 2} y={height - 18} textAnchor="middle" fontSize="10" fill="#64748b">{monthLabel(row.month)}</text></g>;
        })}
      </svg>
    </div>
  );
}

function StatusChart({ rows }) {
  const max = Math.max(...rows.map((row) => Number(row.order_count)), 1);
  return (
    <div className="mt-6 space-y-4">
      {rows.map((row) => (
        <div key={row.status}>
          <div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold capitalize text-slate-600">{row.status.replaceAll("_", " ")}</span><strong>{row.order_count}</strong></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-forest-600" style={{ width: `${Number(row.order_count) / max * 100}%` }} /></div>
        </div>
      ))}
      {!rows.length && <div className="py-12 text-center text-sm text-slate-400">No order statuses available.</div>}
    </div>
  );
}

function CurrencySummary({ summaries, outstandingOnly }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaries.map((summary) => (
        <div key={summary.currency} className="panel p-5">
          <div className="flex justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">{summary.currency}</span><span className="text-xs text-slate-400">{summary.count} orders</span></div>
          {outstandingOnly ? (
            <><div className="mt-3 text-2xl font-bold text-amber-700">{money(summary.remaining, summary.currency)}</div><div className="text-xs text-slate-400">Total outstanding</div></>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3"><Metric label="Total" value={money(summary.total, summary.currency)} /><Metric label="Paid" value={money(summary.paid, summary.currency)} /><Metric label="Remaining" value={money(summary.remaining, summary.currency)} warning /></div>
          )}
        </div>
      ))}
    </div>
  );
}

function Table({ children, minWidth = "800px" }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm" style={{ minWidth }}>{children}</table></div>;
}
function Th({ children, right }) { return <th className={`bg-slate-50 px-5 py-3 text-xs uppercase tracking-wide text-slate-500 ${right ? "text-right" : ""}`}>{children}</th>; }
function Td({ children, right, warning }) { return <td className={`border-t px-5 py-4 ${right ? "text-right font-semibold" : ""} ${warning ? "text-amber-700" : ""}`}>{children}</td>; }
function SectionHeading({ title, subtitle }) { return <div className="border-b px-5 py-4"><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>; }
function FilterField({ label, children }) { return <label><span className="label">{label}</span>{children}</label>; }
function Metric({ label, value, warning }) { return <div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className={`mt-1 text-sm font-bold ${warning ? "text-amber-700" : "text-ink"}`}>{value}</div></div>; }
function ReportLoading() { return <div className="panel mt-6 grid min-h-72 place-items-center text-sm text-slate-400"><div className="text-center"><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" />Preparing report...</div></div>; }
function EmptyReport({ text = "No records match these filters." }) { return <div className="px-5 py-14 text-center text-sm text-slate-400"><BarChart3 className="mx-auto mb-3" />{text}</div>; }

function summarizeByCurrency(rows, totalField, paidField, remainingField) {
  const grouped = new Map();
  for (const row of rows) {
    const value = grouped.get(row.currency) || { currency: row.currency, count: 0, total: 0, paid: 0, remaining: 0 };
    value.count += 1;
    value.total += Number(row[totalField] || 0);
    value.paid += Number(row[paidField] || 0);
    value.remaining += Number(row[remainingField] || 0);
    grouped.set(row.currency, value);
  }
  return [...grouped.values()];
}

function summarizeCollections(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const value = grouped.get(row.currency) || { currency: row.currency, count: 0, total: 0 };
    value.count += 1;
    value.total += Number(row.amount);
    grouped.set(row.currency, value);
  }
  return [...grouped.values()];
}

function executiveExport(data) {
  return data.currencySummary.map((row) => ({
    Currency: row.currency,
    Orders: row.order_count,
    "Export value": row.total_amount,
    Received: row.paid_amount,
    Outstanding: row.remaining_amount
  }));
}

function groupBy(rows, field) {
  return rows.reduce((result, row) => {
    (result[row[field]] ||= []).push(row);
    return result;
  }, {});
}

function groupCounts(rows, field) {
  return rows.reduce((result, row) => {
    result[row[field]] = (result[row[field]] || 0) + 1;
    return result;
  }, {});
}

function downloadCsv(name, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function agingColor(bucket) {
  if (bucket === "Current") return "bg-blue-50 text-blue-700";
  if (bucket === "1-30 days") return "bg-forest-50 text-forest-700";
  if (bucket === "31-60 days") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function money(value, currency = "USD") {
  return `${currency || "USD"} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function compact(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function formatDate(value) { return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"; }
function monthLabel(value) { return new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }); }
