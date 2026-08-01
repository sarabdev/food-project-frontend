import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "./Modal";
import { api, messageFromError } from "../lib/api";

const labels = {
  client: "client",
  customs_consignee: "customs consignee"
};

function emptyParty(partyType) {
  return {
    party_type: partyType,
    name: "",
    contact_person: "",
    business_id: "",
    phone: "",
    email: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state_region: "",
    country: "",
    postal_code: ""
  };
}

export function QuickAddPartyModal({ open, partyType, onClose, onCreated }) {
  const [form, setForm] = useState(() => emptyParty(partyType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const partyLabel = labels[partyType] || "business party";

  useEffect(() => {
    if (!open) return;
    setForm(emptyParty(partyType));
    setError("");
  }, [open, partyType]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/parties", form);
      onCreated({ ...form, id: data.id, name: form.name.trim() });
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSaving(false);
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Modal open={open} title={`Add ${partyLabel}`} onClose={() => !saving && onClose()} wide>
      <form onSubmit={save}>
        <p className="mb-5 text-sm text-slate-500">
          The new {partyLabel} will be saved to Business Parties and selected automatically.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={partyType === "client" ? "Client / company name" : "Consignee name"} required wide>
            <input autoFocus className="field" required minLength="2" value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Contact person"><input className="field" value={form.contact_person} onChange={(event) => update("contact_person", event.target.value)} /></Field>
          <Field label="Phone"><input className="field" inputMode="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
          <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="Business / tax ID"><input className="field" value={form.business_id} onChange={(event) => update("business_id", event.target.value)} /></Field>
          <Field label="Country"><input className="field" value={form.country} onChange={(event) => update("country", event.target.value)} /></Field>
          <Field label="Address" wide><input className="field" value={form.address_line_1} onChange={(event) => update("address_line_1", event.target.value)} /></Field>
          <Field label="Address line 2" wide><input className="field" value={form.address_line_2} onChange={(event) => update("address_line_2", event.target.value)} /></Field>
          <Field label="City"><input className="field" value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
          <Field label="State / region"><input className="field" value={form.state_region} onChange={(event) => update("state_region", event.target.value)} /></Field>
          <Field label="Postal code"><input className="field" value={form.postal_code} onChange={(event) => update("postal_code", event.target.value)} /></Field>
        </div>
        {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving || form.name.trim().length < 2}>
            <Save size={18} /> {saving ? "Saving..." : `Save ${partyLabel}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children, required = false, wide = false }) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="label">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      {children}
    </label>
  );
}
