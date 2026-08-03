import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Edit3, PackageCheck, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const statuses = [
  ["draft", "Draft"], ["ready_to_ship", "Ready to ship"], ["shipped", "Shipped"],
  ["completed", "Completed"], ["cancelled", "Cancelled"]
];

export function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { can } = useAuth();
  const gatePassOnly = can("gate_pass.view") && !can("documents.preview") && !can("orders.edit");
  const load = () => api.get("/shipments").then(({ data }) => setShipments(data.shipments));
  useEffect(() => { load(); }, []);

  async function updateStatus(shipment, status) {
    if (status === shipment.status) return;
    setSavingId(shipment.id);
    try {
      await api.patch(`/shipments/${shipment.id}/status`, { status });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  function requestDelete(shipment) {
    setDeleteTarget(shipment);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/shipments/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (requestError) {
      setDeleteError(messageFromError(requestError));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment"
        title="Shipments"
        description="Combine remaining quantities from one or more sales contracts into the documents for an actual dispatch."
        action={can("orders.create") && <Link to="/shipments/new" className="btn-primary"><Plus size={18} /> New shipment</Link>}
      />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Shipment</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Contracts</th><th className="px-5 py-3">Containers</th><th className="px-5 py-3">Packages</th><th className="px-5 py-3">Weight (N/G)</th>{!gatePassOnly && <th className="px-5 py-3">Value</th>}<th className="px-5 py-3">Status</th><th /></tr></thead>
            <tbody className="divide-y">{shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-slate-50">
                <td className="px-5 py-4"><div className="font-bold">{shipment.shipment_number}</div><div className="text-xs text-slate-400">{new Date(shipment.shipment_date).toLocaleDateString()}</div></td>
                <td className="px-5 py-4">{shipment.client_name}</td>
                <td className="px-5 py-4">{shipment.contract_count}</td>
                <td className="px-5 py-4">{shipment.container_count}</td>
                <td className="px-5 py-4">{Number(shipment.total_packages).toLocaleString()}</td>
                <td className="px-5 py-4">{Number(shipment.total_net_weight).toLocaleString()} / {Number(shipment.total_gross_weight).toLocaleString()} kg</td>
                {!gatePassOnly && <td className="px-5 py-4 font-semibold">{shipment.currency} {Number(shipment.client_value).toLocaleString()}</td>}
                <td className="px-5 py-4">{can("orders.confirm") ? <select className="field min-w-36 py-1.5 text-xs font-semibold" disabled={savingId === shipment.id} value={shipment.status} onChange={(event) => updateStatus(shipment, event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <StatusBadge status={shipment.status} />}</td>
                <td className="px-5 py-4 text-right"><div className="flex items-center justify-end gap-4">{can("orders.edit") && !["shipped", "completed", "cancelled"].includes(shipment.status) && <Link className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-forest-700" to={`/shipments/${shipment.id}/edit`}><Edit3 size={15} /> Edit</Link>}{can("orders.delete") && !["shipped", "completed"].includes(shipment.status) && <button type="button" onClick={() => requestDelete(shipment)} className="inline-flex items-center gap-2 font-semibold text-red-600 hover:text-red-700"><Trash2 size={15} /> Delete</button>}<Link className="inline-flex items-center gap-2 font-semibold text-forest-700" to={`/shipments/${shipment.id}`}>Open <ArrowRight size={16} /></Link></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!shipments.length && <div className="py-16 text-center text-slate-400"><PackageCheck className="mx-auto mb-3" />No shipments created yet.</div>}
      </div>
      <DeleteConfirmationModal open={Boolean(deleteTarget)} title="Delete shipment" recordName={deleteTarget?.shipment_number || "this shipment"} description="This permanently removes the shipment, its containers, allocations and document history. The allocated quantities will become available on their Sales Contracts again." error={deleteError} deleting={deleting} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </>
  );
}
