'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import type { Me } from '@/hooks/use-me';

const today = () => new Date().toISOString().slice(0, 10);

/** Saisie de la date de naissance : c'est ce jour-là que le groupe envoie ses vœux. */
export function BirthDateForm({ initial, onSaved }: { initial?: string | null; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initial?.slice(0, 10) ?? '');

  const save = useMutation({
    mutationFn: () => api.patch<Me>('/members/me', { birthDate: value }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Me>(['auth', 'me'], (old) => (old ? { ...old, birthDate: updated.birthDate } : old));
      toast.success('Date de naissance enregistrée 🎂');
      onSaved?.();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "La date n'a pas pu être enregistrée."),
  });

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label htmlFor="birth-date" className="sr-only">Date de naissance</label>
      <input id="birth-date" type="date" className="input sm:max-w-52" value={value} max={today()} onChange={(e) => setValue(e.target.value)} required />
      <button type="submit" className="btn-primary" disabled={!value || save.isPending}>
        {save.isPending && <Spinner />} Enregistrer
      </button>
    </form>
  );
}
