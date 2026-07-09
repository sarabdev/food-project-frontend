import { useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role_id: "", password: "" });
  const { can } = useAuth();

  const load = () => Promise.all([api.get("/users"), api.get("/roles")]).then(([usersResponse, rolesResponse]) => {
    setUsers(usersResponse.data.users);
    setRoles(rolesResponse.data.roles);
  });
  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    try {
      await api.post("/users", form);
      setOpen(false);
      setForm({ name: "", email: "", phone: "", role_id: "", password: "" });
      load();
    } catch (requestError) { setError(messageFromError(requestError)); }
  }

  return (
    <>
      <PageHeader eyebrow="Access management" title="System users" description="Create accounts and assign a role. Access changes are managed from Roles & Access." action={can("users.create") && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Add user</button>} />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-forest-50 text-forest-700"><UserRound size={17} /></div><div><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-400">{user.email}</div></div></div></td><td className="px-5 py-4">{user.role_name}</td><td className="px-5 py-4 text-slate-500">{user.phone || "—"}</td><td className="px-5 py-4 text-slate-500">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.is_active ? "Active" : "Disabled"}</span></td></tr>)}</tbody>
        </table></div>
      </div>
      <Modal open={open} title="Add system user" onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-5">
          {["name", "email", "phone", "password"].map((field) => <label key={field}><span className="label">{field}</span><input className="field" required={field !== "phone"} type={field === "password" ? "password" : field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></label>)}
          <label><span className="label">Role</span><select className="field" required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}><option value="">Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary">Create user</button></div>
        </form>
      </Modal>
    </>
  );
}

