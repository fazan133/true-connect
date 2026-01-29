'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, UserPlus, UserMinus, Loader2, Users } from 'lucide-react';
import { useFriends, useAddFriend, useRemoveFriend, useSendFriendRequest, useCancelFriendRequest, useRealtimeFriendships } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { friendRequestsApi } from '@/lib/api';
import type { Profile } from '@/types/database';

interface FriendsListModalProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  friendsCount: number;
  isOwnProfile?: boolean;
}

export function FriendsListModal({
  userId,
  username,
  isOpen,
  onClose,
  friendsCount,
  isOwnProfile = false,
}: FriendsListModalProps) {
  const { user } = useAuth();
  const { data: friends, isLoading } = useFriends(userId);
  
  // Enable real-time updates for friendships
  useRealtimeFriendships(user?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Friends</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500" />
            </div>
          ) : !friends || friends.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{isOwnProfile ? "You haven't added any friends yet" : `@${username} has no friends yet`}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {friends.map((profile: Profile) => (
                <FriendsListItem
                  key={profile.id}
                  profile={profile}
                  currentUserId={user?.id}
                  onClose={onClose}
                  isOwnProfileList={isOwnProfile}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface FriendsListItemProps {
  profile: Profile;
  currentUserId?: string;
  onClose: () => void;
  isOwnProfileList: boolean;
}

function FriendsListItem({ profile, currentUserId, onClose, isOwnProfileList }: FriendsListItemProps) {
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isPrivate, setIsPrivate] = useState(profile.is_private || false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoved, setIsRemoved] = useState(false);
  
  const addFriend = useAddFriend();
  const removeFriend = useRemoveFriend();
  const sendFriendRequest = useSendFriendRequest();
  const cancelFriendRequest = useCancelFriendRequest();

  const isOwnProfile = currentUserId === profile.id;

  // Check friendship status on mount
  useEffect(() => {
    if (isOwnProfile) {
      setIsLoading(false);
      return;
    }

    const checkFriendshipStatus = async () => {
      try {
        const status = await friendRequestsApi.getFriendshipStatus(profile.id);
        setIsFriend(status.isFriend);
        setHasPendingRequest(status.hasPendingRequest || false);
        setIsPrivate(status.isPrivate || false);
      } catch (error) {
        console.error('Failed to check friendship status:', error);
        setIsFriend(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFriendshipStatus();
  }, [profile.id, isOwnProfile]);

  const handleFriendToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (isFriend) {
        await removeFriend.mutateAsync(profile.id);
        setIsFriend(false);
        if (isOwnProfileList) {
          setIsRemoved(true);
        }
      } else if (hasPendingRequest) {
        await cancelFriendRequest.mutateAsync(profile.id);
        setHasPendingRequest(false);
      } else if (isPrivate) {
        await sendFriendRequest.mutateAsync(profile.id);
        setHasPendingRequest(true);
      } else {
        await addFriend.mutateAsync(profile.id);
        setIsFriend(true);
      }
    } catch (error) {
      console.error('Friend action failed:', error);
    }
  };

  const isPending = addFriend.isPending || removeFriend.isPending || sendFriendRequest.isPending || cancelFriendRequest.isPending;

  // Hide removed friends
  if (isRemoved) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <Link href={`/profile/${profile.username}`} onClick={onClose}>
        <Avatar
          src={profile.avatar_url}
          alt={profile.full_name || profile.username}
          size="md"
        />
      </Link>
      <Link href={`/profile/${profile.username}`} onClick={onClose} className="flex-1 min-w-0">
        <p className="font-medium truncate hover:underline">
          {profile.full_name || profile.username}
        </p>
        <p className="text-sm text-neutral-500 truncate">@{profile.username}</p>
      </Link>
      
      <div className="flex items-center gap-2">
        {/* Show friend action button for non-own profiles */}
        {!isOwnProfile && (
          <Button
            variant={isFriend || hasPendingRequest ? 'outline' : 'primary'}
            size="sm"
            onClick={handleFriendToggle}
            disabled={isLoading || isPending}
          >
            {isLoading || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFriend ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Remove
              </>
            ) : hasPendingRequest ? (
              'Requested'
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

interface FriendsListProps {
  userId: string;
  username: string;
  friendsCount: number;
  isOwnProfile?: boolean;
}

export function FriendsList({ userId, username, friendsCount, isOwnProfile = false }: FriendsListProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-center hover:opacity-70 transition-opacity"
      >
        <span className="font-bold">{friendsCount}</span>
        <span className="text-neutral-500 ml-1">friends</span>
      </button>

      {showModal && (
        <FriendsListModal
          userId={userId}
          username={username}
          isOpen={true}
          onClose={() => setShowModal(false)}
          friendsCount={friendsCount}
          isOwnProfile={isOwnProfile}
        />
      )}
    </>
  );
}
