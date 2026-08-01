import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "./Modal";
import { BankAccountFields, emptyBankAccount } from "./BankAccountFields";
import { api, messageFromError } from "../lib/api";

export function QuickAddBankAccountModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyBankAccount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(emptyBankAccount);
    setError("");
  }, [open]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/bank-accounts", form);
      onCreated({ ...form, id: data.id, account_name: form.account_name.trim() });
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Add bank account" onClose={() => !saving && onClose()} wide>
      <form onSubmit={save}>
        <p className="mb-5 text-sm text-slate-500">The account will be saved and selected for this sales contract automatically.</p>
        <BankAccountFields form={form} onChange={setForm} autoFocus />
        {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}><Save size={18} /> {saving ? "Saving..." : "Save bank account"}</button>
        </div>
      </form>
    </Modal>
  );
}
