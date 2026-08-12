import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { ListToolbar, ToolbarSelect } from "../components/ListToolbar";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const emptyUser = { name: "", email: "", phone: "", role_id: "", password: "" };
const fieldOrder = ["name", "email", "phone", "password", "role_id"];

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const fieldRefs = useRef({});
  const { can } = useAuth();

  const load = () => Promise.all([api.get("/users"), api.get("/roles")]).then(([usersResponse, rolesResponse]) => {
    setUsers(usersResponse.data.users);
    setRoles(rolesResponse.data.roles);
  });
  useEffect(() => { load(); }, []);
  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !needle || [user.name, user.email, user.phone, user.role_name]
        .some((value) => String(value || "").toLowerCase().includes(needle));
      const matchesRole = !roleFilter || String(user.role_id) === roleFilter || user.role_name === roleFilter;
      const matchesStatus = !statusFilter || (statusFilter === "active" ? Boolean(user.is_active) : !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openForm() {
    setForm(emptyUser);
    setError("");
    setFieldErrors({});
    setOpen(true);
    requestAnimationFrame(() => fieldRefs.current.name?.focus());
  }

  function closeForm() {
    if (saving) return;
    setOpen(false);
    setError("");
    setFieldErrors({});
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const revised = { ...current };
      delete revised[field];
      return revised;
    });
    setError("");
  }

  function showValidationErrors(errors, message = "Please correct the highlighted fields.") {
    setFieldErrors(errors);
    setError(message);
    const firstField = fieldOrder.find((field) => errors[field]);
    if (firstField) requestAnimationFrame(() => fieldRefs.current[firstField]?.focus());
  }

  async function save(event) {
    event.preventDefault();
    const clientErrors = validateUser(form);
    if (Object.keys(clientErrors).length) {
      showValidationErrors(clientErrors);
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      await api.post("/users", { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      setOpen(false);
      setForm(emptyUser);
      await load();
    } catch (requestError) {
      const serverErrors = normalizeServerErrors(requestError.response?.data?.errors?.fieldErrors);
      if (Object.keys(serverErrors).length) {
        showValidationErrors(serverErrors, messageFromError(requestError));
      } else {
        setError(messageFromError(requestError));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Access management" title="System users" description="Create accounts and assign a role. Access changes are managed from Roles & Access." action={can("users.create") && <button className="btn-primary" onClick={openForm}><Plus size={18} /> Add user</button>} />
      <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search name, email, phone or role..." count={filteredUsers.length} total={users.length} hasFilters={Boolean(search || roleFilter || statusFilter)} onClear={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }}>
        <ToolbarSelect label="Filter by role" value={roleFilter} onChange={setRoleFilter} options={[["", "All roles"], ...roles.map((role) => [String(role.id), role.name])]} />
        <ToolbarSelect label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={[["", "All statuses"], ["active", "Active"], ["disabled", "Disabled"]]} />
      </ListToolbar>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y">{filteredUsers.map((user) => <tr key={user.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-forest-50 text-forest-700"><UserRound size={17} /></div><div><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-400">{user.email}</div></div></div></td><td className="px-5 py-4">{user.role_name}</td><td className="px-5 py-4 text-slate-500">{user.phone || "—"}</td><td className="px-5 py-4 text-slate-500">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.is_active ? "Active" : "Disabled"}</span></td></tr>)}</tbody>
        </table></div>
        {!filteredUsers.length && <div className="py-16 text-center text-slate-400">{users.length ? "No users match your filters." : "No users have been added."}</div>}
      </div>
      <Modal open={open} title="Add system user" onClose={closeForm}>
        <form onSubmit={save} noValidate className="space-y-5">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <UserField label="Full name" name="name" required value={form.name} error={fieldErrors.name} inputRef={(element) => { fieldRefs.current.name = element; }} onChange={(value) => update("name", value)} />
          <UserField label="Email address" name="email" type="email" required value={form.email} error={fieldErrors.email} inputRef={(element) => { fieldRefs.current.email = element; }} onChange={(value) => update("email", value)} />
          <UserField label="Phone number" name="phone" value={form.phone} error={fieldErrors.phone} inputRef={(element) => { fieldRefs.current.phone = element; }} onChange={(value) => update("phone", value)} />
          <UserField label="Password" name="password" type="password" required value={form.password} error={fieldErrors.password} hint="Use at least 8 characters." inputRef={(element) => { fieldRefs.current.password = element; }} onChange={(value) => update("password", value)} />
          <label htmlFor="user-role"><span className="label">Role <span className="text-red-600">*</span></span><select id="user-role" ref={(element) => { fieldRefs.current.role_id = element; }} className={`field ${fieldErrors.role_id ? "border-red-400 bg-red-50/30" : ""}`} aria-invalid={Boolean(fieldErrors.role_id)} aria-describedby={fieldErrors.role_id ? "user-role-error" : undefined} value={form.role_id} onChange={(event) => update("role_id", event.target.value)}><option value="">Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>{fieldErrors.role_id && <span id="user-role-error" className="mt-1.5 block text-xs font-semibold text-red-600">{fieldErrors.role_id}</span>}</label>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={saving} onClick={closeForm}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? "Creating..." : "Create user"}</button></div>
        </form>
      </Modal>
    </>
  );
}

function UserField({ label, name, value, onChange, inputRef, error, hint, type = "text", required = false }) {
  const inputId = `user-${name}`;
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <label htmlFor={inputId}>
      <span className="label">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <input id={inputId} ref={inputRef} className={`field ${error ? "border-red-400 bg-red-50/30" : ""}`} type={type} autoComplete={name === "password" ? "new-password" : name} aria-invalid={Boolean(error)} aria-describedby={descriptionId} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span id={`${inputId}-error`} className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span> : hint && <span id={`${inputId}-hint`} className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function validateUser(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2) errors.name = "Name must contain at least 2 characters.";
  else if (name.length > 120) errors.name = "Name cannot exceed 120 characters.";
  if (!email) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (form.phone.trim().length > 40) errors.phone = "Phone number cannot exceed 40 characters.";
  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 8) errors.password = "Password must contain at least 8 characters.";
  else if (form.password.length > 72) errors.password = "Password cannot exceed 72 characters.";
  if (!form.role_id) errors.role_id = "Select a role.";
  return errors;
}

function normalizeServerErrors(fieldErrors = {}) {
  return Object.fromEntries(Object.entries(fieldErrors)
    .filter(([, messages]) => Array.isArray(messages) && messages.length)
    .map(([field, messages]) => [field, messages[0]]));
}
