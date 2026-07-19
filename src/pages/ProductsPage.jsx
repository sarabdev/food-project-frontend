import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, Pencil, Plus } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { api, assetUrl, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const packageTypes = ["Jar", "Pouch", "Box"];

const emptyProduct = {
  sku: "", name: "", description: "", hs_code: "", package_type: "Jar",
  units_per_carton: 0, pieces_per_unit: 0, packaging_details: {}, unit_weight_grams: 0,
  stock_in_hand: 0, low_stock_alert: 0,
  net_weight_per_carton: 0, gross_weight_per_carton: 0,
  default_client_price: 0, default_customs_price_per_kg: 0, image_url: ""
};

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [error, setError] = useState("");
  const { can } = useAuth();

  const load = () => api.get("/products").then(({ data }) => setProducts(data.products));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(form.image_url ? assetUrl(form.image_url) : "");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.image_url, imageFile]);

  function open(product = null) {
    setEditing(product);
    setForm(product ? normalizeProduct(product) : emptyProduct);
    setImageFile(null);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    try {
      const payload = new FormData();
      const productPayload = withDerivedPacking(form);
      Object.entries(productPayload).forEach(([key, value]) => {
        if (key === "packaging_details") {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, value ?? "");
      });
      if (imageFile) payload.append("image", imageFile);

      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
      setEditing(null);
      setForm(emptyProduct);
      setImageFile(null);
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
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">HS Code</th><th className="px-5 py-3">Packing</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Net / Gross</th><th className="px-5 py-3">Client price</th><th className="px-5 py-3">Customs / kg</th><th /></tr></thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4"><div className="font-semibold">{product.name}</div><div className="text-xs text-slate-400">{product.sku || "No SKU"}</div></td>
                  <td className="px-5 py-4">{product.hs_code || "—"}</td>
                  <td className="px-5 py-4">{packingSummary(product)}</td>
                  <td className="px-5 py-4"><StockSummary product={product} /></td>
                  <td className="px-5 py-4">{product.net_weight_per_carton} / {product.gross_weight_per_carton} kg</td>
                  <td className="px-5 py-4">${product.default_client_price}</td>
                  <td className="px-5 py-4">${product.default_customs_price_per_kg}</td>
                  <td className="px-5 py-4 text-right">{can("products.edit") && <button onClick={() => show(product)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil size={17} /></button>}</td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan="8" className="py-16 text-center"><Boxes className="mx-auto mb-3 text-slate-300" /><div className="text-slate-400">No products have been added.</div></td></tr>}
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
            <Field label="Package type">
              <select className="field" value={form.package_type || "Jar"} onChange={(e) => setForm({ ...form, package_type: e.target.value })}>
                {packageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <NumberField label="Per-piece weight (grams)" field="unit_weight_grams" form={form} setForm={setForm} />
            <NumberField label={`Pieces per ${form.package_type.toLowerCase()}`} field="pieces_per_unit" form={form} setForm={setForm} />
            <NumberField label={`${pluralize(form.package_type)} per carton`} field="units_per_carton" form={form} setForm={setForm} />
            <div className="md:col-span-2 mt-1 border-t border-slate-200 pt-5">
              <div className="mb-4">
                <h3 className="font-bold">Stock</h3>
                <p className="text-xs text-slate-500">Stock is recorded in {pluralize(form.package_type).toLowerCase()} and converted to cartons automatically.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <NumberField label={`Stock in hand (${pluralize(form.package_type).toLowerCase()})`} field="stock_in_hand" form={form} setForm={setForm} />
                <NumberField label={`Low-stock alert (${pluralize(form.package_type).toLowerCase()})`} field="low_stock_alert" form={form} setForm={setForm} />
              </div>
              <div className="mt-4 rounded-xl bg-forest-50 p-4 text-sm text-forest-900">
                <span className="font-semibold">Available cartons: </span>{stockCartonSummary(form)}
              </div>
            </div>
            <NumberField label="Net weight/carton (kg)" field="net_weight_per_carton" form={form} setForm={setForm} />
            <NumberField label="Gross weight/carton (kg)" field="gross_weight_per_carton" form={form} setForm={setForm} />
            <NumberField label="Client price/carton" field="default_client_price" form={form} setForm={setForm} />
            <NumberField label="Customs price/kg" field="default_customs_price_per_kg" form={form} setForm={setForm} />
            <Field label="Product image">
              <input
                className="field"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {form.image_url && !imageFile && <div className="mt-1 text-xs text-slate-400">Current image will be kept unless you choose a new one.</div>}
              {imagePreviewUrl && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <img className="h-32 w-full rounded-md object-contain" src={imagePreviewUrl} alt="Product preview" />
                </div>
              )}
            </Field>
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

function normalizeProduct(product) {
  return {
    ...emptyProduct,
    ...product,
    package_type: packageTypes.includes(product.package_type) ? product.package_type : "Jar",
    packaging_details: normalizePackagingDetails(product.packaging_details)
  };
}

function normalizePackagingDetails(value) {
  let details = value;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = {};
    }
  }
  return details || {};
}

function withDerivedPacking(product) {
  return {
    ...product,
    packaging_details: {
      pieces_per_pack: Number(product.pieces_per_unit || 0),
      packs_per_carton: Number(product.units_per_carton || 0)
    }
  };
}

function packingSummary(product) {
  return `${compactNumber(product.unit_weight_grams)} g × ${compactNumber(product.pieces_per_unit)} pieces × ${compactNumber(product.units_per_carton)} ${pluralize(product.package_type).toLowerCase()}`;
}

function StockSummary({ product }) {
  const isLow = Number(product.stock_in_hand) <= Number(product.low_stock_alert) && Number(product.low_stock_alert) > 0;
  return (
    <div>
      <div className={`font-semibold ${isLow ? "text-amber-700" : ""}`}>
        {isLow && <AlertTriangle className="mr-1 inline" size={15} />}
        {stockCartonSummary(product)}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {compactNumber(product.stock_in_hand)} {pluralize(product.package_type).toLowerCase()} in hand
      </div>
    </div>
  );
}

function stockCartonSummary(product) {
  const stock = Number(product.stock_in_hand || 0);
  const packsPerCarton = Number(product.units_per_carton || 0);
  if (!packsPerCarton) return "Set packs per carton";
  const fullCartons = Math.floor(stock / packsPerCarton);
  const loosePacks = stock - fullCartons * packsPerCarton;
  const looseText = loosePacks ? ` + ${compactNumber(loosePacks)} loose ${pluralize(product.package_type).toLowerCase()}` : "";
  return `${compactNumber(fullCartons)} cartons${looseText}`;
}

function pluralize(value) {
  const word = value || "Pack";
  if (word.endsWith("x") || word.endsWith("ch")) return `${word}es`;
  return word.endsWith("s") ? word : `${word}s`;
}

function compactNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
