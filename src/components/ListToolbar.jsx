import { RotateCcw, Search } from "lucide-react";

export function ListToolbar({ search, onSearchChange, placeholder, count, total, hasFilters, onClear, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-panel lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search</span>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="search"
          className="field pl-11"
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{count} of {total}</span>
        {hasFilters && (
          <button type="button" className="btn-secondary px-3" onClick={onClear}>
            <RotateCcw size={15} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function ToolbarSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className="field min-w-40 py-2.5" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
