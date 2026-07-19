import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Boxes, ChevronRight, FileStack, LayoutDashboard, Landmark, LogOut,
  Menu, ShieldCheck, Truck, UserRoundCog, UsersRound, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view", end: true },
  { to: "/orders", label: "Export Orders", icon: FileStack, permission: "orders.view" },
  { to: "/ledger", label: "Party Ledger", icon: Landmark, permission: "ledger.view" },
  { to: "/products", label: "Products", icon: Boxes, permission: "products.view" },
  { to: "/parties", label: "Business Parties", icon: Truck, permission: "parties.view" },
  { to: "/users", label: "Users", icon: UsersRound, permission: "users.view" },
  { to: "/roles", label: "Roles & Access", icon: ShieldCheck, permission: "roles.manage" }
];

export function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout, can } = useAuth();

  const sidebar = (
    <div className="flex h-full flex-col bg-forest-900 text-white">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold font-black text-forest-900">ZA</div>
          <div>
            <div className="font-bold leading-tight">Export Desk</div>
            <div className="text-xs text-white/55">ZA Food Industries</div>
          </div>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.filter((item) => can(item.permission)).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive ? "bg-white text-forest-900" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={19} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={15} className="opacity-50" />
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><UserRoundCog size={19} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs text-white/50">{user.role_name}</div>
          </div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[285px]">{sidebar}</aside>
        </div>
      )}
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
          <div className="hidden text-sm text-slate-500 lg:block">Export documentation workspace</div>
          <div className="rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700">{user.role_name}</div>
        </header>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
