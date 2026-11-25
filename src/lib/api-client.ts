'use client';

import { useAuthStore } from '@/store/auth-store';

// L'API est servie par le même site (route /api) : adresses relatives.
export const API_URL = '';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Vercel refuse les requêtes de plus de 4,5 Mo : au-delà, le fichier part directement sur S3. */
const DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;

async function sendLargeFilesToStorage(form: FormData) {
  for (const [field, value] of Array.from(form.entries())) {
    if (!(value instanceof File) || value.size <= DIRECT_UPLOAD_BYTES) continue;
    const contentType = value.type || 'application/octet-stream';
    const { key, url } = await request<{ key: string | null; url: string | null }>('/uploads', {
      method: 'POST',
      body: JSON.stringify({ contentType, size: value.size }),
    });
    if (!key || !url) continue; // stockage local (développement) : envoi normal
    const put = await fetch(url, { method: 'PUT', body: value, headers: { 'Content-Type': contentType } });
    if (!put.ok) throw new ApiError("L'envoi du fichier a échoué. Réessaie.", put.status);
    // L'API récupère le fichier sur S3 à partir de cette référence (voir S3Upload côté serveur).
    form.set(field, JSON.stringify({ key, name: value.name, type: value.type }));
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const isFormData = options.body instanceof FormData;
  if (isFormData) await sendLargeFilesToStorage(options.body as FormData);

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
      if (Array.isArray(message)) message = message.join(' ');
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return undefined as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Sur iPhone/iPad, Safari (et surtout l'appli installée sur l'écran d'accueil) ignore les
 * téléchargements par lien `blob:` : rien ne se passe. On ouvre donc le fichier lui-même dans
 * un onglet, avec un ticket de 2 min à la place de l'en-tête Authorization ; iOS l'affiche
 * avec son bouton Partager (« Enregistrer dans Fichiers », WhatsApp…).
 */
async function openOnIos(path: string) {
  // L'onglet doit s'ouvrir tout de suite, pendant le toucher : après une attente, iOS le bloque.
  const tab = window.open('', '_blank');
  try {
    const [pathname, query] = path.split('?');
    const { ticket } = await request<{ ticket: string }>('/auth/download-ticket', { method: 'POST', body: JSON.stringify({ path: pathname }) });
    const url = `${API_URL}/api${pathname}?${query ? `${query}&` : ''}dl=${encodeURIComponent(ticket)}`;
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Télécharge un fichier protégé par le jeton (un simple lien <a> ne peut pas envoyer l'en-tête Authorization). */
export async function downloadFile(path: string, filename?: string) {
  if (isIos()) return openOnIos(path);
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_URL}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) useAuthStore.getState().logout();
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(' ') : body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? res.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function fileUrl(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
