import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { Avatar, Button, Card, Chip } from "../ui/primitives";
import { Field, FileUploader, Input, Textarea } from "../ui/forms";
import { ConfirmDialog, Modal } from "../ui/overlay";
import { useToast } from "../../context/ToastContext";
import { money, plural, timeAgo } from "../../lib/format";
import api from "../../data/client";

const PROPOSAL_TONE = { pending: "info", accepted: "success", rejected: "neutral", withdrawn: "neutral" };
const PROPOSAL_LABEL = { pending: "Pending", accepted: "Accepted", rejected: "Not selected", withdrawn: "Withdrawn" };

export function ProposalStatus({ status }) {
  return <Chip tone={PROPOSAL_TONE[status]}>{PROPOSAL_LABEL[status] || status}</Chip>;
}

/** Generic "write a note, then confirm" dialog used for cancel, revision and dispute. */
export function PromptModal({ open, onClose, title, subtitle, label, placeholder, confirmLabel, required = true, tone = "primary", onSubmit }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const go = async () => {
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText("");
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={busy} disabled={required && !text.trim()} onClick={go}>{confirmLabel}</Button>
        </>
      }
    >
      <Field label={label} htmlFor="prompt-text" optional={!required}>
        <Textarea id="prompt-text" autoFocus rows={4} maxLength={2000} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** Freelancer: send a bid. */
export function ProposalForm({ task, onSent }) {
  const toast = useToast();
  const [form, setForm] = useState({ price: task.price ?? "", etaDays: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.proposals.submit(task._id, form);
      toast.success("Proposal sent. Good luck!");
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your price" htmlFor="p-price" hint={`Budget is ${money(task.price)}`}>
          <Input id="p-price" type="number" min="1" step="1" inputMode="numeric" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </Field>
        <Field label="Days to finish" htmlFor="p-eta" optional>
          <Input id="p-eta" type="number" min="1" max="3650" inputMode="numeric" placeholder="e.g. 3" value={form.etaDays} onChange={(e) => setForm({ ...form, etaDays: e.target.value })} />
        </Field>
      </div>
      <Field label="Introduce yourself" htmlFor="p-msg" hint="Why are you a good fit? What would you do first?">
        <Textarea id="p-msg" rows={4} maxLength={2000} required placeholder="Hi! I would love to help with this…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full" size="lg" icon="send" loading={busy} disabled={!form.price || !form.message.trim()}>Send proposal</Button>
    </form>
  );
}

/** Freelancer: the proposal they already sent. */
export function MyProposal({ proposal, task, onChange }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const withdraw = async () => {
    setBusy(true);
    try {
      await api.proposals.withdraw(proposal._id);
      toast.info("Proposal withdrawn.");
      setConfirm(false);
      onChange();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Your proposal</h3>
        <ProposalStatus status={proposal.status} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-medium">{money(proposal.price)}</span>
        {proposal.price !== task.price ? <span className="text-sm text-muted">vs {money(task.price)} budget</span> : null}
      </div>
      {proposal.etaDays ? <p className="text-sm text-muted">Ready in {plural(proposal.etaDays, "day")}</p> : null}
      <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{proposal.message}</p>
      {proposal.status === "pending" ? (
        <>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setConfirm(true)}>Withdraw proposal</Button>
          <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={withdraw} loading={busy} title="Withdraw your proposal?" confirmLabel="Withdraw">
            The employer will no longer see it. You can send a new one while the task is still open.
          </ConfirmDialog>
        </>
      ) : null}
    </div>
  );
}

/** Employer: review bids. */
export function ProposalList({ task, proposals, onChange }) {
  const toast = useToast();
  const [accepting, setAccepting] = useState(null);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      await api.proposals.accept(accepting._id);
      toast.success(`${accepting.freelancer.name} is on the job. Say hello in Messages.`);
      setAccepting(null);
      onChange();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const reject = async (p) => {
    try {
      await api.proposals.reject(p._id);
      toast.info("Proposal declined.");
      onChange();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!proposals.length) {
    return (
      <Card>
        <h2 className="font-display text-xl font-medium">Proposals</h2>
        <p className="mt-2 text-sm text-muted">No proposals yet. Hang tight. Tasks like this usually hear back within a day.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-medium">Proposals <span className="text-base text-muted">({proposals.length})</span></h2>
      <ul className="mt-4 space-y-3">
        {proposals.map((p) => (
          <li key={p._id} className="rounded-2xl border border-line p-4">
            <div className="flex items-start gap-3">
              <Avatar name={p.freelancer?.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/users/${p.freelancer?._id}`} className="font-bold hover:underline">{p.freelancer?.name}</Link>
                  <ProposalStatus status={p.status} />
                  <span className="text-xs text-muted">{timeAgo(p.createdAt)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="font-display text-xl font-medium">{money(p.price)}</span>
                  {p.price < task.price ? <span className="font-semibold text-success">{money(task.price - p.price)} under budget</span> : p.price > task.price ? <span className="font-semibold text-accent-ink">{money(p.price - task.price)} over budget</span> : null}
                  {p.etaDays ? <span className="text-muted">· {plural(p.etaDays, "day")}</span> : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.message}</p>
              </div>
            </div>
            {p.status === "pending" && task.status === "open" ? (
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => reject(p)}>Decline</Button>
                <Button size="sm" icon="check" onClick={() => setAccepting(p)}>Choose {p.freelancer?.name.split(" ")[0]}</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog open={!!accepting} onClose={() => setAccepting(null)} onConfirm={accept} loading={busy} title={`Choose ${accepting?.freelancer?.name}?`} confirmLabel="Choose and start">
        {accepting ? <>The task will be assigned at <strong>{money(accepting.price)}</strong> and the other proposals will be declined.</> : null}
      </ConfirmDialog>
    </Card>
  );
}

/** Freelancer: hand the work in. */
export function SubmitWorkModal({ open, onClose, task, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await api.tasks.submit(task._id, { note, attachmentIds: files.map((f) => f._id) });
      toast.success("Nicely done. Your work is with the employer for review.");
      setNote("");
      setFiles([]);
      onClose();
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Hand in your work"
      subtitle="Add a note and any files. The employer can approve it or ask for changes."
      footer={<><Button variant="ghost" onClick={onClose}>Not yet</Button><Button loading={busy} icon="upload" onClick={send}>Submit for review</Button></>}
    >
      <div className="space-y-4">
        <Field label="Note to the employer" htmlFor="submit-note" optional>
          <Textarea id="submit-note" rows={3} maxLength={2000} placeholder="What did you do? Anything they should know?" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Files" optional>
          <FileUploader files={files} onChange={setFiles} />
        </Field>
      </div>
    </Modal>
  );
}
