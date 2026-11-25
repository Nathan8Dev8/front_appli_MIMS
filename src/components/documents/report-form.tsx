'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import { UploadIcon } from '@/components/ui/icons';
import { RichEditor } from '@/components/documents/rich-editor';
import { formatDate } from '@/lib/format';
import type { AppDocument, AppEvent } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const longDate = (iso: string) => formatDate(`${iso}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' });

/** Brouillon gardé sur l'appareil : un rapport ne se perd pas si l'appli se ferme. Peut être indisponible (navigation privée). */
function loadDraft(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as { title: string; date: string; eventId: string; html: string } | null;
  } catch {
    return null;
  }
}
function saveDraft(key: string, value: object | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // stockage indisponible : tant pis, l'enregistrement sur le serveur reste possible
  }
}

/** Séances auxquelles un rapport peut se rattacher : passées ou du jour, non annulées, de la plus récente à la plus ancienne. */
function useSessions() {
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: () => api.get<AppEvent[]>('/events') });
  return (events ?? [])
    .filter((e) => e.status !== 'ANNULE' && new Date(e.startsAt).getTime() < Date.now() + 86_400_000)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

function SessionFields({
  title,
  setTitle,
  date,
  setDate,
  eventId,
  setEventId,
  sessions,
}: {
  title: string;
  setTitle: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  eventId: string;
  setEventId: (v: string) => void;
  sessions: AppEvent[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
      <div className="md:col-span-2">
        <label className="label" htmlFor="rep-event">Séance concernée <span className="font-normal normal-case text-ink-500">(facultatif)</span></label>
        <select
          id="rep-event"
          className="input"
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            const ev = sessions.find((s) => s.id === e.target.value);
            if (ev) {
              setDate(ev.startsAt.slice(0, 10));
              setTitle(`Rapport de séance du ${longDate(ev.startsAt.slice(0, 10))} — ${ev.title}`);
            }
          }}
        >
          <option value="">Aucune (rapport libre)</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {formatDate(s.startsAt)} · {s.title}
              {s.reportDocument ? ' (a déjà un rapport)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rep-title">Titre</label>
        <input id="rep-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="rep-date">Date de la séance</label>
        <input id="rep-date" type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
      </div>
    </div>
  );
}

/** Écrire un nouveau rapport, ou modifier un rapport écrit existant (`document`). */
export function WriteReportForm({ document, initialEventId }: { document?: AppDocument & { contentHtml?: string | null }; initialEventId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const draftKey = `mims-rapport-${document?.id ?? 'nouveau'}`;
  const [title, setTitle] = useState(document?.title ?? `Rapport de séance du ${longDate(today())}`);
  const [date, setDate] = useState(document?.documentDate?.slice(0, 10) ?? today());
  const [eventId, setEventId] = useState(document?.reportFor?.id ?? initialEventId ?? '');
  const [html, setHtml] = useState(document?.contentHtml ?? '');
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);

  // On reprend le brouillon laissé sur cet appareil.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const draft = loadDraft(draftKey);
    if (draft && draft.html && draft.html !== (document?.contentHtml ?? '')) {
      setTitle(draft.title);
      setDate(draft.date);
      setEventId(draft.eventId);
      setHtml(draft.html);
      setRestored(true);
    }
  }, [draftKey, document]);

  // Préremplit à partir de la séance passée dans l'adresse (?event=…).
  useEffect(() => {
    if (document || !initialEventId || restored) return;
    const ev = sessions.find((s) => s.id === initialEventId);
    if (ev) {
      setDate(ev.startsAt.slice(0, 10));
      setTitle(`Rapport de séance du ${longDate(ev.startsAt.slice(0, 10))} — ${ev.title}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  // Sauvegarde automatique sur l'appareil, une seconde après la dernière frappe.
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => saveDraft(draftKey, { title, date, eventId, html }), 1000);
    return () => clearTimeout(t);
  }, [draftKey, title, date, eventId, html]);

  const linked = sessions.find((s) => s.id === eventId);
  const save = useMutation({
    mutationFn: (publish: boolean) =>
      document
        ? api.patch<AppDocument>(`/documents/${document.id}`, { title, documentDate: date, contentHtml: html, eventId: eventId || undefined })
        : api.post<AppDocument>('/documents/written', {
            type: linked?.kind === 'ASSISE' ? 'ASSISE' : 'PV',
            title,
            documentDate: date,
            contentHtml: html,
            eventId: eventId || undefined,
            publish,
          }),
    onSuccess: (doc, publish) => {
      saveDraft(draftKey, null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(
        document ? 'Rapport enregistré ✅' : publish || eventId ? 'Rapport publié, tout le monde est prévenu ✅' : 'Rapport gardé en brouillon ✅ Publie-le quand il est prêt.',
      );
      router.push(`/documents/${doc.id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le rapport n'a pas été enregistré. Ton texte est gardé sur cet appareil, réessaie."),
  });

  const empty = !html.replace(/<[^>]*>/g, '').trim();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(true);
      }}
    >
      {restored && (
        <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm text-ink-900">
          ✏️ On a retrouvé ton texte non enregistré sur cet appareil.{' '}
          <button
            type="button"
            className="font-semibold text-mims-700 underline"
            onClick={() => {
              saveDraft(draftKey, null);
              setHtml(document?.contentHtml ?? '');
              setRestored(false);
              router.refresh();
            }}
          >
            Repartir de zéro
          </button>
        </p>
      )}
      <SessionFields title={title} setTitle={setTitle} date={date} setDate={setDate} eventId={eventId} setEventId={setEventId} sessions={sessions} />
      <div>
        <span className="label">Le rapport</span>
        {/* key : l'éditeur repart du brouillon retrouvé. */}
        <RichEditor key={restored ? 'draft' : 'base'} value={html} onChange={setHtml} />
        <p className="mt-1.5 text-xs text-ink-500">Ton texte est sauvegardé automatiquement sur cet appareil pendant que tu écris.</p>
      </div>
      <div className="sticky bottom-24 z-10 flex flex-col-reverse gap-3 rounded-2xl bg-white/90 p-3 shadow-card backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>Annuler</button>
        {!document && !eventId && (
          <button type="button" className="btn-secondary" disabled={save.isPending || empty || !title || !date} onClick={() => save.mutate(false)}>
            Garder en brouillon
          </button>
        )}
        <button type="submit" className="btn-primary !py-3 text-base" disabled={save.isPending || empty || !title || !date}>
          {save.isPending && <Spinner />}
          {document ? 'Enregistrer' : 'Publier le rapport'}
        </button>
      </div>
    </form>
  );
}

/** Importer un rapport déjà prêt : PDF, Word, ou photo du rapport papier. */
export function UploadReportForm({ initialEventId }: { initialEventId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const [title, setTitle] = useState(`Rapport de séance du ${longDate(today())}`);
  const [date, setDate] = useState(today());
  const [eventId, setEventId] = useState(initialEventId ?? '');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const ev = sessions.find((s) => s.id === initialEventId);
    if (ev) {
      setDate(ev.startsAt.slice(0, 10));
      setTitle(`Rapport de séance du ${longDate(ev.startsAt.slice(0, 10))} — ${ev.title}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  const linked = sessions.find((s) => s.id === eventId);
  const send = useMutation({
    mutationFn: async (publish: boolean) => {
      const form = new FormData();
      form.append('type', linked?.kind === 'ASSISE' ? 'ASSISE' : 'PV');
      form.append('title', title);
      form.append('documentDate', date);
      if (eventId) form.append('eventId', eventId);
      form.append('file', file!);
      const doc = await api.post<AppDocument>('/documents', form);
      // Rattaché à une séance, il est déjà publié par le serveur.
      return publish && !eventId ? api.post<AppDocument>(`/documents/${doc.id}/publish`) : doc;
    },
    onSuccess: (doc, publish) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(publish || eventId ? 'Rapport publié, tout le monde est prévenu ✅' : 'Rapport gardé en brouillon ✅');
      router.push(`/documents/${doc.id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Le fichier n'a pas été envoyé. Réessaie."),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate(true);
      }}
    >
      <SessionFields title={title} setTitle={setTitle} date={date} setDate={setDate} eventId={eventId} setEventId={setEventId} sessions={sessions} />
      <div>
        <span className="label">Le fichier</span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300/60 bg-white px-4 py-10 text-center hover:border-mims-400">
          <UploadIcon width={28} height={28} className="text-mims-700" />
          <span className="text-base font-semibold text-ink-900">{file ? file.name : 'Choisir un fichier ou prendre une photo'}</span>
          <span className="text-sm text-ink-500">PDF, Word, ou photo du rapport papier</span>
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.odt,.txt,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>Annuler</button>
        {!eventId && (
          <button type="button" className="btn-secondary" disabled={send.isPending || !file || !title || !date} onClick={() => send.mutate(false)}>
            Garder en brouillon
          </button>
        )}
        <button type="submit" className="btn-primary !py-3 text-base" disabled={send.isPending || !file || !title || !date}>
          {send.isPending && <Spinner />} Publier le rapport
        </button>
      </div>
    </form>
  );
}
