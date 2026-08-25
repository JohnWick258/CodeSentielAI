'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, ShieldAlert, ScanLine, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/supabase/data';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data as Notification[]);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  };

  const getIcon = (type: string) => {
    if (type === 'critical') return <ShieldAlert className="h-4 w-4 text-severity-critical" />;
    if (type === 'scan_complete') return <ScanLine className="h-4 w-4 text-primary" />;
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-colors hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-severity-critical px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 border-b border-border px-3 py-3 last:border-0',
                    !n.read && 'bg-primary/5'
                  )}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    )}
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
