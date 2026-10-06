import { useState } from "react";
import { Modal } from "../ui/overlay";
import { Button } from "../ui/primitives";
import { Field, Textarea } from "../ui/forms";
import { useToast } from "../../context/ToastContext";
import api from "../../data/client";

export default function ReportModal({ open, onClose, targetType, targetId, label }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await api.reports.create({ targetType, targetId, reason });
      toast.success("Thank you. Our team will take a look.");
      setReason("");
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
      title={`Report ${label}`}
      subtitle="Tell us what is wrong. Your report is reviewed by a real person."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!reason.trim()} onClick={send}>Send report</Button></>}
    >
      <Field label="What happened?" htmlFor="report-reason">
        <Textarea id="report-reason" autoFocus rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the problem" />
      </Field>
    </Modal>
  );
}
