import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Bell } from 'lucide-react';
import { endpoints } from '../../api/client.js';

/**
 * Topbar bell: shows unread count (REST) and receives live pushes over the
 * default socket.io namespace (the worker emits `notification:new` to the
 * user's room after persisting).
 */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [flash, setFlash] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    endpoints.notifications.list({ limit: 1 }).then((res) => setUnread(res.unreadCount || 0)).catch(() => {});

    const token = localStorage.getItem('cp_token');
    const socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('notification:new', (n) => {
      setUnread((c) => c + 1);
      setFlash(n);
      setTimeout(() => setFlash(null), 5000);
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div className="relative">
      <button
        className="btn-ghost relative"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {flash && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="text-sm font-semibold text-slate-900">{flash.title}</div>
          <div className="mt-1 text-xs text-slate-500">{flash.message}</div>
        </div>
      )}
    </div>
  );
}
