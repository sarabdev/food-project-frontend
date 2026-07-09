import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Boxes, FileCheck2, FileClock, PackageCheck, Plus, UsersRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const [data, setData] = useState({ stats: {}, recentOrders: [] });
  const { can } = useAuth();

  useEffect(() => {
    api.get("/dashboard").then(({ data: response }) => setData(response));
  }, []);

  const cards = [
    { label: "All orders", value: data.stats.total || 0, icon: FileCheck2, color: "bg-forest-50 text-forest-700" },
    { label: "Draft orders", value: data.stats.drafts || 0, icon: FileClock, color: "bg-amber-50 text-amber-700" },
    { label: "Active shipments", value: data.stats.active || 0, icon: PackageCheck, color: "bg-blue-50 text-blue-700" },
    { label: "Products", value: data.stats.products || 0, icon: Boxes, color: "bg-violet-50 text-violet-700" }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Export operations"
        description="A live view of orders, documentation activity and master records."
        action={can("orders.create") && <Link to="/orders/new" className="btn-primary"><Plus size={18} /> New export order</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="panel p-5">
            <div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon size={21} /></div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="mt-1 text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_.8fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div><h2 className="font-bold">Recent orders</h2><p className="text-xs text-slate-500">Latest documentation work</p></div>
            <Link to="/orders" className="text-sm font-semibold text-forest-700">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Value</th><th /></tr></thead>
              <tbody className="divide-y">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold">{order.invoice_number}</td>
                    <td className="px-5 py-4 text-slate-600">{order.client_name}</td>
                    <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-4 text-right font-semibold">{order.currency} {Number(order.client_value).toLocaleString()}</td>
                    <td className="pr-5 text-right"><Link to={`/orders/${order.id}`} className="inline-grid h-9 w-9 place-items-center rounded-lg hover:bg-forest-50 hover:text-forest-700"><ArrowUpRight size={17} /></Link></td>
                  </tr>
                ))}
                {!data.recentOrders.length && <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-400">No export orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel p-6">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-forest-800"><UsersRound /></div>
          <h2 className="text-lg font-bold">Master records</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep products and business parties accurate so every generated document stays consistent.</p>
          <dl className="mt-6 space-y-4">
            <div className="flex justify-between border-b pb-4"><dt className="text-sm text-slate-500">Active clients</dt><dd className="font-bold">{data.stats.clients || 0}</dd></div>
            <div className="flex justify-between border-b pb-4"><dt className="text-sm text-slate-500">System users</dt><dd className="font-bold">{data.stats.users || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-sm text-slate-500">Shipped orders</dt><dd className="font-bold">{data.stats.shipped || 0}</dd></div>
          </dl>
        </aside>
      </div>
    </>
  );
}

