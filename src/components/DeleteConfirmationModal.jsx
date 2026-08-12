import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";

export function DeleteConfirmationModal({ open, title, recordName, description, affected = [], retained = [], error, deleting, onClose, onConfirm }) {
  return (
    <Modal open={open} title={title} onClose={deleting ? undefined : onClose}>
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600"><AlertTriangle size={21} /></div>
        <div>
          <p className="font-semibold text-slate-900">Delete {recordName}?</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          {affected.length > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-red-700">Will be hidden</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {affected.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {retained.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Shared records retained</div>
              <p className="mt-1 text-sm leading-5 text-slate-500">{retained.join(", ")} are not deleted because they may be used elsewhere.</p>
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-slate-500">This is a soft delete. The records remain in the database for recovery and audit purposes.</p>
        </div>
      </div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="mt-7 flex justify-end gap-3">
        <button type="button" className="btn-secondary" disabled={deleting} onClick={onClose}>Cancel</button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={deleting} onClick={onConfirm}><Trash2 size={17} /> {deleting ? "Deleting..." : "Confirm soft delete"}</button>
      </div>
    </Modal>
  );
}
