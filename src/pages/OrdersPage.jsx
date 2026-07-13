import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Edit3, FileStack, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const statuses = [
  ["draft", "Draft"],
  ["confirmed", "Confirmed"],
  ["in_production", "In production"],
  ["ready_to_ship", "Ready to ship"],
  ["shipped", "Shipped"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"]
];

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [savingStatusId, setSavingStatusId] = useState(null);
  const { can } = useAuth();
  const canEdit = can("orders.edit");
  const canDelete = can("orders.delete");
  const canChangeStatus = can("orders.confirm");
  const load = () => api.get("/orders").then(({ data }) => setOrders(data.orders));
  useEffect(() => { load(); }, []);

  async function deleteOrder(order) {
    if (!window.confirm(`Delete order ${order.invoice_number}? This cannot be undone.`)) return;
    await api.delete(`/orders/${order.id}`);
    load();
  }

  async function updateStatus(order, status) {
    if (status === order.status) return;
    setSavingStatusId(order.id);
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    } finally {
      setSavingStatusId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations" title="Export orders" description="One order number connects the sale contract and every customs, client and shipping document." action={can("orders.create") && <Link to="/orders/new" className="btn-primary"><Plus size={18} /> New export order</Link>} />
      <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice / order</th><th className="px-5 py-3">Actual client</th><th className="px-5 py-3">Packages</th><th className="px-5 py-3">Weight (N/G)</th><th className="px-5 py-3">Client value</th><th className="px-5 py-3">Status</th><th /></tr></thead>
        <tbody className="divide-y">{orders.map((order) => {
          const canEditOrder = canEdit && !["shipped", "completed", "cancelled"].includes(order.status);
          const canDeleteOrder = canDelete && !["shipped", "completed"].includes(order.status);
          return <tr key={order.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-bold">{order.invoice_number}</div><div className="text-xs text-slate-400">{new Date(order.contract_date).toLocaleDateString()}</div></td><td className="px-5 py-4">{order.client_name}</td><td className="px-5 py-4">{Number(order.total_packages).toLocaleString()}</td><td className="px-5 py-4">{Number(order.total_net_weight).toLocaleString()} / {Number(order.total_gross_weight).toLocaleString()} kg</td><td className="px-5 py-4 font-semibold">{order.currency} {Number(order.client_value).toLocaleString()}</td><td className="px-5 py-4">{canChangeStatus ? <select className="field min-w-40 py-1.5 text-xs font-semibold capitalize" value={order.status} disabled={savingStatusId === order.id} onChange={(event) => updateStatus(order, event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <StatusBadge status={order.status} />}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-4">{canEditOrder && <Link className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-forest-700" to={`/orders/${order.id}/edit`}><Edit3 size={16} /> Edit</Link>}{canDeleteOrder && <button type="button" onClick={() => deleteOrder(order)} className="inline-flex items-center gap-2 font-semibold text-red-600 hover:text-red-700"><Trash2 size={16} /> Delete</button>}<Link className="inline-flex items-center gap-2 font-semibold text-forest-700" to={`/orders/${order.id}`}>Open <ArrowRight size={16} /></Link></div></td></tr>;
        })}</tbody>
      </table></div>{!orders.length && <div className="py-16 text-center text-slate-400"><FileStack className="mx-auto mb-3" />No export orders yet.</div>}</div>
    </>
  );
}
