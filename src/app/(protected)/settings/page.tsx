'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, LogOut, User, Bell, Shield, Loader2, Lock } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/auth-provider';
import { useUpdateProfile, useRealtimeFriendRequests, useAcceptFriendRequest, useRejectFriendRequest } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const updateProfile = useUpdateProfile();
  const { data: pendingRequests = [] } = useRealtimeFriendRequests(user?.id);
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();

  const handleTogglePrivate = async () => {
    await updateProfile.mutateAsync({ is_private: !profile?.is_private });
    refreshProfile?.();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Username</p>
              <p className="text-sm text-neutral-500">@{profile?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-neutral-500">Choose your preferred theme</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'light'
                    ? 'bg-primary-50 border-primary-500 text-primary-600'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Sun className="h-5 w-5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary-50 dark:bg-primary-950 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Moon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                  theme === 'system'
                    ? 'bg-primary-50 dark:bg-primary-950 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </h2>
        </div>
        <div className="p-4">
          <p className="text-neutral-500 text-sm">Notification settings coming soon...</p>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private Account
              </p>
              <p className="text-sm text-neutral-500">
                When enabled, only approved followers can see your posts
              </p>
            </div>
            <button
              onClick={handleTogglePrivate}
              disabled={updateProfile.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                profile?.is_private
                  ? 'bg-primary-500'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  profile?.is_private ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Friend Requests Section (only show if private account) */}
      {profile?.is_private && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Friend Requests
              {pendingRequests.length > 0 && (
                <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {pendingRequests.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                No pending friend requests
              </div>
            ) : (
              pendingRequests.map((request: any) => (
                <div key={request.id} className="p-4 flex items-center gap-3">
                  <Avatar
                    src={request.requester?.avatar_url}
                    alt={request.requester?.username || 'User'}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {request.requester?.full_name || request.requester?.username}
                    </p>
                    <p className="text-sm text-neutral-500 truncate">
                      @{request.requester?.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => acceptRequest.mutate(request.requester_id)}
                      disabled={acceptRequest.isPending || rejectRequest.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectRequest.mutate(request.requester_id)}
                      disabled={acceptRequest.isPending || rejectRequest.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4">
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Log out
          </Button>
        </div>
      </div>

      {/* Logout Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Log out"
      >
        <div className="p-4">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Are you sure you want to log out?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                'Log out'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
