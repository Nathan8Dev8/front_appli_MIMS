import Image from 'next/image';

const VERSES = [
  {
    text: '« Que personne ne méprise ta jeunesse ; sois un modèle pour les fidèles. »',
    ref: '1 Timothée 4.12',
  },
];

export function BrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-mims-gradient p-12 text-white lg:flex">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-lift">
          <Image src="/logo.png" alt="Jeunes MIMS" width={34} height={34} />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight">Jeunes MIMS</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">
          Tout le groupe,
          <br />au même endroit.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-mims-100/90">
          Tes cotisations, les documents du groupe, les événements, les sondages et les quiz.
          Tout est ici, et c'est réservé aux membres.
        </p>

        <div className="mt-10 border-l-2 border-white/30 pl-4">
          <p className="font-display text-lg italic text-white/95">{VERSES[0].text}</p>
          <p className="mt-2 text-sm font-medium text-mims-100/80">{VERSES[0].ref}</p>
        </div>
      </div>

      <p className="relative text-xs text-mims-100/70">
        © {new Date().getFullYear()} Jeunes MIMS · Bâtir ensemble, grandir dans la foi.
      </p>
    </div>
  );
}
