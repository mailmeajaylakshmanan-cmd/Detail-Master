import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, AlertTriangle, Check, X } from 'lucide-react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions.js';

const endpointFor = kind => (kind === 'service' ? 'service-items' : 'third-party-items');

// Removes one item from the cached notifications list (and drops the whole
// notification if that was its last pending item), so the UI reacts
// instantly instead of waiting on the refetch round-trip.
function removeItemFromCache(queryClient, kind, id) {
  queryClient.setQueryData(['notifications'], (old = []) =>
    old
      .map(n => ({ ...n, items: n.items.filter(item => !(item.kind === kind && item.id === id)) }))
      .filter(n => n.items.length > 0)
  );
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [delayingItem, setDelayingItem] = useState(null);
  const [delayReason, setDelayReason] = useState('');
  const [pendingItem, setPendingItem] = useState(null);
  const queryClient = useQueryClient();

  const { can_view } = usePermissions('Dashboard');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 60000,
    enabled: can_view,
  });

  if (!can_view) return null;

  const totalItems = notifications.reduce((sum, n) => sum + n.items.length, 0);

  const completeMutation = useMutation({
    mutationFn: ({ kind, id }) => api.post(`/notifications/${endpointFor(kind)}/${id}/complete`),
    onMutate: ({ kind, id }) => {
      setPendingItem({ kind, id });
      const previous = queryClient.getQueryData(['notifications']);
      removeItemFromCache(queryClient, kind, id);
      return { previous };
    },
    onSuccess: () => toast.success('Marked complete'),
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
      toast.error('Failed to update');
    },
    onSettled: () => {
      setPendingItem(null);
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const delayMutation = useMutation({
    mutationFn: ({ kind, id, reason }) => api.post(`/notifications/${endpointFor(kind)}/${id}/delay`, { reason }),
    onMutate: ({ kind, id }) => {
      setPendingItem({ kind, id });
      const previous = queryClient.getQueryData(['notifications']);
      removeItemFromCache(queryClient, kind, id);
      return { previous };
    },
    onSuccess: () => {
      toast.success('Delay reason saved');
      setDelayingItem(null);
      setDelayReason('');
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
      toast.error('Failed to update');
    },
    onSettled: () => {
      setPendingItem(null);
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const isItemPending = (kind, id) => pendingItem?.kind === kind && pendingItem?.id === id;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 relative shadow-sm"
      >
        <Bell size={17} />
        {totalItems > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white">
            {totalItems}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-sm">Checkout Reminders</h3>
            </div>
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-gray-400">Nothing due right now.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <div key={n.id} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${n.type === 'checkout_overdue' ? 'text-rose-500' : 'text-amber-500'}`} />
                      <div>
                        <p className="text-[12px] font-bold text-gray-900">
                          {n.make_model}{n.license_vin ? ` (${n.license_vin})` : ''} — {n.customer_name}
                        </p>
                        <p className="text-[11px] text-gray-500">{n.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-6">
                      {n.items.map(item => {
                        const isDelaying = delayingItem?.id === item.id && delayingItem?.kind === item.kind;
                        const isPending = isItemPending(item.kind, item.id);
                        return (
                          <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-2 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                            <span className="text-[12px] font-bold text-gray-700 truncate">{item.service_name}</span>
                            {isDelaying ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={delayReason}
                                  onChange={e => setDelayReason(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') { setDelayingItem(null); setDelayReason(''); }
                                    if (e.key === 'Enter' && delayReason.trim()) {
                                      delayMutation.mutate({ kind: item.kind, id: item.id, reason: delayReason });
                                    }
                                  }}
                                  placeholder="Reason…"
                                  className="text-[11px] px-2 py-1 rounded-md border border-gray-200 w-24"
                                />
                                <button
                                  onClick={() => { setDelayingItem(null); setDelayReason(''); }}
                                  title="Cancel"
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
                                >
                                  <X size={12} />
                                </button>
                                <button
                                  disabled={!delayReason.trim() || isPending}
                                  onClick={() => delayMutation.mutate({ kind: item.kind, id: item.id, reason: delayReason })}
                                  className="text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded-md disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  disabled={isPending}
                                  onClick={() => completeMutation.mutate({ kind: item.kind, id: item.id })}
                                  title="Mark complete"
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  disabled={isPending}
                                  onClick={() => { setDelayingItem({ kind: item.kind, id: item.id }); setDelayReason(''); }}
                                  title="Add delay reason"
                                  className="text-[10px] font-bold text-gray-500 hover:text-rose-600 px-1.5 disabled:opacity-50"
                                >
                                  Delay
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
