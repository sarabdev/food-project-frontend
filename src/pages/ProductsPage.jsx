import { useEffect, useState } from "react";
import { Boxes, Pencil, Plus } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const emptyProduct = {
  sku: "", name: "", description: "", hs_code: "", package_type: "Carton",
  units_per_carton: 0, pieces_per_unit: 0, unit_weight_grams: 0,
  net_weight_per_carton: 0, gross_weight_per_carton: 0,
  default_client_price: 0, default_customs_price_per_kg: 0, image_url: ""
};

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState("");
  const { can } = useAuth();

  const load = () => api.get("/products").then(({ data }) => setProducts(data.products));
  useEffect(() => { load(); }, []);

  function open(product = null) {
    setEditing(product);
    setForm(product ? { ...product } : emptyProduct);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else await api.post("/products", form);
      setEditing(null);
      setForm(emptyProduct);
      document.getElementById("product-modal-close")?.click();
      load();
    } catch (requestError) {
      setError(messageFromError(requestError));
    }
  }

  const [modalOpen, setModalOpen] = useState(false);
  const show = (product) => { open(product); setModalOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Master data" title="Products & packing" description="Weights and packing rules entered here drive every packing list and invoice calculation." action={can("products.create") && <button className="btn-primary" onClick={() => show(null)}><Plus size={18} /> Add product</button>} />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">HS Code</th><th className="px-5 py-3">Packing</th><th className="px-5 py-3">Net / Gross</th><th className="px-5 py-3">Client price</th><th className="px-5 py-3">Customs / kg</th><th /></tr></thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4"><div className="font-semibold">{product.name}</div><div className="text-xs text-slate-400">{product.sku || "No SKU"}</div></td>
                  <td className="px-5 py-4">{product.hs_code || "—"}</td>
                  <td className="px-5 py-4">{product.units_per_carton} units × {product.pieces_per_unit} pieces</td>
                  <td className="px-5 py-4">{product.net_weight_per_carton} / {product.gross_weight_per_carton} kg</td>
                  <td className="px-5 py-4">${product.default_client_price}</td>
                  <td className="px-5 py-4">${product.default_customs_price_per_kg}</td>
                  <td className="px-5 py-4 text-right">{can("products.edit") && <button onClick={() => show(product)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil size={17} /></button>}</td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan="7" className="py-16 text-center"><Boxes className="mx-auto mb-3 text-slate-300" /><div className="text-slate-400">No products have been added.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={modalOpen} title={editing ? "Edit product" : "Add product"} onClose={() => setModalOpen(false)} wide>
        <button id="product-modal-close" className="hidden" onClick={() => setModalOpen(false)} />
        <form onSubmit={save}>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Product name"><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SKU"><input className="field" value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
            <Field label="HS code"><input className="field" value={form.hs_code || ""} onChange={(e) => setForm({ ...form, hs_code: e.target.value })} /></Field>
            <Field label="Package type"><input className="field" value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })} /></Field>
            <NumberField label="Units per carton" field="units_per_carton" form={form} setForm={setForm} />
            <NumberField label="Pieces per unit" field="pieces_per_unit" form={form} setForm={setForm} />
            <NumberField label="Unit weight (grams)" field="unit_weight_grams" form={form} setForm={setForm} />
            <NumberField label="Net weight/carton (kg)" field="net_weight_per_carton" form={form} setForm={setForm} />
            <NumberField label="Gross weight/carton (kg)" field="gross_weight_per_carton" form={form} setForm={setForm} />
            <NumberField label="Client price/carton" field="default_client_price" form={form} setForm={setForm} />
            <NumberField label="Customs price/kg" field="default_customs_price_per_kg" form={form} setForm={setForm} />
            <Field label="Image URL"><input className="field" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Print description"><textarea className="field min-h-24" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          </div>
          {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mt-7 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary">Save product</button></div>
        </form>
      </Modal>
    </>
  );
}

function Field({ label, children }) {
  return <label><span className="label">{label}</span>{children}</label>;
}

function NumberField({ label, field, form, setForm }) {
  return <Field label={label}><input className="field" type="number" min="0" step="0.001" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></Field>;
}

