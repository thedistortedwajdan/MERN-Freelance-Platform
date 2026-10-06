import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button } from "../../components/ui/primitives";
import { Field, Input } from "../../components/ui/forms";
import { useToast } from "../../context/ToastContext";
import api from "../../data/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.auth.resetPassword({ token: token.trim(), password });
      toast.success("Password updated. You can sign in now.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Make it something you will remember."
      heading="A fresh start is one password away."
      footer={<Link to="/login" className="font-semibold text-accent-ink hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}
        <Field label="Reset code" htmlFor="token">
          <Input id="token" icon="shield" required autoComplete="one-time-code" placeholder="Paste your code" value={token} onChange={(e) => setToken(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="password" hint="At least 6 characters.">
          <Input id="password" icon="lock" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!token || password.length < 6}>Update password</Button>
      </form>
    </AuthLayout>
  );
}
