import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { api, messageFromError } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);
const emptyOrder = {
  client_id: "", customs_consignee_id: "", contract_date: today, valid_until: "",
  sales_contract_number: "", payment_term: "40% advance, balance against scanned B/L",
  advance_percentage: 40, freight_amount: 0, currency: "USD",
  port_of_loading: "Karachi, Pakistan", port_of_destination: "",
  final_destination: "", shipping_type: "CAF", shipped_per: "By Sea",
  container_number: "", container_type: "40 HC", cbm: 0,
  freight_term: "Freight Prepaid", customer_instructions: "", notes: "",
};

export function OrderFormPage() {
  const [form, setForm] = useState(emptyOrder);
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/parties")]).then(([productsResponse, partiesResponse]) => {
      setProducts(productsResponse.data.products);
      setParties(partiesResponse.data.parties);
    });
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setForm(emptyOrder);
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    api.get(`/orders/${id}`)
      .then(({ data }) => {
        setForm(toEditableOrder(data.order));
        setItems(data.order.items.map(toEditableItem));
      })
      .catch((requestError) => setError(messageFromError(requestError)))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  const clients = parties.filter((party) => party.party_type === "client");
  const consignees = parties.filter((party) => party.party_type === "customs_consignee");
  const totals = useMemo(() => items.reduce((sum, item) => ({
    packages: sum.packages + Number(item.quantity || 0),
    net: sum.net + Number(item.quantity || 0) * Number(item.net_weight_per_carton || 0),
    gross: sum.gross + Number(item.quantity || 0) * Number(item.gross_weight_per_carton || 0),
    value: sum.value + (item.is_sample ? 0 : Number(item.quantity || 0) * Number(item.client_price_per_carton || 0))
  }), { packages: 0, net: 0, gross: 0, value: 0 }), [items]);
  const openingAdvance = totals.value * Number(form.advance_percentage || 0) / 100;

  function addItem() {
    if (!products[0]) return;
    const product = products[0];
    setItems([...items, fromProduct(product)]);
  }

  function chooseProduct(index, productId) {
    const product = products.find((item) => item.id === Number(productId));
    setItems(items.map((item, itemIndex) => itemIndex === index ? fromProduct(product) : item));
  }

  function updateItem(index, field, value) {
    setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        valid_until: form.valid_until || null,
        items
      };
      if (isEditing) {
        await api.put(`/orders/${id}`, payload);
        navigate(`/orders/${id}`);
      } else {
        const { data } = await api.post("/orders", payload);
        navigate(`/orders/${data.id}`);
      }
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isEditing ? "Edit order" : "New order"}
        title={isEditing ? "Edit export order" : "Create export order"}
        description={isEditing ? "Update shipment and product information before printing documents." : "The invoice number will be generated automatically when this draft is saved."}
        action={isEditing && <Link to={`/orders/${id}`} className="btn-secondary">Cancel</Link>}
      />
      {loading ? <div className="py-20 text-center text-slate-400">Loading order...</div> : (
      <form onSubmit={save}>
        <section className="panel p-5 md:p-7">
          <h2 className="mb-5 font-bold">Order and shipping details</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Actual client" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} options={clients} required />
            <SelectField label="Customs / B/L consignee" value={form.customs_consignee_id} onChange={(value) => setForm({ ...form, customs_consignee_id: value })} options={consignees} required />
            <TextField label="Contract date" type="date" value={form.contract_date} onChange={(value) => setForm({ ...form, contract_date: value })} required />
            <TextField label="Valid until" type="date" value={form.valid_until} onChange={(value) => setForm({ ...form, valid_until: value })} />
            <TextField label="Port of loading" value={form.port_of_loading} onChange={(value) => setForm({ ...form, port_of_loading: value })} />
            <TextField label="Port of destination" value={form.port_of_destination} onChange={(value) => setForm({ ...form, port_of_destination: value })} />
            <TextField label="Final destination" value={form.final_destination} onChange={(value) => setForm({ ...form, final_destination: value })} />
            <TextField label="Shipped per" value={form.shipped_per} onChange={(value) => setForm({ ...form, shipped_per: value })} />
            <TextField label="Container number" value={form.container_number} onChange={(value) => setForm({ ...form, container_number: value })} />
            <TextField label="Container type" value={form.container_type} onChange={(value) => setForm({ ...form, container_type: value })} />
            <TextField label="CBM" type="number" value={form.cbm} onChange={(value) => setForm({ ...form, cbm: value })} />
            <TextField label="Advance %" type="number" value={form.advance_percentage} onChange={(value) => setForm({ ...form, advance_percentage: value })} />
            <div className="md:col-span-2"><TextField label="Payment terms" value={form.payment_term} onChange={(value) => setForm({ ...form, payment_term: value })} /></div>
            <div className="md:col-span-2"><TextField label="Freight terms" value={form.freight_term} onChange={(value) => setForm({ ...form, freight_term: value })} /></div>
          </div>
        </section>
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4 md:px-7"><div><h2 className="font-bold">Products and samples</h2><p className="text-xs text-slate-500">Samples count toward packages and weights but have no commercial value.</p></div><button type="button" onClick={addItem} className="btn-secondary"><Plus size={17} /> Add line</button></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Cartons / Packages</th><th className="px-4 py-3">Net / carton</th><th className="px-4 py-3">Gross / carton</th><th className="px-4 py-3">Client / carton</th><th className="px-4 py-3">Customs / kg</th><th className="px-4 py-3">Sample</th><th /></tr></thead>
              <tbody className="divide-y">{items.map((item, index) => {
                const selectedProduct = products.find((product) => Number(product.id) === Number(item.product_id));
                return <tr key={index}><td className="px-4 py-3"><select className="field min-w-64" value={item.product_id} onChange={(e) => chooseProduct(index, e.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {availableCartons(product)} available</option>)}</select>{selectedProduct && <div className="mt-1 text-xs text-slate-400">{Number(selectedProduct.stock_in_hand || 0).toLocaleString()} {packPlural(selectedProduct.package_type).toLowerCase()} in stock</div>}</td>{["quantity", "net_weight_per_carton", "gross_weight_per_carton", "client_price_per_carton", "customs_price_per_kg"].map((field) => <td key={field} className="px-4 py-3"><input className="field w-28" type="number" min="0" step="0.001" value={item[field]} onChange={(e) => updateItem(index, field, e.target.value)} /></td>)}<td className="px-4 py-3"><input type="checkbox" className="h-5 w-5 accent-forest-700" checked={item.is_sample} onChange={(e) => updateItem(index, "is_sample", e.target.checked)} /></td><td className="px-4 py-3"><button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={17} /></button></td></tr>;
              })}</tbody>
            </table>
          </div>
          {!items.length && <div className="py-12 text-center text-sm text-slate-400">Add at least one product line.</div>}
          <div className="grid gap-3 border-t bg-forest-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Summary label="Packages" value={totals.packages.toLocaleString()} /><Summary label="Net weight" value={`${totals.net.toLocaleString()} kg`} /><Summary label="Gross weight" value={`${totals.gross.toLocaleString()} kg`} /><Summary label="Order total" value={orderMoney(totals.value, form.currency)} /><Summary label={`Opening advance (${Number(form.advance_percentage || 0).toLocaleString()}%)`} value={orderMoney(openingAdvance, form.currency)} /><Summary label="Balance after advance" value={orderMoney(Math.max(0, totals.value - openingAdvance), form.currency)} /></div>
        </section>
        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-end"><button disabled={saving || !items.length} className="btn-primary px-6"><Save size={18} /> {saving ? "Saving..." : isEditing ? "Update order" : "Save draft order"}</button></div>
      </form>
      )}
    </>
  );
}

