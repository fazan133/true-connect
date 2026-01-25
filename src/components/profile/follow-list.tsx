'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useFollowers, useFollowing, useFollowUser, useUnfollowUser } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { followRequestsApi } from '@/lib/api';
import type { Profile } from '@/types/database';

interface FollowListModalProps {
  userId: string;
  username: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  initialCount: number;
}

export function FollowListModal({
  userId,
  username,
  type,
  isOpen,
  onClose,
  initialCount,
}: FollowListModalProps) {
  const { user } = useAuth();
  const { data: followers, isLoading: followersLoading } = useFollowers(userId);
  const { data: following, isLoading: followingLoading } = useFollowing(userId);

  const users = type === 'followers' ? followers : following;
  const isLoading = type === 'followers' ? followersLoading : followingLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold capitalize">{type}</h2>
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
          ) : !users || users.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              {type === 'followers'
                ? `@${username} has no followers yet`
                : `@${username} isn't following anyone yet`}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {users.map((profile: Profile) => (
                <FollowListItem
                  key={profile.id}
                  profile={profile}
                  currentUserId={user?.id}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface FollowListItemProps {
  profile: Profile;
  currentUserId?: string;
  onClose: () => void;
}

function FollowListItem({ profile, currentUserId, onClose }: FollowListItemProps) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const isOwnProfile = currentUserId === profile.id;

  // Check follow status on mount
  useEffect(() => {
    if (isOwnProfile) {
      setIsLoading(false);
      return;
    }

    const checkFollowStatus = async () => {
      try {
        const status = await followRequestsApi.getFollowStatus(profile.id);
        setIsFollowing(status.isFollowing);
      } catch (error) {
        console.error('Failed to check follow status:', error);
        setIsFollowing(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [profile.id, isOwnProfile]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFollowing) {
      await unfollowUser.mutateAsync(profile.id);
      setIsFollowing(false);
    } else {
      await followUser.mutateAsync(profile.id);
      setIsFollowing(true);
    }
  };

  return (
    <Link
      href={`/profile/${profile.username}`}
      onClick={onClose}
      className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
    >
      <Avatar
        src={profile.avatar_url}
        alt={profile.full_name || profile.username}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {profile.full_name || profile.username}
        </p>
        <p className="text-sm text-neutral-500 truncate">@{profile.username}</p>
      </div>
      {!isOwnProfile && (
        <Button
          variant={isFollowing ? 'outline' : 'primary'}
          size="sm"
          onClick={handleFollowToggle}
          disabled={isLoading || followUser.isPending || unfollowUser.isPending}
        >
          {isLoading || followUser.isPending || unfollowUser.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isFollowing ? (
            <>
              <UserMinus className="h-4 w-4 mr-1" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Follow
            </>
          )}
        </Button>
      )}
    </Link>
  );
}

interface FollowStatsProps {
  userId: string;
  username: string;
  followersCount: number;
  followingCount: number;
}

export function FollowStats({ userId, username, followersCount, followingCount }: FollowStatsProps) {
  const [showModal, setShowModal] = useState<'followers' | 'following' | null>(null);

  return (
    <>
      <div className="flex gap-6">
        <button
          onClick={() => setShowModal('followers')}
          className="text-center hover:opacity-70 transition-opacity"
        >
          <span className="font-bold">{followersCount}</span>
          <span className="text-neutral-500 ml-1">Followers</span>
        </button>
        <button
          onClick={() => setShowModal('following')}
          className="text-center hover:opacity-70 transition-opacity"
        >
          <span className="font-bold">{followingCount}</span>
          <span className="text-neutral-500 ml-1">Following</span>
        </button>
      </div>

      {showModal && (
        <FollowListModal
          userId={userId}
          username={username}
          type={showModal}
          isOpen={true}
          onClose={() => setShowModal(null)}
          initialCount={showModal === 'followers' ? followersCount : followingCount}
        />
      )}
    </>
  );
}
