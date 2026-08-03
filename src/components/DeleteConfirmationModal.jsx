import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";

export function DeleteConfirmationModal({ open, title, recordName, description, error, deleting, onClose, onConfirm }) {
  return (
    <Modal open={open} title={title} onClose={deleting ? undefined : onClose}>
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600"><AlertTriangle size={21} /></div>
        <div>
          <p className="font-semibold text-slate-900">Delete {recordName}?</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="mt-7 flex justify-end gap-3">
        <button type="button" className="btn-secondary" disabled={deleting} onClick={onClose}>Cancel</button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={deleting} onClick={onConfirm}><Trash2 size={17} /> {deleting ? "Deleting..." : "Delete permanently"}</button>
      </div>
    </Modal>
  );
}
