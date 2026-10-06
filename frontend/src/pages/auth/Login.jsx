import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button } from "../../components/ui/primitives";
import { Field, Input } from "../../components/ui/forms";
import Icon from "../../components/ui/Icon";
import { homePathFor, useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "We could not sign you in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Pick up right where you left off."
      quote="Small steps, taken every day, are how most good things begin."
      footer={<>New here? <Link to="/register" className="font-semibold text-accent-ink hover:underline">Create your account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            <Icon name="alert" size={17} className="mt-0.5 shrink-0" /> {error}
          </div>
        ) : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" icon="mail" type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input id="password" icon="lock" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-16" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-fg">
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-accent-ink hover:underline">Forgot your password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!form.email || !form.password}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