function fromProduct(product) {
  return {
    product_id: product.id, quantity: 1, quantity_unit: "CTN",
    units_per_carton: product.units_per_carton,
    net_weight_per_carton: product.net_weight_per_carton,
    gross_weight_per_carton: product.gross_weight_per_carton,
    client_price_per_carton: product.default_client_price,
    customs_price_per_kg: product.default_customs_price_per_kg,
    is_sample: false, description_override: ""
  };
}

function toEditableOrder(order) {
  return {
    ...emptyOrder,
    client_id: fieldValue(order.client_id),
    customs_consignee_id: fieldValue(order.customs_consignee_id),
    contract_date: dateInputValue(order.contract_date) || today,
    valid_until: dateInputValue(order.valid_until),
    sales_contract_number: fieldValue(order.sales_contract_number),
    payment_term: fieldValue(order.payment_term),
    advance_percentage: fieldValue(order.advance_percentage),
    freight_amount: fieldValue(order.freight_amount),
    currency: fieldValue(order.currency) || "USD",
    port_of_loading: fieldValue(order.port_of_loading),
    port_of_destination: fieldValue(order.port_of_destination),
    final_destination: fieldValue(order.final_destination),
    shipping_type: fieldValue(order.shipping_type),
    shipped_per: fieldValue(order.shipped_per),
    container_number: fieldValue(order.container_number),
    container_type: fieldValue(order.container_type),
    cbm: fieldValue(order.cbm),
    freight_term: fieldValue(order.freight_term),
    customer_instructions: fieldValue(order.customer_instructions),
    notes: fieldValue(order.notes),
  };
}

function toEditableItem(item) {
  return {
    product_id: item.product_id,
    quantity: item.quantity,
    quantity_unit: item.quantity_unit || "CTN",
    units_per_carton: item.units_per_carton,
    net_weight_per_carton: item.net_weight_per_carton,
    gross_weight_per_carton: item.gross_weight_per_carton,
    client_price_per_carton: item.client_price_per_carton,
    customs_price_per_kg: item.customs_price_per_kg,
    is_sample: Boolean(item.is_sample),
    description_override: item.description_override || ""
  };
}

function fieldValue(value) {
  return value ?? "";
}

function dateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function TextField({ label, value, onChange, type = "text", required }) { return <label><span className="label">{label}</span><input className="field" required={required} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function SelectField({ label, value, onChange, options, required }) { return <label><span className="label">{label}</span><select className="field" required={required} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function Summary({ label, value }) { return <div><div className="text-xs font-bold uppercase tracking-wide text-forest-600">{label}</div><div className="mt-1 text-lg font-bold text-forest-900">{value}</div></div>; }
function orderMoney(value, currency) { return `${currency || "USD"} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function availableCartons(product) {
  const packsPerCarton = Number(product.units_per_carton || 0);
  if (!packsPerCarton) return "0 cartons";
  const stock = Number(product.stock_in_hand || 0);
  const cartons = Math.floor(stock / packsPerCarton);
  const loose = stock - cartons * packsPerCarton;
  return `${cartons.toLocaleString()} cartons${loose ? ` + ${loose.toLocaleString()} loose` : ""}`;
}
function packPlural(value) {
  const pack = String(value || "pack");
  return pack.endsWith("x") || pack.endsWith("ch") ? `${pack}es` : `${pack}s`;
}
