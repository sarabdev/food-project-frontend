import { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { messageFromError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "admin@zafood.local", password: "Admin@123" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(form.email, form.password);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-forest-900 p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-forest-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[55px] border-white/5" />
          <div>
            <div className="mb-20 inline-flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-lg font-black text-forest-900">ZA</div>
              <div><div className="font-bold">ZA Food Industries</div><div className="text-sm text-white/50">Export Documentation System</div></div>
            </div>
            <h1 className="max-w-lg text-5xl font-bold leading-[1.08] tracking-tight">Every export document, from one trusted order.</h1>
            <p className="mt-6 max-w-md leading-7 text-white/65">Create contracts, invoices, packing lists and shipping documents without repeating the same data across spreadsheets.</p>
          </div>
          <div className="grid gap-3 text-sm text-white/75">
            {["Automatic order numbering", "Consistent weights and invoice totals", "Role-based access and document history"].map((item) => (
              <div key={item} className="flex items-center gap-3"><CheckCircle2 className="text-gold" size={18} />{item}</div>
            ))}
          </div>
        </section>
        <section className="grid place-items-center p-6 sm:p-12">
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-800 font-black text-white">ZA</div>
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-forest-600">Secure workspace</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to manage export orders and documents.</p>
            <div className="mt-8 space-y-5">
              <label>
                <span className="label">Email address</span>
                <div className="relative"><Mail className="absolute left-3.5 top-3 text-slate-400" size={18} /><input className="field pl-11" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </label>
              <label>
                <span className="label">Password</span>
                <div className="relative"><LockKeyhole className="absolute left-3.5 top-3 text-slate-400" size={18} /><input className="field pl-11" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </label>
            </div>
            {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button disabled={submitting} className="btn-primary mt-7 w-full py-3">
              {submitting ? "Signing in..." : "Sign in"} <ArrowRight size={18} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

