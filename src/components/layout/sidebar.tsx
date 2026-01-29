'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, User, Settings, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { useUnreadMessageCount, useRealtimeUnreadMessages } from '@/hooks/use-messages';

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/messages', icon: MessageCircle, label: 'Messages', showBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
  
  // Subscribe to real-time messages for unread count updates
  useRealtimeUnreadMessages(user?.id);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 p-4 z-40">
        <Link href="/feed" className="flex items-center gap-2 px-3 py-4 mb-4">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
            TrueConnect
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/messages' && pathname.startsWith('/messages'));
            const showMessageBadge = item.showBadge && unreadMessageCount > 0 && !pathname.startsWith('/messages');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary-500')} />
                  {showMessageBadge && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}

          <Link
            href={`/profile/${profile?.username}`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              pathname.startsWith('/profile')
                ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            )}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>

          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              pathname === '/settings'
                ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2">
          <Link
            href={`/profile/${profile?.username}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <Avatar
              src={profile?.avatar_url}
              alt={profile?.full_name || profile?.username || 'User'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || profile?.username}
              </p>
              <p className="text-xs text-neutral-500 truncate">@{profile?.username}</p>
            </div>
          </Link>

          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-4 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/messages' && pathname.startsWith('/messages'));
            const showMessageBadge = item.showBadge && unreadMessageCount > 0 && !pathname.startsWith('/messages');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-colors relative min-w-[60px]',
                  isActive
                    ? 'text-primary-500'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                <div className="relative">
                  <item.icon className="h-7 w-7" />
                  {showMessageBadge && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-colors min-w-[60px]',
              pathname === '/settings'
                ? 'text-primary-500'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            )}
          >
            <Settings className="h-7 w-7" />
          </Link>
          <Link
            href={`/profile/${profile?.username}`}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-colors min-w-[60px]',
              pathname.startsWith('/profile')
                ? 'text-primary-500'
                : 'text-neutral-500'
            )}
          >
            <Avatar
              src={profile?.avatar_url}
              alt={profile?.username || 'User'}
              size="sm"
            />
          </Link>
        </div>
      </nav>
    </>
  );
}
