import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Bell, Calendar, MessageSquare, Package, Zap, Info, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICON = {
  quote_request:      { icon: Zap,            color: 'text-purple-400' },
  booking_confirmed:  { icon: Calendar,        color: 'text-green-400' },
  chat_message:       { icon: MessageSquare,   color: 'text-blue-400' },
  equipment_available:{ icon: Package,         color: 'text-amber-400' },
  general:            { icon: Info,            color: 'text-zinc-400' },
};

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!userEmail) return;
    loadNotifications();
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === userEmail) {
        loadNotifications();
      }
    });
    return unsub;
  }, [userEmail]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadNotifications = async () => {
    const data = await base44.entities.Notification.filter(
      { user_email: userEmail },
      '-created_date',
      30
    );
    setNotifications(data);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
  };

  const dismiss = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-900">
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Sin notificaciones
            </div>
          ) : (
            notifications.map(n => {
              const { icon: Icon, color } = TYPE_ICON[n.type] || TYPE_ICON.general;
              const href = n.link_page ? createPageUrl(n.link_page) + (n.link_params || '') : null;
              const Inner = (
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors relative',
                    !n.read && 'bg-blue-500/5'
                  )}
                  onClick={() => markRead(n)}
                >
                  <div className={cn('mt-0.5 shrink-0', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-tight', n.read ? 'text-zinc-300' : 'text-white font-medium')}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.created_date)}</p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                  <button
                    onClick={(e) => dismiss(e, n.id)}
                    className="shrink-0 text-zinc-600 hover:text-zinc-400 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );

              return href ? (
                <Link key={n.id} to={href}>{Inner}</Link>
              ) : (
                <div key={n.id}>{Inner}</div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}