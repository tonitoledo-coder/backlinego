import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_ICONS = {
  quote_request:      '🔧',
  booking_confirmed:  '✅',
  chat_message:       '💬',
  equipment_available:'🎸',
};

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail }, '-created_date', 30),
    enabled: !!userEmail,
    refetchInterval: 15000,
  });

  // Real-time
  useEffect(() => {
    if (!userEmail) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === userEmail) {
        queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] });
      }
    });
    return unsub;
  }, [userEmail, queryClient]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
  });

  const markOneRead = async (notif) => {
    if (!notif.read) {
      try {
        await base44.entities.Notification.update(notif.id, { read: true });
        queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] });
      } catch (e) {
        // Si la API rechaza el update (ej. 405), ignoramos el error
        // y dejamos que la navegación continúe igualmente
        console.warn('Could not mark notification as read:', e?.message);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(p => !p)}
        className="relative w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
      >
        <Bell className="w-5 h-5 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="font-semibold text-white text-sm">Notificaciones</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Leer todo
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Sin notificaciones
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-zinc-800/60 cursor-pointer transition-colors hover:bg-zinc-800/60",
                    !notif.read && "bg-blue-500/5"
                  )}
                >
                  {notif.link_page ? (
                    <Link
                      to={`${createPageUrl(notif.link_page)}${notif.link_params ? '?' + notif.link_params : ''}`}
                      className="flex gap-3 w-full"
                      onClick={() => { markOneRead(notif); setOpen(false); }}
                    >
                      <NotifContent notif={notif} />
                    </Link>
                  ) : (
                    <div
                      className="flex gap-3 w-full"
                      onClick={() => { markOneRead(notif); setOpen(false); }}
                    >
                      <NotifContent notif={notif} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifContent({ notif }) {
  return (
    <>
      <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICONS[notif.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight truncate">{notif.title}</p>
        {notif.body && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{notif.body}</p>}
        <p className="text-[10px] text-zinc-600 mt-1">
          {new Date(notif.created_date).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
    </>
  );
}