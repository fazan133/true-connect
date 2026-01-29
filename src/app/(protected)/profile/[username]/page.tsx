'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, MessageCircle, Calendar, ArrowLeft, Loader2, Lock, Mail, UserPlus, UserMinus, Clock, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useProfile, useAddFriend, useRemoveFriend, useSendFriendRequest, useCancelFriendRequest, useAcceptFriendRequest, useRealtimeFriendships } from '@/hooks/queries';
import { useStartConversation } from '@/hooks/use-messages';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { EditProfileForm } from '@/components/profile/edit-profile-form';
import { FriendsList } from '@/components/profile/follow-list';
import { SuggestedUsers } from '@/components/profile/suggested-users';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfile(username);

  // Enable real-time updates for friendships
  useRealtimeFriendships(user?.id);

  const addFriend = useAddFriend();
  const removeFriend = useRemoveFriend();
  const sendFriendRequest = useSendFriendRequest();
  const cancelFriendRequest = useCancelFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const startConversation = useStartConversation();

  const handleFriendAction = () => {
    if (!profile) return;
    
    if (profile.isFriend) {
      removeFriend.mutate(profile.id);
    } else if (profile.hasPendingRequest) {
      cancelFriendRequest.mutate(profile.id);
    } else if (profile.hasReceivedRequest) {
      acceptFriendRequest.mutate(profile.id);
    } else if (profile.is_private) {
      // Send friend request for private accounts
      sendFriendRequest.mutate(profile.id);
    } else {
      // Direct add for public accounts
      addFriend.mutate(profile.id);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    const conversationId = await startConversation.mutateAsync(profile.id);
    router.push(`/messages/${conversationId}`);
  };

  const getFriendButtonText = () => {
    if (!profile) return 'Add Friend';
    if (profile.isFriend) return 'Friends';
    if (profile.hasPendingRequest) return 'Requested';
    if (profile.hasReceivedRequest) return 'Accept';
    return 'Add Friend';
  };

  const getFriendButtonIcon = () => {
    if (!profile) return <UserPlus className="h-4 w-4 mr-2" />;
    if (profile.isFriend) return <Check className="h-4 w-4 mr-2" />;
    if (profile.hasPendingRequest) return <Clock className="h-4 w-4 mr-2" />;
    if (profile.hasReceivedRequest) return <Check className="h-4 w-4 mr-2" />;
    return <UserPlus className="h-4 w-4 mr-2" />;
  };

  const isFriendLoading = addFriend.isPending || removeFriend.isPending || sendFriendRequest.isPending || cancelFriendRequest.isPending || acceptFriendRequest.isPending;

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
                    variant={profile.isFriend ? 'outline' : profile.hasPendingRequest ? 'outline' : 'primary'}
                    onClick={handleFriendAction}
                    disabled={isFriendLoading}
                  >
                    {isFriendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {getFriendButtonIcon()}
                        {getFriendButtonText()}
                      </>
                    )}
                  </Button>
                  {profile.isFriend && (
                    <Button
                      variant="outline"
                      onClick={handleMessage}
                      disabled={startConversation.isPending}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
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
            {profile.email && (profile.isOwnProfile || profile.isFriend) && (
              <div className="flex items-center gap-1 text-neutral-500">
                <Mail className="h-4 w-4" />
                {profile.email}
              </div>
            )}
          </div>

          <div className="flex gap-6 mt-4">
            <FriendsList
              userId={profile.id}
              username={profile.username}
              friendsCount={profile.friendsCount}
              isOwnProfile={profile.isOwnProfile}
            />
          </div>
        </div>
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
