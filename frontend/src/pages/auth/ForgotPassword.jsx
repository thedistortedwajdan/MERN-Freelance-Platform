import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button } from "../../components/ui/primitives";
import { Field, Input } from "../../components/ui/forms";
import Icon from "../../components/ui/Icon";
import api from "../../data/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Let us get you back in"
      subtitle="Enter your email and we will issue a reset code."
      heading="Everyone forgets sometimes. You are still welcome here."
      footer={<Link to="/login" className="font-semibold text-accent-ink hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <div className="rounded-2xl bg-success-soft p-5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-success"><Icon name="check-circle" size={18} /> Request received</div>
          <p className="mt-2 text-fg">If an account exists for <strong>{email}</strong>, a reset code has been issued. Enter it on the next screen to choose a new password.</p>
          <Button to="/reset-password" className="mt-4" iconRight="arrow-right">I have my code</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}
          <Field label="Email" htmlFor="email">
            <Input id="email" icon="mail" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>Send reset code</Button>
        </form>
      )}
    </AuthLayout>
  );
}
