'use client';

import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color, FontSize, FontFamily } from '@tiptap/extension-text-style';

const FONTS = [
  { value: '', label: 'Police normale' },
  { value: 'Georgia, serif', label: 'Classique' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times' },
  { value: '"Courier New", monospace', label: 'Machine à écrire' },
];
const SIZES = ['', '14px', '18px', '22px', '28px'];
const SIZE_LABELS: Record<string, string> = { '': 'Taille normale', '14px': 'Petit', '18px': 'Moyen', '22px': 'Grand', '28px': 'Très grand' };

/** Éditeur de texte du rapport de séance : gras, titres, listes, couleurs, alignement… au doigt comme à la souris. */
export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false, // rendu côté navigateur seulement (Next.js)
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'report-content min-h-[50dvh] px-4 py-4 sm:px-6 focus:outline-none',
        'aria-label': 'Texte du rapport',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded-2xl bg-white ring-1 ring-ink-300/60 focus-within:ring-2 focus-within:ring-mims-300">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Se met à jour à chaque déplacement du curseur : les boutons actifs restent allumés.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      heading: [1, 2, 3].find((level) => e.isActive('heading', { level })) ?? 0,
      align: (['left', 'center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '#1b2733',
      fontSize: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      fontFamily: (e.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-1 rounded-t-2xl border-b border-ink-300/40 bg-mist-200/80 p-2 backdrop-blur" role="toolbar" aria-label="Mise en forme">
      <select
        className="h-10 rounded-lg border border-ink-300/60 bg-white px-2 text-sm"
        aria-label="Style du paragraphe"
        value={s.heading}
        onChange={(e) => {
          const level = Number(e.target.value) as 0 | 1 | 2 | 3;
          if (level) chain().setHeading({ level }).run();
          else chain().setParagraph().run();
        }}
      >
        <option value={0}>Texte</option>
        <option value={1}>Grand titre</option>
        <option value={2}>Titre</option>
        <option value={3}>Sous-titre</option>
      </select>
      <Sep />
      <Btn label="Gras" active={s.bold} onClick={() => chain().toggleBold().run()}><b>G</b></Btn>
      <Btn label="Italique" active={s.italic} onClick={() => chain().toggleItalic().run()}><i className="font-serif">I</i></Btn>
      <Btn label="Souligné" active={s.underline} onClick={() => chain().toggleUnderline().run()}><u>S</u></Btn>
      <Btn label="Barré" active={s.strike} onClick={() => chain().toggleStrike().run()}><s>ab</s></Btn>
      <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-white" title="Couleur du texte">
        <span className="sr-only">Couleur du texte</span>
        <span className="text-base font-bold" style={{ color: s.color, textDecoration: 'underline', textDecorationThickness: 3 }}>A</span>
        <input type="color" className="sr-only" value={/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#1b2733'} onChange={(e) => chain().setColor(e.target.value).run()} />
      </label>
      <Sep />
      <select
        className="h-10 rounded-lg border border-ink-300/60 bg-white px-2 text-sm"
        aria-label="Taille du texte"
        value={s.fontSize}
        onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
      >
        {SIZES.map((size) => <option key={size} value={size}>{SIZE_LABELS[size]}</option>)}
      </select>
      <select
        className="h-10 max-w-[9.5rem] rounded-lg border border-ink-300/60 bg-white px-2 text-sm"
        aria-label="Police"
        value={s.fontFamily}
        onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
      >
        {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <Sep />
      <Btn label="Liste à puces" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>•≡</Btn>
      <Btn label="Liste numérotée" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>1.≡</Btn>
      <Btn label="Citation" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>❝</Btn>
      <Sep />
      <Btn label="Aligner à gauche" active={s.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignIcon kind="left" /></Btn>
      <Btn label="Centrer" active={s.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignIcon kind="center" /></Btn>
      <Btn label="Aligner à droite" active={s.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignIcon kind="right" /></Btn>
      <Btn label="Justifier" active={s.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignIcon kind="justify" /></Btn>
      <Sep />
      <Btn label="Annuler" disabled={!s.canUndo} onClick={() => chain().undo().run()}>↶</Btn>
      <Btn label="Rétablir" disabled={!s.canRedo} onClick={() => chain().redo().run()}>↷</Btn>
    </div>
  );
}

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-base transition disabled:opacity-30 ${
        active ? 'bg-mims-700 text-white' : 'text-ink-900 hover:bg-white'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 hidden h-6 w-px bg-ink-300/60 sm:block" aria-hidden="true" />;
}

function AlignIcon({ kind }: { kind: 'left' | 'center' | 'right' | 'justify' }) {
  const lines = { left: [16, 10, 14], center: [16, 10, 14], right: [16, 10, 14], justify: [16, 16, 16] }[kind];
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {lines.map((w, i) => {
        const x = kind === 'center' ? (18 - w) / 2 : kind === 'right' ? 17 - w : 1;
        return <rect key={i} x={x} y={3 + i * 5} width={w} height={2} rx={1} fill="currentColor" />;
      })}
    </svg>
  );
}
