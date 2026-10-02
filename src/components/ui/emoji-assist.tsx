'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Bouton 🙂 qui apparaît dans tout champ de texte libre (input texte, textarea)
 * quand il a le focus, et insère l'emoji choisi à l'endroit du curseur.
 * Un seul composant pour toute l'appli : aucun formulaire n'a besoin d'être modifié.
 * Un champ peut s'en passer avec l'attribut `data-no-emoji`.
 */
const GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Sourires', emojis: ['😀', '😄', '😂', '🤣', '😊', '😇', '🥰', '😍', '😎', '🤩', '🥳', '😉', '😅', '🤔', '😮', '😢', '😭', '🙃'] },
  { label: 'Gestes', emojis: ['🙏', '👏', '🙌', '👍', '👌', '✌️', '💪', '🤝', '👋', '✊', '🫶', '👀'] },
  { label: 'Cœurs & fête', emojis: ['❤️', '💙', '💛', '💚', '💜', '🧡', '✨', '🔥', '⭐', '🎉', '🎊', '🎂', '🎁', '🎶', '🌸', '☀️'] },
  { label: 'Foi', emojis: ['✝️', '🕊️', '⛪', '📖', '🛐', '💒', '🌅', '🕯️'] },
  { label: 'Pratique', emojis: ['📅', '📍', '⏰', '📢', '📝', '📄', '💰', '💵', '✅', '❌', '⚠️', '❓', '💬', '📞', '🍽️', '🚗'] },
];

type Field = HTMLInputElement | HTMLTextAreaElement;

function isTextField(el: EventTarget | null): el is Field {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled && !el.closest('[data-no-emoji]');
  if (el instanceof HTMLInputElement) {
    return el.type === 'text' && !el.readOnly && !el.disabled && !el.closest('[data-no-emoji]');
  }
  return false;
}

/** Insère le texte au curseur en passant par le setter natif, pour que React voie le changement (onChange). */
function insertAtCursor(el: Field, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  if (el.maxLength > 0 && next.length > el.maxLength) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
  el.focus();
}

export function EmojiAssist() {
  const [field, setField] = useState<Field | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restorePadding = useRef<() => void>(() => undefined);
  // Sur mobile, toucher la palette peut retirer le focus au champ : on ne ferme pas pendant ce toucher.
  const touching = useRef(false);

  const measure = useCallback(() => setRect(field?.getBoundingClientRect() ?? null), [field]);

  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      if (!isTextField(e.target)) return;
      const el = e.target;
      restorePadding.current();
      // Laisse la place au bouton pour que le texte ne passe pas dessous.
      const previous = el.style.paddingRight;
      el.style.paddingRight = '2.75rem';
      restorePadding.current = () => (el.style.paddingRight = previous);
      setField(el);
    }
    function onFocusOut(e: FocusEvent) {
      // Le focus part vers la palette elle-même : on garde tout ouvert.
      if (panelRef.current?.contains(e.relatedTarget as Node)) return;
      setTimeout(() => {
        if (touching.current || isTextField(document.activeElement)) return;
        restorePadding.current();
        restorePadding.current = () => undefined;
        setField(null);
        setOpen(false);
      }, 120);
    }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!field) return;
    measure();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      document.removeEventListener('keydown', onKey);
    };
  }, [field, measure]);

  if (!field || !rect || rect.width === 0) return null;

  const isArea = field instanceof HTMLTextAreaElement;
  const buttonTop = isArea ? rect.top + 6 : rect.top + rect.height / 2 - 16;
  // La palette s'ouvre sous le champ, ou au-dessus s'il est dans la moitié basse de l'écran (clavier mobile).
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const below = rect.top < viewportHeight / 2;
  const width = Math.min(320, window.innerWidth - 32);
  const left = Math.min(Math.max(16, rect.right - width), window.innerWidth - width - 16);

  // preventDefault au mousedown : le champ garde le focus (et le curseur) pendant le choix.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const startTouch = () => (touching.current = true);
  const endTouch = () => setTimeout(() => (touching.current = false), 300);

  return (
    <>
      <button
        type="button"
        aria-label="Ajouter un emoji"
        aria-expanded={open}
        onMouseDown={keepFocus}
        onPointerDown={startTouch}
        onClick={() => {
          setOpen((o) => !o);
          field.focus();
          endTouch();
        }}
        className="fixed z-[60] flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-mims-50"
        style={{ top: buttonTop, left: rect.right - 38 }}
      >
        🙂
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Emojis"
          onMouseDown={keepFocus}
          onPointerDown={startTouch}
          onPointerUp={endTouch}
          className="fixed z-[60] max-h-72 overflow-y-auto rounded-2xl bg-white p-3 shadow-lift ring-1 ring-ink-300/40"
          style={{ width, left, ...(below ? { top: rect.bottom + 6 } : { bottom: viewportHeight - rect.top + 6 }) }}
        >
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{group.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => insertAtCursor(field, emoji)}
                    className="flex h-9 items-center justify-center rounded-lg text-xl transition hover:bg-mims-50"
                    aria-label={`Insérer ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
