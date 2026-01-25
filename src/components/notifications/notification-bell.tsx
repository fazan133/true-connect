'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useRealtimeNotifications } from '@/hooks/queries';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from '@/lib/utils';

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  // Subscribe to real-time notifications
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'follow_request':
        return <UserPlus className="h-4 w-4 text-yellow-500" />;
      case 'follow_accepted':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = (notification: any) => {
    const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone';
    switch (notification.type) {
      case 'like':
        return <><strong>{actorName}</strong> liked your post</>;
      case 'comment':
        return <><strong>{actorName}</strong> commented on your post</>;
      case 'follow':
        return <><strong>{actorName}</strong> started following you</>;
      case 'follow_request':
        return <><strong>{actorName}</strong> requested to follow you</>;
      case 'follow_accepted':
        return <><strong>{actorName}</strong> accepted your follow request</>;
      default:
        return 'New notification';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 z-50">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-neutral-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {notifications.map((notification: any) => {
                const getNotificationLink = () => {
                  switch (notification.type) {
                    case 'follow':
                    case 'follow_accepted':
                      return `/profile/${notification.actor?.username}`;
                    case 'follow_request':
                      return '/settings';
                    default:
                      return notification.post_id ? `/feed?post=${notification.post_id}` : '/feed';
                  }
                };

                return (
                  <Link
                    key={notification.id}
                    href={getNotificationLink()}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                      !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        src={notification.actor?.avatar_url}
                        alt={notification.actor?.username || 'User'}
                        size="sm"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {formatDistanceToNow(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
