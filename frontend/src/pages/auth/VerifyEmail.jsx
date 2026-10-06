import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button, Spinner } from "../../components/ui/primitives";
import { Field, Input } from "../../components/ui/forms";
import Icon from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import api from "../../data/client";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { refreshProfile, isAuthed } = useAuth();
  const [token, setToken] = useState(params.get("token") || "");
  const [state, setState] = useState(params.get("token") ? "working" : "idle");
  const [error, setError] = useState("");
  const tried = useRef(false);

  const verify = async (value) => {
    setState("working");
    setError("");
    try {
      await api.auth.verifyEmail(value.trim());
      setState("done");
      if (isAuthed) refreshProfile();
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  };

  useEffect(() => {
    if (token && !tried.current && params.get("token")) {
      tried.current = true;
      verify(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthLayout title="Confirm your email" subtitle="It helps people trust who they are working with." heading="Trust makes good work possible.">
      {state === "done" ? (
        <div className="rounded-2xl bg-success-soft p-5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-success"><Icon name="check-circle" size={18} /> Your email is confirmed</div>
          <Button to={isAuthed ? "/" : "/login"} className="mt-4" iconRight="arrow-right">Continue</Button>
        </div>
      ) : state === "working" ? (
        <div className="flex items-center gap-3 text-muted"><Spinner /> Checking your code…</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(token); }} className="space-y-4">
          {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}
          <Field label="Verification code" htmlFor="token">
            <Input id="token" icon="shield" required placeholder="Paste your code" value={token} onChange={(e) => setToken(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={!token}>Confirm email</Button>
          <p className="text-center text-sm text-muted">Need a new code? Request one from <Link to="/settings" className="font-semibold text-accent-ink hover:underline">Settings</Link>.</p>
        </form>
      )}
    </AuthLayout>
  );
}
