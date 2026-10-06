import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button, cx } from "../../components/ui/primitives";
import { Field, Input } from "../../components/ui/forms";
import Icon from "../../components/ui/Icon";
import { homePathFor, useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const ROLES = [
  { value: "freelancer", icon: "compass", title: "I want to find work", text: "Browse tasks, send proposals and build your name." },
  { value: "employer", icon: "briefcase", title: "I need something done", text: "Post a task and choose from people ready to help." },
];

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: params.get("role") === "employer" ? "employer" : "freelancer" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Tell us what to call you.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (form.password.length < 6) e.password = "Use at least 6 characters.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await register(form);
      const user = await login(form.email, form.password);
      toast.success(`Welcome to GigPilot, ${user.name.split(" ")[0]}.`);
      navigate(homePathFor(user.role), { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const strength = Math.min(4, (form.password.length >= 6) + (form.password.length >= 10) + /[A-Z]/.test(form.password) + /\d/.test(form.password));

  return (
    <AuthLayout
      title="Start something good"
      subtitle="It takes a minute. Your next chapter can begin today."
      heading="Someone out there needs exactly what you do."
      quote="Join people across the country who are turning free hours into real work."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-accent-ink hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors.form ? <div role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"><Icon name="alert" size={17} className="mt-0.5 shrink-0" />{errors.form}</div> : null}
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="I am joining as">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={form.role === r.value}
              onClick={() => setForm({ ...form, role: r.value })}
              className={cx("rounded-2xl border-2 p-4 text-left transition", form.role === r.value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50")}
            >
              <Icon name={r.icon} size={22} className="text-accent-ink" />
              <div className="mt-2 text-sm font-bold">{r.title}</div>
              <div className="mt-0.5 text-xs text-muted">{r.text}</div>
            </button>
          ))}
        </div>
        <Field label="Full name" htmlFor="name" error={errors.name}>
          <Input id="name" icon="user" autoComplete="name" placeholder="Ayesha Khan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" icon="mail" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input id="password" icon="lock" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} invalid={!!errors.password} />
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={cx("h-1.5 flex-1 rounded-full transition", n <= strength ? "bg-accent" : "bg-line")} />
            ))}
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create my account</Button>
      </form>
    </AuthLayout>
  );
}
