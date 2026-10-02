'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

/** Centre par défaut quand aucune position n'est choisie. */
export const DOUALA = { lat: 4.0511, lng: 9.7679 };

/**
 * Carte OpenStreetMap (gratuite, sans clé). Avec `onPick`, on place le repère en
 * touchant la carte ou en le faisant glisser ; sans, elle sert juste à afficher le lieu.
 */
export function EventMap({
  lat,
  lng,
  onPick,
  className = 'h-64',
}: {
  lat?: number | null;
  lng?: number | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const hasPoint = lat != null && lng != null;

  // Leaflet a besoin de `window` : on le charge seulement dans le navigateur.
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      leaflet.current = L;
      const m = L.map(container.current, { scrollWheelZoom: false }).setView(hasPoint ? [lat!, lng!] : [DOUALA.lat, DOUALA.lng], hasPoint ? 16 : 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      if (pick.current) m.on('click', (e) => pick.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      placeMarker();
      // Dans une fenêtre qui s'ouvre en s'animant, la carte doit recalculer sa taille.
      setTimeout(() => m.invalidateSize(), 250);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(placeMarker, [lat, lng]);

  function placeMarker() {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m) return;
    if (!hasPoint) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const icon = L.divIcon({ html: '<span style="font-size:34px;line-height:1">📍</span>', className: '', iconSize: [34, 34], iconAnchor: [17, 32] });
      marker.current = L.marker([lat!, lng!], { icon, draggable: !!pick.current }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        pick.current?.(p.lat, p.lng);
      });
    } else {
      marker.current.setLatLng([lat!, lng!]);
    }
    m.setView([lat!, lng!], Math.max(m.getZoom(), 15));
  }

  return <div ref={container} className={`z-0 w-full overflow-hidden rounded-xl ring-1 ring-ink-300/50 ${className}`} />;
}

/** Lien d'itinéraire : ouvre Google Maps (l'appli sur téléphone) avec le trajet jusqu'au lieu. */
export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const formatCoords = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
