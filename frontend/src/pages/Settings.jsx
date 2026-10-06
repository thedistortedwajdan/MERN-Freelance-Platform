import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Avatar, Button, Card, Chip } from "../components/ui/primitives";
import { Field, Input, Segmented } from "../components/ui/forms";
import { ConfirmDialog } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import api from "../data/client";

function Section({ title, hint, children }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-medium">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export default function Settings() {
  useDocumentTitle("Settings");
  const { user, profile, refreshProfile, logout } = useAuth();
  const { pref, setPref } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState(false);
  const blocks = useAsync(() => (user.role === "admin" ? Promise.resolve([]) : api.users.blocks()), []);

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      await fn();
      if (message) toast.success(message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <Container narrow className="space-y-6 py-8 sm:py-12">
      <div>
        <h1 className="font-display text-3xl font-medium sm:text-5xl">Settings</h1>
        <p className="mt-2 text-muted">Make GigPilot feel like yours.</p>
      </div>

      <Card className="flex items-center gap-4">
        <Avatar name={user.name} src={profile?.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{user.name}</div>
          <div className="truncate text-sm text-muted">{profile?.email}</div>
        </div>
        <Chip tone="accent" className="capitalize">{user.role}</Chip>
      </Card>

      <Section title="Appearance" hint="Light for daytime, a calm pre-dawn sky for the evening. Or let your device decide.">
        <Segmented
          value={pref}
          onChange={setPref}
          options={[
            { value: "light", label: "Light", icon: "sun" },
            { value: "dark", label: "Dark", icon: "moon" },
            { value: "system", label: "Automatic", icon: "sparkles" },
          ]}
        />
      </Section>

      <Section title="Email" hint={profile?.emailVerified ? "Your email is confirmed." : "Confirm your email so people can trust who they are working with."}>
        {profile?.emailVerified ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><Icon name="check-circle" size={18} /> Confirmed</div>
        ) : (
          <div className="space-y-4">
            <Button variant="secondary" icon="mail" loading={busy === "resend"} onClick={() => run("resend", () => api.auth.resendVerification(), "A new code has been issued.")}>Send me a code</Button>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run("verify", async () => { await api.auth.verifyEmail(code.trim()); await refreshProfile(); setCode(""); }, "Email confirmed. Thank you.");
              }}
            >
              <Input aria-label="Verification code" placeholder="Paste your code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button type="submit" loading={busy === "verify"} disabled={!code.trim()}>Confirm</Button>
            </form>
          </div>
        )}
      </Section>

      <Section title="Password" hint="Choose something at least 6 characters long.">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            run("pw", async () => { await api.users.updateMe({ password: pw }); setPw(""); }, "Password updated.");
          }}
        >
          <Field className="flex-1"><Input type="password" autoComplete="new-password" aria-label="New password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Button type="submit" loading={busy === "pw"} disabled={pw.length < 6}>Update password</Button>
        </form>
      </Section>

      {user.role !== "admin" ? (
        <Section title="Blocked people" hint="Blocked people cannot message you, send proposals on your tasks, or accept them.">
          {blocks.data?.length ? (
            <ul className="space-y-2">
              {blocks.data.map((b) => (
                <li key={b._id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <Avatar name={b.name} size={36} />
                  <span className="flex-1 truncate font-semibold">{b.name}</span>
                  <Button size="sm" variant="secondary" onClick={() => run(`ub${b._id}`, async () => { await api.users.unblock(b._id); blocks.reload(true); }, "Unblocked.")}>Unblock</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">You have not blocked anyone. Hopefully you never need to.</p>
          )}
        </Section>
      ) : null}

      <Section title="Sessions">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon="log-out" onClick={() => setConfirm(true)}>Sign out everywhere</Button>
          <Button variant="ghost" onClick={async () => { await logout(); navigate("/"); }}>Sign out</Button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={busy === "all"}
        title="Sign out on every device?"
        confirmLabel="Sign out everywhere"
        onConfirm={() => run("all", async () => { await api.auth.logoutAll(); await logout(); navigate("/login"); })}
      >
        You will need to sign in again wherever you are using GigPilot.
      </ConfirmDialog>
    </Container>
  );
}
