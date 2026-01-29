'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Loader2, Clock } from 'lucide-react';
import { useSuggestedUsers, useAddFriend, useSendFriendRequest, useRealtimeFriendships } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types/database';

interface SuggestedUsersProps {
  limit?: number;
  title?: string;
  showViewAll?: boolean;
}

export function SuggestedUsers({ limit = 5, title = 'People you may know', showViewAll = true }: SuggestedUsersProps) {
  const { user } = useAuth();
  const { data: users, isLoading } = useSuggestedUsers(limit);
  
  // Enable real-time updates for friendships
  useRealtimeFriendships(user?.id);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 mb-1" />
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16" />
              </div>
              <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {showViewAll && (
          <Link href="/search" className="text-sm text-primary-500 hover:text-primary-600">
            See all
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {users.map((user) => (
          <SuggestedUserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

function SuggestedUserCard({ user }: { user: Profile }) {
  const [status, setStatus] = useState<'idle' | 'friend' | 'requested'>('idle');
  const addFriend = useAddFriend();
  const sendFriendRequest = useSendFriendRequest();
  
  const isLoading = addFriend.isPending || sendFriendRequest.isPending;

  const handleAddFriend = () => {
    if (user.is_private) {
      sendFriendRequest.mutate(user.id, {
        onSuccess: () => setStatus('requested'),
      });
    } else {
      addFriend.mutate(user.id, {
        onSuccess: () => setStatus('friend'),
      });
    }
  };

  // Don't show card if already friends or requested
  if (status === 'friend') {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/profile/${user.username}`}>
        <Avatar
          src={user.avatar_url}
          alt={user.full_name || user.username}
          size="md"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} className="block">
          <p className="font-medium text-sm truncate hover:underline">
            {user.full_name || user.username}
          </p>
          <p className="text-xs text-neutral-500 truncate">@{user.username}</p>
        </Link>
      </div>
      <Button
        onClick={handleAddFriend}
        disabled={isLoading || status === 'requested'}
        size="sm"
        variant={status === 'requested' ? 'outline' : 'outline'}
        className="shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'requested' ? (
          <>
            <Clock className="h-4 w-4 mr-1" />
            Requested
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </>
        )}
      </Button>
    </div>
  );
}
