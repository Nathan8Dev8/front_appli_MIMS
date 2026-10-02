'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/spinner';
import { SearchIcon } from '@/components/ui/icons';
import { EventMap, formatCoords } from './event-map';

type Point = { lat: number; lng: number } | null;

/** Lit « 4.0511, 9.7679 » (copié depuis Google Maps par exemple). */
function parseCoords(text: string): Point {
  const m = text.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/**
 * Position GPS du lieu : recherche d'adresse (OpenStreetMap), « Ma position »,
 * toucher la carte (ou glisser le repère), ou coller des coordonnées.
 */
export function LocationPicker({ value, onChange }: { value: Point; onChange: (p: Point) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordsText, setCoordsText] = useState(value ? formatCoords(value.lat, value.lng) : '');

  const set = (p: Point) => {
    onChange(p);
    setCoordsText(p ? formatCoords(p.lat, p.lng) : '');
  };

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=cm&accept-language=fr&q=${encodeURIComponent(query)}`,
      );
      const data: { display_name: string; lat: string; lon: string }[] = await res.json();
      setResults(data.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) })));
      if (!data.length) toast("Aucun résultat : essaie un quartier ou un repère connu, ou touche la carte.", { icon: '🔎' });
    } catch {
      toast.error('La recherche ne répond pas. Touche directement la carte.');
    } finally {
      setSearching(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return toast.error("Ton appareil ne donne pas sa position.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        toast.error("Position refusée ou introuvable. Autorise la localisation, ou touche la carte.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-mist-200/70 p-3 sm:p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            data-no-emoji
            className="input !pl-10"
            placeholder="Chercher une adresse, un quartier…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                search();
              }
            }}
            aria-label="Chercher une adresse"
          />
        </div>
        <button type="button" className="btn-secondary shrink-0 !px-4" onClick={search} disabled={searching}>
          {searching ? <Spinner /> : 'Chercher'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl bg-white text-sm ring-1 ring-ink-300/50">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left hover:bg-mims-50"
                onClick={() => {
                  set({ lat: r.lat, lng: r.lng });
                  setResults([]);
                }}
              >
                📍 {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <EventMap lat={value?.lat} lng={value?.lng} onPick={(lat, lng) => set({ lat, lng })} className="h-64" />
      <p className="text-xs text-ink-500">Touche la carte pour placer le repère 📍, puis fais-le glisser pour l'ajuster.</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          data-no-emoji
          className="input sm:flex-1"
          placeholder="Coordonnées GPS : 4.051100, 9.767900"
          value={coordsText}
          onChange={(e) => {
            setCoordsText(e.target.value);
            const p = parseCoords(e.target.value);
            if (p) onChange(p);
          }}
          aria-label="Coordonnées GPS (latitude, longitude)"
        />
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1 !px-4" onClick={locate} disabled={locating}>
            {locating ? <Spinner /> : '🎯'} Ma position
          </button>
          {value && (
            <button type="button" className="btn-ghost !px-4 !text-rose-600" onClick={() => set(null)}>
              Retirer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
