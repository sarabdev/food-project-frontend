export const emptyBankAccount = {
  account_name: "",
  beneficiary_name: "Z.A FOOD INDUSTRIES",
  bank_name: "",
  branch_name: "",
  account_number: "",
  iban: "",
  swift_code: "",
  currency: "USD",
  correspondent_bank: "",
  correspondent_account: "",
  correspondent_swift_code: "",
  instructions: ""
};

export function BankAccountFields({ form, onChange, autoFocus = false }) {
  const field = (name, value) => onChange({ ...form, [name]: value });
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Input label="Account label" required wide autoFocus={autoFocus} value={form.account_name} onChange={(value) => field("account_name", value)} placeholder="Example: Dubai Islamic Bank - USD" />
      <Input label="Beneficiary name" required value={form.beneficiary_name} onChange={(value) => field("beneficiary_name", value)} />
      <Input label="Currency" required value={form.currency} onChange={(value) => field("currency", value.toUpperCase())} placeholder="USD" />
      <Input label="Bank name" required value={form.bank_name} onChange={(value) => field("bank_name", value)} />
      <Input label="Branch" value={form.branch_name} onChange={(value) => field("branch_name", value)} />
      <Input label="Account number" value={form.account_number} onChange={(value) => field("account_number", value)} />
      <Input label="IBAN" value={form.iban} onChange={(value) => field("iban", value.toUpperCase())} />
      <Input label="SWIFT code" value={form.swift_code} onChange={(value) => field("swift_code", value.toUpperCase())} />
      <div className="md:col-span-2 mt-1 border-t pt-5">
        <h3 className="font-bold">Correspondent bank <span className="font-normal text-slate-400">(optional)</span></h3>
        <p className="mt-1 text-xs text-slate-500">Use these fields when payment routes through an intermediary bank.</p>
      </div>
      <Input label="Correspondent bank" value={form.correspondent_bank} onChange={(value) => field("correspondent_bank", value)} />
      <Input label="Correspondent account" value={form.correspondent_account} onChange={(value) => field("correspondent_account", value)} />
      <Input label="Correspondent SWIFT" value={form.correspondent_swift_code} onChange={(value) => field("correspondent_swift_code", value.toUpperCase())} />
      <label className="md:col-span-2"><span className="label">Payment instructions</span><textarea className="field min-h-20" maxLength="500" value={form.instructions || ""} onChange={(event) => field("instructions", event.target.value)} /></label>
    </div>
  );
}

function Input({ label, value, onChange, required = false, wide = false, autoFocus = false, placeholder = "" }) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="label">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <input className="field" required={required} minLength={required ? 2 : undefined} autoFocus={autoFocus} placeholder={placeholder} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
