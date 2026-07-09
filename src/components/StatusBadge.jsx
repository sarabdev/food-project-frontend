const styles = {
  draft: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_production: "bg-amber-100 text-amber-800",
  ready_to_ship: "bg-violet-100 text-violet-700",
  shipped: "bg-emerald-100 text-emerald-700",
  completed: "bg-forest-100 text-forest-700",
  cancelled: "bg-red-100 text-red-700"
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${styles[status] || styles.draft}`}>
      {status?.replaceAll("_", " ")}
    </span>
  );
}

