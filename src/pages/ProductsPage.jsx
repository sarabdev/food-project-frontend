import { useEffect, useState } from "react";
import { Boxes, Pencil, Plus } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { api, assetUrl, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const packageTypes = ["Carton", "Jar", "Pouch", "Box"];
const emptyPackagingDetails = {
  pieces_per_box: 0,
  boxes_per_pouch: 0,
  pouches_per_jar: 0,
  jars_per_carton: 0
};

const emptyProduct = {
  sku: "", name: "", description: "", hs_code: "", package_type: "Carton",
  units_per_carton: 0, pieces_per_unit: 0, packaging_details: emptyPackagingDetails, unit_weight_grams: 0,
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
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">HS Code</th><th className="px-5 py-3">Packing</th><th className="px-5 py-3">Net / Gross</th><th className="px-5 py-3">Client price</th><th className="px-5 py-3">Customs / kg</th><th /></tr></thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4"><div className="font-semibold">{product.name}</div><div className="text-xs text-slate-400">{product.sku || "No SKU"}</div></td>
                  <td className="px-5 py-4">{product.hs_code || "—"}</td>
                  <td className="px-5 py-4">{packingSummary(product)}</td>
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
            <Field label="Package type">
              <select className="field" value={form.package_type || "Carton"} onChange={(e) => setForm({ ...form, package_type: e.target.value })}>
                {packageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <PackagingFields form={form} setForm={setForm} />
            <NumberField label="Unit weight (grams)" field="unit_weight_grams" form={form} setForm={setForm} />
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

function PackagingFields({ form, setForm }) {
  const detailFields = packagingFieldsFor(form.package_type);
  return (
    <div className="md:col-span-2">
      <div className="grid gap-5 md:grid-cols-2">
        {detailFields.map(({ field, label }) => (
          <Field key={field} label={label}>
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={form.packaging_details?.[field] ?? 0}
              onChange={(e) => setForm({
                ...form,
                packaging_details: {
                  ...emptyPackagingDetails,
                  ...(form.packaging_details || {}),
                  [field]: e.target.value
                }
              })}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, field, form, setForm }) {
  return <Field label={label}><input className="field" type="number" min="0" step="0.001" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></Field>;
}

function normalizeProduct(product) {
  return {
    ...emptyProduct,
    ...product,
    package_type: packageTypes.includes(product.package_type) ? product.package_type : "Carton",
    packaging_details: normalizePackagingDetails(product.packaging_details, product)
  };
}

function normalizePackagingDetails(value, product = {}) {
  let details = value;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = {};
    }
  }
  return {
    ...emptyPackagingDetails,
    ...(details || {}),
    pieces_per_box: details?.pieces_per_box ?? product.units_per_carton ?? 0
  };
}

function packagingFieldsFor(packageType) {
  const fields = [{ field: "pieces_per_box", label: "Pieces per box" }];
  if (["Pouch", "Jar", "Carton"].includes(packageType)) fields.push({ field: "boxes_per_pouch", label: "Boxes per pouch" });
  if (["Jar", "Carton"].includes(packageType)) fields.push({ field: "pouches_per_jar", label: "Pouches per jar" });
  if (packageType === "Carton") fields.push({ field: "jars_per_carton", label: "Jars per carton" });
  return fields;
}

function withDerivedPacking(product) {
  const details = normalizePackagingDetails(product.packaging_details);
  const selectedFields = packagingFieldsFor(product.package_type).map(({ field }) => field);
  const packagingDetails = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, selectedFields.includes(key) ? Number(value || 0) : 0])
  );
  return {
    ...product,
    packaging_details: packagingDetails,
    units_per_carton: packagingDetails.pieces_per_box,
    pieces_per_unit: derivedPackageCount(product.package_type, packagingDetails)
  };
}

function derivedPackageCount(packageType, details) {
  if (packageType === "Carton") return details.jars_per_carton;
  if (packageType === "Jar") return details.pouches_per_jar;
  if (packageType === "Pouch") return details.boxes_per_pouch;
  return 1;
}

function packingSummary(product) {
  const normalized = normalizeProduct(product);
  return packagingFieldsFor(normalized.package_type)
    .map(({ field, label }) => `${compactNumber(normalized.packaging_details[field])} ${label.toLowerCase()}`)
    .join(", ");
}

function compactNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
