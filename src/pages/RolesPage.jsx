import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [saved, setSaved] = useState(false);

  const load = () => api.get("/roles").then(({ data }) => {
    setRoles(data.roles);
    setPermissions(data.permissions);
    if (!selectedId && data.roles[0]) {
      setSelectedId(data.roles[0].id);
      setSelectedPermissions(data.roles[0].permissions);
    }
  });
  useEffect(() => { load(); }, []);
  const selectedRole = roles.find((role) => role.id === selectedId);
  const grouped = useMemo(
    () => permissions.reduce((groups, permission) => {
      groups[permission.module_name] ||= [];
      groups[permission.module_name].push(permission);
      return groups;
    }, {}),
    [permissions]
  );

  function choose(role) {
    setSelectedId(role.id);
    setSelectedPermissions(role.permissions);
    setSaved(false);
  }

  function toggle(key) {
    setSelectedPermissions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setSaved(false);
  }

  async function save() {
    const ids = permissions.filter((permission) => selectedPermissions.includes(permission.permission_key)).map((permission) => permission.id);
    await api.put(`/roles/${selectedId}/permissions`, { permission_ids: ids });
    setSaved(true);
    load();
  }

  return (
    <>
      <PageHeader eyebrow="Access management" title="Roles & permissions" description="Access is permission-driven. Update a role here without changing application code." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="panel overflow-hidden p-3">{roles.map((role) => <button key={role.id} onClick={() => choose(role)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left ${selectedId === role.id ? "bg-forest-800 text-white" : "hover:bg-slate-50"}`}><div className={`grid h-10 w-10 place-items-center rounded-xl ${selectedId === role.id ? "bg-white/10" : "bg-forest-50 text-forest-700"}`}><ShieldCheck size={19} /></div><div><div className="text-sm font-bold">{role.name}</div><div className={`text-xs ${selectedId === role.id ? "text-white/55" : "text-slate-400"}`}>{role.permissions.length} permissions</div></div></button>)}</aside>
        <section className="panel p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between gap-4 border-b pb-5"><div><h2 className="text-lg font-bold">{selectedRole?.name}</h2><p className="text-sm text-slate-500">{selectedRole?.description}</p></div><button onClick={save} className="btn-primary"><Save size={17} /> {saved ? "Saved" : "Save access"}</button></div>
          <div className="grid gap-5 md:grid-cols-2">{Object.entries(grouped).map(([module, modulePermissions]) => <div key={module} className="rounded-2xl border p-4"><h3 className="mb-3 text-sm font-bold capitalize">{module.replaceAll("_", " ")}</h3><div className="space-y-2">{modulePermissions.map((permission) => <label key={permission.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-forest-700" checked={selectedPermissions.includes(permission.permission_key)} onChange={() => toggle(permission.permission_key)} /><span className="text-sm capitalize">{permission.action_name}</span></label>)}</div></div>)}</div>
        </section>
      </div>
    </>
  );
}
