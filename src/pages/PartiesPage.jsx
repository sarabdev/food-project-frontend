import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";
import { ListToolbar, ToolbarSelect } from "../components/ListToolbar";
import { api, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const types = {
  client: "Client",
  customs_consignee: "Customs Consignee",
  notify_party: "Notify Party",
  clearing_agent: "Clearing Agent",
  shipping_company: "Shipping Company"
};
const empty = { party_type: "client", name: "", contact_person: "", business_id: "", phone: "", email: "", address_line_1: "", address_line_2: "", city: "", state_region: "", country: "", postal_code: "" };

export function PartiesPage() {
  const [parties, setParties] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { can } = useAuth();

  const load = () => api.get("/parties").then(({ data }) => setParties(data.parties));
  useEffect(() => { load(); }, []);
  const filteredParties = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return parties.filter((party) => {
      const matchesSearch = !needle || [party.name, party.contact_person, party.business_id, party.phone, party.email, party.city, party.country]
        .some((value) => String(value || "").toLowerCase().includes(needle));
      return matchesSearch && (!filter || party.party_type === filter);
    });
  }, [parties, search, filter]);

  function open(party = null) {
    setEditing(party);
    setForm(party ? { ...party } : empty);
    setError("");
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    try {
      if (editing) await api.put(`/parties/${editing.id}`, form);
      else await api.post("/parties", form);
      setModalOpen(false);
      load();
    } catch (requestError) { setError(messageFromError(requestError)); }
  }

  function requestDelete(party) {
    setDeleteTarget(party);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/parties/${deleteTarget.id}`);
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
      <PageHeader eyebrow="Master data" title="Business parties" description="Manage clients, consignees, notify parties, clearing agents and shipping companies." action={can("parties.create") && <button className="btn-primary" onClick={() => open()}><Plus size={18} /> Add party</button>} />
      <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search name, contact, phone or location..." count={filteredParties.length} total={parties.length} hasFilters={Boolean(search || filter)} onClear={() => { setSearch(""); setFilter(""); }}>
        <ToolbarSelect label="Filter by party type" value={filter} onChange={setFilter} options={[["", "All party types"], ...Object.entries(types)]} />
      </ListToolbar>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredParties.map((party) => (
          <article key={party.id} className="panel p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Building2 size={20} /></div>
              <div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase tracking-wide text-forest-600">{types[party.party_type]}</div><h2 className="mt-1 truncate font-bold">{party.name}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{[party.address_line_1, party.city, party.country].filter(Boolean).join(", ") || "No address added"}</p></div>
              <div className="flex shrink-0 gap-1">
                {can("parties.edit") && <button type="button" aria-label={`Edit ${party.name}`} title="Edit party" onClick={() => open(party)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil size={16} /></button>}
                {can("parties.delete") && <button type="button" aria-label={`Delete ${party.name}`} title="Delete party" onClick={() => requestDelete(party)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button>}
              </div>
            </div>
            <div className="mt-5 border-t pt-4 text-xs text-slate-500">{party.phone || party.email || "No contact information"}</div>
          </article>
        ))}
      </div>
      {!filteredParties.length && <div className="panel py-16 text-center text-slate-400">{parties.length ? "No business parties match your filters." : "No business parties have been added."}</div>}
      <Modal open={modalOpen} title={editing ? "Edit business party" : "Add business party"} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={save}>
          <div className="grid gap-5 md:grid-cols-2">
            <label><span className="label">Party type</span><select className="field" value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value })}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {["name", "contact_person", "business_id", "phone", "email", "address_line_1", "address_line_2", "city", "state_region", "country", "postal_code"].map((field) => (
              <label key={field}><span className="label">{field.replaceAll("_", " ")}</span><input className="field" required={field === "name"} type={field === "email" ? "email" : "text"} value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></label>
            ))}
          </div>
          {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="mt-7 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary">Save party</button></div>
        </form>
      </Modal>
      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete business party"
        recordName={deleteTarget?.name || "this business party"}
        description="The party will no longer appear in Business Parties or in selection lists for new sales contracts and shipments. Existing records that reference this party will be retained."
        affected={["Business Parties listing", "Party selection lists for new records"]}
        retained={["Existing sales contracts", "Shipments", "Ledger and payment history", "Documents"]}
        error={deleteError}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
