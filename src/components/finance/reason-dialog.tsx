'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';

/** Demande un motif obligatoire avant une action irréversible (annulation, contre-passation). */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <textarea
        className="input min-h-24"
        placeholder="Pourquoi ? (obligatoire)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
      />
      <div className="mt-4 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Retour</button>
        <button className="btn-primary !bg-rose-600 hover:!bg-rose-700" disabled={reason.trim().length < 3 || pending} onClick={() => onConfirm(reason.trim())}>
          {pending && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
