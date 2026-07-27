import { useEffect, useMemo, useState } from "react";
import { Download, Filter, PackagePlus, Printer, RefreshCw, Warehouse } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const today = new Date().toLocaleDateString("en-CA");
const initialFilters = { date_from: "", date_to: today, product_id: "" };
const initialEntry = {
  product_id: "",
  movement_date: today,
  movement_type: "restock",
  quantity: "",
  reference_number: "",
  notes: "",
  low_stock_alert: 0,
  net_weight_per_carton: 0,
  gross_weight_per_carton: 0,
  default_client_price: 0,
  default_customs_price_per_kg: 0
};

const movementLabels = {
  opening: "Opening stock",
  restock: "Restock",
  customer_return: "Customer return",
  damage: "Damage / wastage",
  adjustment_in: "Adjustment in",
  adjustment_out: "Adjustment out",
  order: "Export order",
  order_adjustment: "Order adjustment",
  order_reversal: "Order reversal"
};

const manualTypes = [
  ["restock", "Restock / purchase"],
  ["customer_return", "Customer return"],
  ["damage", "Damage / wastage"],
  ["adjustment_in", "Positive adjustment"],
  ["adjustment_out", "Negative adjustment"]
];

export function StockPage() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [data, setData] = useState({ summary: [], transactions: [] });
  const [entry, setEntry] = useState(initialEntry);
  const [entryOpen, setEntryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entryError, setEntryError] = useState("");
  const { can } = useAuth();

  async function loadProducts() {
    const { data: response } = await api.get("/stock/products");
    setProducts(response.products);
  }

  async function loadReport(nextFilters = appliedFilters) {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/stock/movements", {
        params: Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ""))
      });
      setData(response);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts().catch((requestError) => setError(messageFromError(requestError)));
    loadReport(initialFilters);
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(entry.product_id)),
    [entry.product_id, products]
  );

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    loadReport(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    loadReport(initialFilters);
  }

  function openEntry() {
    const productId = filters.product_id || products[0]?.id || "";
    setEntry(entryForProduct(initialEntry, productId, products));
    setEntryError("");
    setEntryOpen(true);
  }

  function chooseEntryProduct(productId) {
    setEntry(entryForProduct(entry, productId, products));
  }

  async function saveEntry(event) {
    event.preventDefault();
    setSaving(true);
    setEntryError("");
    try {
      await api.post("/stock/movements", entry);
      setEntryOpen(false);
      await Promise.all([loadProducts(), loadReport(appliedFilters)]);
    } catch (requestError) {
      setEntryError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = data.transactions.map((transaction) => ({
      Date: formatDate(transaction.movement_date),
      Product: transaction.product_name,
      Type: movementLabels[transaction.movement_type] || transaction.movement_type,
      Reference: transaction.invoice_number || transaction.reference_number || "",
      "Stock In": Math.max(Number(transaction.quantity_change), 0),
      "Stock Out": Math.max(-Number(transaction.quantity_change), 0),
      Balance: Number(transaction.running_balance),
      "Recorded By": transaction.recorded_by,
      Notes: transaction.notes || "",
      "Low-stock Alert": transaction.low_stock_alert ?? "",
      "Net Weight/Carton": transaction.net_weight_per_carton ?? "",
      "Gross Weight/Carton": transaction.gross_weight_per_carton ?? "",
      "Client Price/Carton": transaction.client_price_per_carton ?? "",
      "Customs Price/Kg": transaction.customs_price_per_kg ?? ""
    }));
    downloadCsv(`stock-report-${today}.csv`, rows);
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock ledger"
        description="Record dated stock changes and review opening, inward, outward and closing balances."
        action={can("stock.record") && (
          <button className="btn-primary" onClick={openEntry}>
            <PackagePlus size={18} /> Record stock entry
          </button>
        )}
      />

      <form onSubmit={applyFilters} className="panel no-print mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1.5fr_auto] xl:items-end">
          <FilterField label="From date">
            <input className="field" type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} />
          </FilterField>
          <FilterField label="To date">
            <input className="field" type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} />
          </FilterField>
          <FilterField label="Product">
            <select className="field" value={filters.product_id} onChange={(event) => setFilters({ ...filters, product_id: event.target.value })}>
              <option value="">All products</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </FilterField>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={resetFilters}><RefreshCw size={16} /> Reset</button>
            <button className="btn-primary"><Filter size={16} /> Apply</button>
          </div>
        </div>
      </form>

      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? (
        <div className="panel py-20 text-center text-slate-400">Preparing stock report...</div>
      ) : (
        <div className="report-print">
          <div className="no-print mb-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} /> Export CSV</button>
            <button className="btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
          </div>
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-widest text-forest-700">ZA Food Industries</div>
            <h2 className="mt-1 text-2xl font-black">Date-wise Stock Report</h2>
            <p className="mt-1 text-sm text-slate-500">
              {reportPeriod(appliedFilters)}
              {appliedFilters.product_id ? ` · ${products.find((product) => String(product.id) === String(appliedFilters.product_id))?.name || ""}` : " · All products"}
            </p>
          </div>

          <section className="panel mb-6 overflow-hidden">
            <div className="border-b px-5 py-4"><h3 className="font-bold">Product balances</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3 text-right">Opening</th><th className="px-5 py-3 text-right">Stock in</th><th className="px-5 py-3 text-right">Stock out</th><th className="px-5 py-3 text-right">Closing</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.summary.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3"><div className="font-semibold">{row.name}</div><div className="text-xs text-slate-400">{row.package_type}s</div></td>
                      <NumberCell value={row.opening_balance} />
                      <NumberCell value={row.stock_in} positive />
                      <NumberCell value={row.stock_out} negative />
                      <NumberCell value={row.closing_balance} strong />
                    </tr>
                  ))}
                  {!data.summary.length && <tr><td colSpan="5" className="py-12 text-center text-slate-400">No products found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b px-5 py-4"><h3 className="font-bold">Stock transactions</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Stock in</th><th className="px-4 py-3 text-right">Stock out</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Recorded by</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(transaction.movement_date)}</td>
                      <td className="px-4 py-3 font-semibold">{transaction.product_name}</td>
                      <td className="px-4 py-3">{movementLabels[transaction.movement_type] || transaction.movement_type}</td>
                      <td className="px-4 py-3">
                        <div>{transaction.invoice_number || transaction.reference_number || "—"}</div>
                        {transaction.movement_type === "restock" && (
                          <div className="mt-1 max-w-sm text-xs text-slate-400">
                            Net/Gross: {compact(transaction.net_weight_per_carton)} / {compact(transaction.gross_weight_per_carton)} kg · Client: {compact(transaction.client_price_per_carton)} · Customs/kg: {compact(transaction.customs_price_per_kg)}
                          </div>
                        )}
                        {transaction.notes && <div className="mt-1 max-w-xs text-xs text-slate-400">{transaction.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">{Number(transaction.quantity_change) > 0 ? compact(transaction.quantity_change) : "—"}</td>
                      <td className="px-4 py-3 text-right text-red-600">{Number(transaction.quantity_change) < 0 ? compact(-Number(transaction.quantity_change)) : "—"}</td>
                      <td className="px-4 py-3 text-right font-bold">{compact(transaction.running_balance)}</td>
                      <td className="px-4 py-3">{transaction.recorded_by}</td>
                    </tr>
                  ))}
                  {!data.transactions.length && (
                    <tr><td colSpan="8" className="py-16 text-center"><Warehouse className="mx-auto mb-3 text-slate-300" /><div className="text-slate-400">No stock transactions in this period.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <Modal open={entryOpen} title="Record stock entry" onClose={() => setEntryOpen(false)} wide>
        <form onSubmit={saveEntry}>
          <div className="grid gap-5">
            <FilterField label="Product">
              <select className="field" required value={entry.product_id} onChange={(event) => chooseEntryProduct(event.target.value)}>
                <option value="">Select product...</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              {selectedProduct && <div className="mt-1 text-xs text-slate-500">Current stock: {compact(selectedProduct.stock_in_hand)} {String(selectedProduct.package_type).toLowerCase()}s</div>}
            </FilterField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FilterField label="Entry date">
                <input className="field" type="date" required value={entry.movement_date} onChange={(event) => setEntry({ ...entry, movement_date: event.target.value })} />
              </FilterField>
              <FilterField label="Entry type">
                <select className="field" value={entry.movement_type} onChange={(event) => setEntry({ ...entry, movement_type: event.target.value })}>
                  {manualTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FilterField>
            </div>
            <FilterField label={`Quantity${selectedProduct ? ` (${String(selectedProduct.package_type).toLowerCase()}s)` : ""}`}>
              <input className="field" type="number" min="0.001" step="0.001" required value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} />
            </FilterField>
            {entry.movement_type === "restock" && (
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold">Restock product values</h3>
                <p className="mt-1 text-xs text-slate-500">These dated values will become the product defaults for future orders.</p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <EntryNumberField label={`Low-stock alert${selectedProduct ? ` (${String(selectedProduct.package_type).toLowerCase()}s)` : ""}`} field="low_stock_alert" entry={entry} setEntry={setEntry} />
                  <EntryNumberField label="Net weight/carton (kg)" field="net_weight_per_carton" entry={entry} setEntry={setEntry} />
                  <EntryNumberField label="Gross weight/carton (kg)" field="gross_weight_per_carton" entry={entry} setEntry={setEntry} />
                  <EntryNumberField label="Client price/carton" field="default_client_price" entry={entry} setEntry={setEntry} />
                  <EntryNumberField label="Customs price/kg" field="default_customs_price_per_kg" entry={entry} setEntry={setEntry} />
                </div>
              </section>
            )}
            <FilterField label="Reference number">
              <input className="field" maxLength="120" value={entry.reference_number} onChange={(event) => setEntry({ ...entry, reference_number: event.target.value })} placeholder="Purchase invoice, GRN, adjustment reference..." />
            </FilterField>
            <FilterField label="Notes">
              <textarea className="field min-h-24" maxLength="500" value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} />
            </FilterField>
          </div>
          {entryError && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{entryError}</div>}
          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setEntryOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}><PackagePlus size={17} /> {saving ? "Saving..." : "Save stock entry"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function FilterField({ label, children }) {
  return <label><span className="label">{label}</span>{children}</label>;
}

function EntryNumberField({ label, field, entry, setEntry }) {
  return (
    <FilterField label={label}>
      <input className="field" type="number" min="0" step="0.001" required value={entry[field]} onChange={(event) => setEntry({ ...entry, [field]: event.target.value })} />
    </FilterField>
  );
}

function entryForProduct(currentEntry, productId, products) {
  const product = products.find((item) => String(item.id) === String(productId));
  return {
    ...currentEntry,
    product_id: productId,
    low_stock_alert: product?.low_stock_alert ?? 0,
    net_weight_per_carton: product?.net_weight_per_carton ?? 0,
    gross_weight_per_carton: product?.gross_weight_per_carton ?? 0,
    default_client_price: product?.default_client_price ?? 0,
    default_customs_price_per_kg: product?.default_customs_price_per_kg ?? 0
  };
}

function NumberCell({ value, positive = false, negative = false, strong = false }) {
  return <td className={`px-5 py-3 text-right ${positive ? "text-emerald-700" : ""} ${negative ? "text-red-600" : ""} ${strong ? "font-bold" : ""}`}>{compact(value)}</td>;
}

function compact(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString();
}

function reportPeriod(filters) {
  if (filters.date_from && filters.date_to) return `${formatDate(filters.date_from)} to ${formatDate(filters.date_to)}`;
  if (filters.date_from) return `From ${formatDate(filters.date_from)}`;
  if (filters.date_to) return `Up to ${formatDate(filters.date_to)}`;
  return "All dates";
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
