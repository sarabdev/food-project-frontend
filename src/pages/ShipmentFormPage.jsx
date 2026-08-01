import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { api, messageFromError } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  client_id: "", customs_consignee_id: "", shipment_date: today, currency: "USD",
  port_of_loading: "Karachi, Pakistan", port_of_destination: "", final_destination: "",
  shipping_type: "CAF", shipped_per: "By Sea", container_number: "", container_type: "40 HC",
  cbm: 0, freight_term: "Freight Prepaid", notes: ""
};

export function ShipmentFormPage() {
  const [form, setForm] = useState(initialForm);
  const [parties, setParties] = useState([]);
  const [lines, setLines] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/parties").then(({ data }) => setParties(data.parties));
  }, []);

  useEffect(() => {
    if (!form.client_id) {
      setLines([]);
      setQuantities({});
      return;
    }
    api.get("/shipments/available-lines", { params: { client_id: form.client_id } }).then(({ data }) => {
      setLines(data.lines);
      setQuantities({});
      if (data.lines[0]?.currency) setForm((current) => ({ ...current, currency: data.lines[0].currency }));
    });
  }, [form.client_id]);

  const clients = parties.filter((party) => party.party_type === "client");
  const consignees = parties.filter((party) => party.party_type === "customs_consignee");
  const selected = lines.filter((line) => Number(quantities[line.export_order_item_id] || 0) > 0);
  const totals = useMemo(() => selected.reduce((sum, line) => {
    const quantity = Number(quantities[line.export_order_item_id]);
    return {
      packages: sum.packages + quantity,
      net: sum.net + quantity * Number(line.net_weight_per_carton),
      gross: sum.gross + quantity * Number(line.gross_weight_per_carton),
      value: sum.value + (line.is_sample ? 0 : quantity * Number(line.client_price_per_carton))
    };
  }, { packages: 0, net: 0, gross: 0, value: 0 }), [selected, quantities]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const allocations = selected.map((line) => ({
        export_order_item_id: line.export_order_item_id,
        quantity: Number(quantities[line.export_order_item_id])
      }));
      const { data } = await api.post("/shipments", { ...form, allocations });
      navigate(`/shipments/${data.id}`);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Fulfillment" title="Create consolidated shipment" description="Select the exact remaining quantities to dispatch from any of this client's sales contracts." action={<Link to="/shipments" className="btn-secondary">Cancel</Link>} />
      <form onSubmit={save}>
        <section className="panel p-5 md:p-7">
          <h2 className="mb-5 font-bold">Shipment details</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Actual client" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} options={clients} required />
            <SelectField label="Customs / B/L consignee" value={form.customs_consignee_id} onChange={(value) => setForm({ ...form, customs_consignee_id: value })} options={consignees} required />
            <TextField label="Shipment date" type="date" value={form.shipment_date} onChange={(value) => setForm({ ...form, shipment_date: value })} required />
            <TextField label="Container number" value={form.container_number} onChange={(value) => setForm({ ...form, container_number: value })} />
            <TextField label="Port of loading" value={form.port_of_loading} onChange={(value) => setForm({ ...form, port_of_loading: value })} />
            <TextField label="Port of destination" value={form.port_of_destination} onChange={(value) => setForm({ ...form, port_of_destination: value })} />
            <TextField label="Final destination" value={form.final_destination} onChange={(value) => setForm({ ...form, final_destination: value })} />
            <TextField label="Container type" value={form.container_type} onChange={(value) => setForm({ ...form, container_type: value })} />
          </div>
        </section>
        <section className="panel mt-6 overflow-hidden">
          <div className="border-b px-5 py-4 md:px-7"><h2 className="font-bold">Available contract quantities</h2><p className="mt-1 text-xs text-slate-500">Enter zero for lines not included in this shipment.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Sales contract</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Contracted</th><th className="px-5 py-3">Previously allocated</th><th className="px-5 py-3">Remaining</th><th className="px-5 py-3">Ship now</th></tr></thead>
              <tbody className="divide-y">{lines.map((line) => (
                <tr key={line.export_order_item_id}>
                  <td className="px-5 py-4"><div className="font-semibold">{line.contract_number}</div><div className="text-xs text-slate-400">{new Date(line.contract_date).toLocaleDateString()}</div></td>
                  <td className="px-5 py-4">{line.product_name}{line.is_sample ? " (sample)" : ""}</td>
                  <td className="px-5 py-4">{Number(line.contract_quantity).toLocaleString()}</td>
                  <td className="px-5 py-4">{Number(line.allocated_quantity).toLocaleString()}</td>
                  <td className="px-5 py-4 font-bold text-forest-700">{Number(line.remaining_quantity).toLocaleString()}</td>
                  <td className="px-5 py-4"><input className="field w-32" type="number" min="0" step="0.001" max={line.remaining_quantity} value={quantities[line.export_order_item_id] || ""} placeholder="0" onChange={(event) => setQuantities({ ...quantities, [line.export_order_item_id]: event.target.value })} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {form.client_id && !lines.length && <div className="py-12 text-center text-sm text-slate-400">This client has no remaining contract quantities.</div>}
          {!form.client_id && <div className="py-12 text-center text-sm text-slate-400">Select a client to see their open sales contract lines.</div>}
          <div className="grid gap-3 border-t bg-forest-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4"><Summary label="Packages" value={totals.packages.toLocaleString()} /><Summary label="Net weight" value={`${totals.net.toLocaleString()} kg`} /><Summary label="Gross weight" value={`${totals.gross.toLocaleString()} kg`} /><Summary label="Shipment value" value={`${form.currency} ${totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /></div>
        </section>
        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-end"><button disabled={saving || !selected.length} className="btn-primary px-6"><Save size={18} /> {saving ? "Creating..." : "Create shipment"}</button></div>
      </form>
    </>
  );
}

function TextField({ label, value, onChange, type = "text", required }) { return <label><span className="label">{label}</span><input className="field" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, onChange, options, required }) { return <label><span className="label">{label}</span><select className="field" required={required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select...</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function Summary({ label, value }) { return <div><div className="text-xs font-bold uppercase tracking-wide text-forest-600">{label}</div><div className="mt-1 text-lg font-bold text-forest-900">{value}</div></div>; }
