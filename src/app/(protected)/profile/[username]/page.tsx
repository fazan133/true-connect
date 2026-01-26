'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Settings, MessageCircle, Calendar, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useProfile, useUserPosts, useFollowUser, useUnfollowUser, useSendFollowRequest, useCancelFollowRequest, useRealtimeFollows } from '@/hooks/queries';
import { useStartConversation } from '@/hooks/use-messages';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/posts/post-card';
import { ProfileSkeleton, PostSkeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { EditProfileForm } from '@/components/profile/edit-profile-form';
import { FollowStats } from '@/components/profile/follow-list';
import { SuggestedUsers } from '@/components/profile/suggested-users';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfile(username);
  const { data: postsData, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserPosts(profile?.id || '');

  // Enable real-time updates for follows
  useRealtimeFollows(user?.id);

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const sendFollowRequest = useSendFollowRequest();
  const cancelFollowRequest = useCancelFollowRequest();
  const startConversation = useStartConversation();

  const handleFollowToggle = () => {
    if (!profile) return;
    
    if (profile.isFollowing) {
      unfollowUser.mutate(profile.id);
    } else if (profile.hasPendingRequest) {
      cancelFollowRequest.mutate(profile.id);
    } else if (profile.is_private) {
      // Send follow request for private accounts
      sendFollowRequest.mutate(profile.id);
    } else {
      // Direct follow for public accounts
      followUser.mutate(profile.id);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    const conversationId = await startConversation.mutateAsync(profile.id);
    router.push(`/messages/${conversationId}`);
  };

  const getFollowButtonText = () => {
    if (!profile) return 'Follow';
    if (profile.isFollowing) return 'Following';
    if (profile.hasPendingRequest) return 'Requested';
    return 'Follow';
  };

  const isFollowLoading = followUser.isPending || unfollowUser.isPending || sendFollowRequest.isPending || cancelFollowRequest.isPending;

  // Check if we can see posts (own profile, following, or public account)
  const canSeePosts = profile?.isOwnProfile || profile?.isFollowing || !profile?.is_private;

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <h1 className="text-xl font-bold mb-2">User not found</h1>
        <p className="text-neutral-500">The user you're looking for doesn't exist.</p>
        <Link href="/feed" className="text-primary-500 mt-4 inline-block">
          Go back to feed
        </Link>
      </div>
    );
  }

  const posts = postsData?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="space-y-6">
      {/* Back Button (Mobile) */}
      <Link
        href="/feed"
        className="lg:hidden flex items-center gap-2 text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>

      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Cover Photo Placeholder */}
        <div className="h-32 bg-gradient-to-r from-primary-400 to-primary-600" />

        <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar
              src={profile.avatar_url}
              alt={profile.full_name || profile.username}
              size="xl"
              className="ring-4 ring-white dark:ring-neutral-900"
            />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {profile.full_name || profile.username}
                  {profile.is_private && (
                    <Lock className="h-5 w-5 text-neutral-500" />
                  )}
                </h1>
                <p className="text-neutral-500">@{profile.username}</p>
              </div>

              {profile.isOwnProfile ? (
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={profile.isFollowing ? 'outline' : profile.hasPendingRequest ? 'outline' : 'primary'}
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                  >
                    {isFollowLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getFollowButtonText()
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMessage}
                    disabled={startConversation.isPending}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-neutral-700 dark:text-neutral-300">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1 text-neutral-500">
              <Calendar className="h-4 w-4" />
              Joined {formatDate(profile.created_at)}
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <div>
              <span className="font-bold">{profile.postsCount}</span>{' '}
              <span className="text-neutral-500">posts</span>
            </div>
            <FollowStats
              userId={profile.id}
              username={profile.username}
              followersCount={profile.followersCount}
              followingCount={profile.followingCount}
              isOwnProfile={profile.isOwnProfile}
            />
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Posts</h2>

        {!canSeePosts ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-semibold mb-2">This account is private</h3>
            <p className="text-neutral-500">
              Follow this account to see their posts.
            </p>
          </div>
        ) : postsLoading ? (
          [...Array(3)].map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <p className="text-neutral-500">No posts yet.</p>
          </div>
        )}
      </div>

      {/* Suggested Users - Show on own profile */}
      {profile.isOwnProfile && (
        <SuggestedUsers limit={5} title="Suggested for you" />
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
      >
        <EditProfileForm
          profile={profile}
          onClose={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}
