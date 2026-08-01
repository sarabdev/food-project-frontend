import { useEffect, useState } from "react";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { BankAccountFields, emptyBankAccount } from "../components/BankAccountFields";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function BankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBankAccount);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const { can } = useAuth();

  const load = () => api.get("/bank-accounts").then(({ data }) => setAccounts(data.bank_accounts));
  useEffect(() => { load(); }, []);

  function open(account = null) {
    setEditing(account);
    setForm(account ? { ...emptyBankAccount, ...account } : { ...emptyBankAccount });
    setError("");
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await api.put(`/bank-accounts/${editing.id}`, form);
      else await api.post("/bank-accounts", form);
      setModalOpen(false);
      await load();
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(account) {
    if (!window.confirm(`Remove bank account “${account.account_name}”?`)) return;
    setPageError("");
    try {
      await api.delete(`/bank-accounts/${account.id}`);
      await load();
    } catch (requestError) {
      setPageError(messageFromError(requestError));
    }
  }

  return (
    <>
      <PageHeader eyebrow="Master data" title="Bank accounts" description="Manage payment instructions that can be selected for each sales contract." action={can("bank_accounts.create") && <button className="btn-primary" onClick={() => open()}><Plus size={18} /> Add bank account</button>} />
      {pageError && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{pageError}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((account) => (
          <article key={account.id} className="panel p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><CreditCard size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-forest-600">{account.currency}</div>
                <h2 className="mt-1 font-bold">{account.account_name}</h2>
                <p className="mt-2 text-sm text-slate-500">{account.bank_name}{account.branch_name ? ` · ${account.branch_name}` : ""}</p>
                <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Account: {account.account_number || "—"}</span>
                  <span>SWIFT: {account.swift_code || "—"}</span>
                  <span className="sm:col-span-2">IBAN: {account.iban || "—"}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {can("bank_accounts.edit") && <button aria-label={`Edit ${account.account_name}`} onClick={() => open(account)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil size={16} /></button>}
                {can("bank_accounts.delete") && <button aria-label={`Remove ${account.account_name}`} onClick={() => remove(account)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!accounts.length && <div className="panel py-16 text-center text-slate-400">No bank accounts have been added.</div>}
      <Modal open={modalOpen} title={editing ? "Edit bank account" : "Add bank account"} onClose={() => !saving && setModalOpen(false)} wide>
        <form onSubmit={save}>
          <BankAccountFields form={form} onChange={setForm} autoFocus />
          {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mt-7 flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save bank account"}</button></div>
        </form>
      </Modal>
    </>
  );
}
