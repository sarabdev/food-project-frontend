import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { api, messageFromError } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  client_id: "", customs_consignee_id: "", also_notify_party_id: "", shipment_date: today, currency: "USD",
  gd_number: "", fi_number: "",
  port_of_loading: "Karachi, Pakistan", port_of_destination: "", final_destination: "",
  shipping_type: "CAF", shipped_per: "By Sea", vessel_name: "", voyage_number: "",
  bl_number: "", bl_date: "",
  freight_term: "Freight Prepaid",
  invoice_adjustment_type: "claim", invoice_adjustment_operation: "less",
  invoice_adjustment_amount: "", invoice_adjustment_description: "", notes: ""
};
const emptyContainer = { container_number: "", container_type: "40 HC", cbm: 0 };

export function ShipmentFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [parties, setParties] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedContractIds, setSelectedContractIds] = useState([]);
  const [containers, setContainers] = useState([{ ...emptyContainer }]);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/parties").then(({ data }) => setParties(data.parties));
  }, []);

  useEffect(() => {
    if (isEditing) return;
    if (!form.client_id) {
      setLines([]);
      setSelectedContractIds([]);
      setQuantities({});
      return;
    }
    api.get("/shipments/available-lines", { params: { client_id: form.client_id } }).then(({ data }) => {
      setLines(data.lines);
      setSelectedContractIds([]);
      setQuantities({});
      if (data.lines[0]?.currency) setForm((current) => ({ ...current, currency: data.lines[0].currency }));
    });
  }, [form.client_id, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    async function loadShipment() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/shipments/${id}`);
        const shipment = data.shipment;
        const { data: availableData } = await api.get("/shipments/available-lines", {
          params: { client_id: shipment.client_id, shipment_id: id }
        });
        if (!active) return;
        const editableContainers = shipment.containers.map((container) => ({
          container_number: container.container_number || "",
          container_type: container.container_type || "",
          cbm: Number(container.cbm || 0)
        }));
        const containerIndexes = new Map(shipment.containers.map((container, index) => [Number(container.id), index]));
        const editableQuantities = {};
        for (const item of shipment.items) {
          const containerIndex = containerIndexes.get(Number(item.shipment_container_id));
          if (containerIndex !== undefined) {
            editableQuantities[quantityKey(item.export_order_item_id, containerIndex)] = Number(item.quantity);
          }
        }
        setForm({
          client_id: String(shipment.client_id),
          customs_consignee_id: String(shipment.customs_consignee_id),
          also_notify_party_id: shipment.also_notify_party_id ? String(shipment.also_notify_party_id) : "",
          shipment_date: String(shipment.shipment_date || shipment.contract_date).slice(0, 10),
          gd_number: shipment.gd_number || "",
          fi_number: shipment.fi_number || "",
          currency: shipment.currency || "USD",
          port_of_loading: shipment.port_of_loading || "",
          port_of_destination: shipment.port_of_destination || "",
          final_destination: shipment.final_destination || "",
          shipping_type: shipment.shipping_type || "",
          shipped_per: shipment.shipped_per || "",
          vessel_name: shipment.vessel_name || "",
          voyage_number: shipment.voyage_number || "",
          bl_number: shipment.bl_number || "",
          bl_date: shipment.bl_date ? String(shipment.bl_date).slice(0, 10) : "",
          freight_term: shipment.freight_term || "",
          invoice_adjustment_type: shipment.invoice_adjustment_type || "claim",
          invoice_adjustment_operation: shipment.invoice_adjustment_operation || "less",
          invoice_adjustment_amount: Number(shipment.invoice_adjustment_amount || 0) || "",
          invoice_adjustment_description: shipment.invoice_adjustment_description || "",
          notes: shipment.notes || ""
        });
        setLines(availableData.lines);
        setSelectedContractIds([...new Set(shipment.items.map((item) => Number(item.contract_id)))]);
        setContainers(editableContainers.length ? editableContainers : [{ ...emptyContainer }]);
        setQuantities(editableQuantities);
      } catch (requestError) {
        if (active) setError(messageFromError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadShipment();
    return () => { active = false; };
  }, [id, isEditing]);

  const clients = parties.filter((party) => party.party_type === "client");
  const consignees = parties.filter((party) => party.party_type === "customs_consignee");
  const notifyParties = parties.filter((party) => party.party_type === "notify_party");
  const contracts = useMemo(() => {
    const contractsById = new Map();
    for (const line of lines) {
      const contractId = Number(line.contract_id);
      if (!contractsById.has(contractId)) {
        contractsById.set(contractId, {
          id: contractId,
          number: line.contract_number,
          date: line.contract_date,
          currency: line.currency,
          availablePackages: 0,
          productCount: 0
        });
      }
      const contract = contractsById.get(contractId);
      contract.availablePackages += Number(line.remaining_quantity);
      contract.productCount += 1;
    }
    return [...contractsById.values()];
  }, [lines]);
  const selectedContractIdSet = useMemo(() => new Set(selectedContractIds), [selectedContractIds]);
  const visibleLines = useMemo(
    () => lines.filter((line) => selectedContractIdSet.has(Number(line.contract_id))),
    [lines, selectedContractIdSet]
  );
  const allocations = useMemo(() => visibleLines.flatMap((line) => containers.map((_, containerIndex) => ({
    export_order_item_id: line.export_order_item_id,
    container_index: containerIndex,
    quantity: Number(quantities[quantityKey(line.export_order_item_id, containerIndex)] || 0),
    line
  })).filter((allocation) => allocation.quantity > 0)), [visibleLines, containers, quantities]);
  const totals = useMemo(() => allocations.reduce((sum, allocation) => ({
    packages: sum.packages + allocation.quantity,
    net: sum.net + allocation.quantity * Number(allocation.line.net_weight_per_carton),
    gross: sum.gross + allocation.quantity * Number(allocation.line.gross_weight_per_carton),
    value: sum.value + (allocation.line.is_sample ? 0 : allocation.quantity * Number(allocation.line.client_price_per_carton))
  }), { packages: 0, net: 0, gross: 0, value: 0 }), [allocations]);
  const allContainersUsed = containers.every((_, index) => allocations.some((allocation) => allocation.container_index === index));

  function addContainer() {
    setContainers((current) => [...current, { ...emptyContainer }]);
  }

  function toggleContract(contractId) {
    const isSelected = selectedContractIdSet.has(contractId);
    setSelectedContractIds((current) => isSelected
      ? current.filter((currentId) => currentId !== contractId)
      : [...current, contractId]);
    if (isSelected) {
      const removedLineIds = new Set(lines
        .filter((line) => Number(line.contract_id) === contractId)
        .map((line) => String(line.export_order_item_id)));
      setQuantities((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !removedLineIds.has(key.split(":")[0]))
      ));
    }
  }

  function clearContracts() {
    setSelectedContractIds([]);
    setQuantities({});
  }

  function updateContainer(index, field, value) {
    setContainers((current) => current.map((container, containerIndex) => containerIndex === index ? { ...container, [field]: value } : container));
  }

  function removeContainer(index) {
    if (containers.length === 1) return;
    setContainers((current) => current.filter((_, containerIndex) => containerIndex !== index));
    setQuantities((current) => {
      const revised = {};
      for (const [key, value] of Object.entries(current)) {
        const [lineId, containerIndexText] = key.split(":");
        const containerIndex = Number(containerIndexText);
        if (containerIndex === index) continue;
        revised[quantityKey(lineId, containerIndex > index ? containerIndex - 1 : containerIndex)] = value;
      }
      return revised;
    });
  }

  function updateQuantity(line, containerIndex, value) {
    const otherAllocated = containers.reduce((sum, _, index) => index === containerIndex
      ? sum
      : sum + Number(quantities[quantityKey(line.export_order_item_id, index)] || 0), 0);
    const maximum = Math.max(0, Number(line.remaining_quantity) - otherAllocated);
    const numeric = value === "" ? "" : Math.min(Number(value), maximum);
    setQuantities((current) => ({ ...current, [quantityKey(line.export_order_item_id, containerIndex)]: numeric }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payloadAllocations = allocations.map(({ export_order_item_id, container_index, quantity }) => ({
        export_order_item_id, container_index, quantity
      }));
      const payload = {
        ...form,
        containers,
        allocations: payloadAllocations
      };
      if (isEditing) {
        await api.put(`/shipments/${id}`, payload);
        navigate(`/shipments/${id}`);
      } else {
        const { data } = await api.post("/shipments", payload);
        navigate(`/shipments/${data.id}`);
      }
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-400">Loading shipment...</div>;

  return (
    <>
      <PageHeader eyebrow="Fulfillment" title={isEditing ? "Edit shipment" : "Create consolidated shipment"} description="Select a client and their sales contracts, then allocate the required product quantities across containers." action={<Link to={isEditing ? `/shipments/${id}` : "/shipments"} className="btn-secondary">Cancel</Link>} />
      <form onSubmit={save}>
        <section className="panel p-5 md:p-7">
          <h2 className="mb-5 font-bold">Shipment details</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Actual client" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} options={clients} required disabled={isEditing} />
            <SelectField label="Customs / B/L consignee" value={form.customs_consignee_id} onChange={(value) => setForm({ ...form, customs_consignee_id: value })} options={consignees} required />
            <SelectField label="Also notify party" value={form.also_notify_party_id} onChange={(value) => setForm({ ...form, also_notify_party_id: value })} options={notifyParties} />
            <TextField label="Document date" type="date" value={form.shipment_date} onChange={(value) => setForm({ ...form, shipment_date: value })} required />
            <TextField label="G.D. No." value={form.gd_number} onChange={(value) => setForm({ ...form, gd_number: value })} />
            <TextField label="FI No." value={form.fi_number} onChange={(value) => setForm({ ...form, fi_number: value })} />
            <TextField label="Port of loading" value={form.port_of_loading} onChange={(value) => setForm({ ...form, port_of_loading: value })} />
            <TextField label="Port of destination" value={form.port_of_destination} onChange={(value) => setForm({ ...form, port_of_destination: value })} />
            <TextField label="Final destination" value={form.final_destination} onChange={(value) => setForm({ ...form, final_destination: value })} />
            <TextField label="Shipped per" value={form.shipped_per} onChange={(value) => setForm({ ...form, shipped_per: value })} />
            <TextField label="Vessel name" value={form.vessel_name} onChange={(value) => setForm({ ...form, vessel_name: value })} />
            <TextField label="Voyage number" value={form.voyage_number} onChange={(value) => setForm({ ...form, voyage_number: value })} />
            <TextField label="B/L No." value={form.bl_number} onChange={(value) => setForm({ ...form, bl_number: value })} />
            <TextField label="B/L Date" type="date" value={form.bl_date} onChange={(value) => setForm({ ...form, bl_date: value })} />
          </div>
        </section>

        <section className="panel mt-6 p-5 md:p-7">
          <div className="mb-5">
            <h2 className="font-bold">Client invoice adjustment</h2>
            <p className="mt-1 text-xs text-slate-500">Optionally add or deduct a claim, freight charge, or expense from the Client Commercial Invoice. Customs invoice values are not affected.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="label">Adjustment type</span><select className="field" value={form.invoice_adjustment_type} onChange={(event) => setForm({ ...form, invoice_adjustment_type: event.target.value })}><option value="claim">Claim</option><option value="freight">Freight</option><option value="expense">Expense</option><option value="other">Other</option></select></label>
            <label><span className="label">Calculation</span><select className="field" value={form.invoice_adjustment_operation} onChange={(event) => setForm({ ...form, invoice_adjustment_operation: event.target.value })}><option value="less">Less (−)</option><option value="add">Add (+)</option></select></label>
            <TextField label={`Amount (${form.currency})`} type="number" step="0.01" value={form.invoice_adjustment_amount} onChange={(value) => setForm({ ...form, invoice_adjustment_amount: value })} />
            <TextField label="Description / remarks" value={form.invoice_adjustment_description} onChange={(value) => setForm({ ...form, invoice_adjustment_description: value })} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Client invoice value after adjustment, before advance: <strong className="text-forest-800">{form.currency} {(totals.value + (form.invoice_adjustment_operation === "add" ? 1 : -1) * Number(form.invoice_adjustment_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </section>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-7">
            <div><h2 className="font-bold">Select sales contracts</h2><p className="mt-1 text-xs text-slate-500">Only open contracts belonging to the selected client are available.</p></div>
            {!!contracts.length && <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => setSelectedContractIds(contracts.map((contract) => contract.id))}>Select all</button><button type="button" className="btn-secondary" onClick={clearContracts}>Clear</button></div>}
          </div>
          {!!contracts.length && <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {contracts.map((contract) => {
              const selected = selectedContractIdSet.has(contract.id);
              return <label key={contract.id} className={`cursor-pointer rounded-xl border p-4 transition ${selected ? "border-forest-500 bg-forest-50 ring-1 ring-forest-500" : "border-slate-200 hover:border-forest-300"}`}>
                <div className="flex items-start gap-3">
                  <input className="mt-1 h-4 w-4 accent-forest-700" type="checkbox" checked={selected} onChange={() => toggleContract(contract.id)} />
                  <div className="min-w-0"><div className="font-bold">{contract.number}</div><div className="mt-1 text-xs text-slate-500">{new Date(contract.date).toLocaleDateString()} · {contract.productCount} product{contract.productCount === 1 ? "" : "s"}</div><div className="mt-2 text-sm font-semibold text-forest-700">{contract.availablePackages.toLocaleString()} packages available</div></div>
                </div>
              </label>;
            })}
          </div>}
          {!form.client_id && <div className="py-12 text-center text-sm text-slate-400">Select a client first to see their open sales contracts.</div>}
          {form.client_id && !contracts.length && <div className="py-12 text-center text-sm text-slate-400">This client has no remaining quantities on open sales contracts.</div>}
        </section>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-7">
            <div><h2 className="font-bold">Containers</h2><p className="mt-1 text-xs text-slate-500">Container numbers must be unique within this shipment.</p></div>
            <button type="button" className="btn-secondary" onClick={addContainer}><Plus size={17} /> Add container</button>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {containers.map((container, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">Container {index + 1}</h3><p className="mt-1 text-xs text-slate-400">{allocations.filter((allocation) => allocation.container_index === index).reduce((sum, allocation) => sum + allocation.quantity, 0).toLocaleString()} packages assigned</p></div>{containers.length > 1 && <button type="button" aria-label={`Remove container ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => removeContainer(index)}><Trash2 size={17} /></button>}</div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField label="Container number" value={container.container_number} onChange={(value) => updateContainer(index, "container_number", value)} required />
                  <TextField label="Container type" value={container.container_type} onChange={(value) => updateContainer(index, "container_type", value)} />
                  <TextField label="CBM" type="number" value={container.cbm} onChange={(value) => updateContainer(index, "cbm", value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mt-6 overflow-hidden">
          <div className="border-b px-5 py-4 md:px-7"><h2 className="font-bold">Allocate products to containers</h2><p className="mt-1 text-xs text-slate-500">A product can be split across containers, but the combined quantity cannot exceed its remaining contract quantity.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: `${760 + containers.length * 150}px` }}>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Sales contract</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Remaining</th>{containers.map((container, index) => <th key={index} className="px-4 py-3"><div>{container.container_number || `Container ${index + 1}`}</div><div className="mt-1 font-normal normal-case text-slate-400">{container.container_type || "Type not set"}</div></th>)}<th className="px-4 py-3">Allocated</th></tr></thead>
              <tbody className="divide-y">{visibleLines.map((line) => {
                const allocatedNow = containers.reduce((sum, _, index) => sum + Number(quantities[quantityKey(line.export_order_item_id, index)] || 0), 0);
                return <tr key={line.export_order_item_id}>
                  <td className="px-4 py-4"><div className="font-semibold">{line.contract_number}</div><div className="text-xs text-slate-400">{new Date(line.contract_date).toLocaleDateString()}</div></td>
                  <td className="px-4 py-4">{line.product_name}{line.is_sample ? " (sample)" : ""}</td>
                  <td className="px-4 py-4"><div className="font-bold text-forest-700">{Number(line.remaining_quantity).toLocaleString()}</div><div className="text-xs text-slate-400">of {Number(line.contract_quantity).toLocaleString()}</div></td>
                  {containers.map((_, containerIndex) => {
                    const key = quantityKey(line.export_order_item_id, containerIndex);
                    const otherAllocated = allocatedNow - Number(quantities[key] || 0);
                    return <td key={containerIndex} className="px-4 py-4"><input aria-label={`${line.product_name} quantity in container ${containerIndex + 1}`} className="field w-28" type="number" min="0" step="0.001" max={Math.max(0, Number(line.remaining_quantity) - otherAllocated)} value={quantities[key] || ""} placeholder="0" onChange={(event) => updateQuantity(line, containerIndex, event.target.value)} /></td>;
                  })}
                  <td className="px-4 py-4"><span className={allocatedNow > 0 ? "font-bold text-forest-700" : "text-slate-400"}>{allocatedNow.toLocaleString()}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {form.client_id && !!contracts.length && !selectedContractIds.length && <div className="py-12 text-center text-sm text-slate-400">Select one or more sales contracts above to choose their products.</div>}
          {form.client_id && !contracts.length && <div className="py-12 text-center text-sm text-slate-400">This client has no remaining contract quantities.</div>}
          {!form.client_id && <div className="py-12 text-center text-sm text-slate-400">Select a client, then choose one or more sales contracts.</div>}
          <div className="grid gap-3 border-t bg-forest-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4"><Summary label="Packages" value={totals.packages.toLocaleString()} /><Summary label="Net weight" value={`${totals.net.toLocaleString()} kg`} /><Summary label="Gross weight" value={`${totals.gross.toLocaleString()} kg`} /><Summary label="Shipment value" value={`${form.currency} ${totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /></div>
        </section>
        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-end"><button disabled={saving || !allocations.length || !allContainersUsed || containers.some((container) => !container.container_number.trim())} className="btn-primary px-6"><Save size={18} /> {saving ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update shipment" : "Create shipment")}</button></div>
      </form>
    </>
  );
}

function quantityKey(lineId, containerIndex) { return `${lineId}:${containerIndex}`; }
function TextField({ label, value, onChange, type = "text", step, required }) { return <label><span className="label">{label}</span><input className="field" required={required} min={type === "number" ? "0" : undefined} step={type === "number" ? step || "0.001" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, onChange, options, required, disabled = false }) { return <label><span className="label">{label}</span><select className="field disabled:cursor-not-allowed disabled:bg-slate-100" required={required} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select...</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function Summary({ label, value }) { return <div><div className="text-xs font-bold uppercase tracking-wide text-forest-600">{label}</div><div className="mt-1 text-lg font-bold text-forest-900">{value}</div></div>; }
