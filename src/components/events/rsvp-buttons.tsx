'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api-client';
import { CheckIcon, XIcon } from '@/components/ui/icons';

export function RsvpButtons({ eventId, mine }: { eventId: string; mine?: string }) {
  const queryClient = useQueryClient();
  const respond = useMutation({
    mutationFn: (response: 'PRESENT' | 'ABSENT') => api.post(`/events/${eventId}/participation`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("C'est noté 👍");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Ta réponse n'a pas pu être enregistrée."),
  });

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => respond.mutate('PRESENT')}
        disabled={respond.isPending}
        aria-pressed={mine === 'PRESENT'}
        className={`btn-secondary ${mine === 'PRESENT' ? '!bg-emerald-600 !text-white !ring-0' : ''}`}
      >
        <CheckIcon width={16} height={16} /> Je serai là
      </button>
      <button
        onClick={() => respond.mutate('ABSENT')}
        disabled={respond.isPending}
        aria-pressed={mine === 'ABSENT'}
        className={`btn-secondary ${mine === 'ABSENT' ? '!bg-rose-600 !text-white !ring-0' : ''}`}
      >
        <XIcon width={16} height={16} /> Pas dispo
      </button>
    </div>
  );
}
