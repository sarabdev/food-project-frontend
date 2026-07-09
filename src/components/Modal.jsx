import { X } from "lucide-react";

export function Modal({ open, title, children, onClose, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close modal" className="absolute inset-0 bg-ink/55 backdrop-blur-sm" onClick={onClose} />
      <section className={`relative max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? "max-w-4xl" : "max-w-xl"}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}

