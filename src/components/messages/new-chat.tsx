'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, MessageCircle, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useFriends } from '@/hooks/queries';
import { useStartConversation } from '@/hooks/use-messages';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import type { Profile } from '@/types/database';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Fetch friends when user is authenticated
  const { data: friends, isLoading: friendsLoading } = useFriends(user?.id || '');
  const startConversation = useStartConversation();

  const handleStartChat = async (profile: Profile) => {
    try {
      const conversationId = await startConversation.mutateAsync(profile.id);
      onClose();
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  // Filter friends based on search query
  const filteredFriends = friends?.filter((p: Profile) => {
    if (!debouncedQuery) return true;
    const query = debouncedQuery.toLowerCase();
    return (
      p.username.toLowerCase().includes(query) ||
      (p.full_name?.toLowerCase().includes(query) ?? false)
    );
  }) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">New Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {friendsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500" />
            </div>
          ) : !friends || friends.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Add friends to start messaging</p>
              <p className="text-sm mt-1">You can only message people who are your friends</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <p>No friends match your search</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredFriends.map((profile: Profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleStartChat(profile)}
                  disabled={startConversation.isPending}
                  className="w-full flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left disabled:opacity-50"
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
                  {startConversation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface NewChatButtonProps {
  className?: string;
}

export function NewChatButton({ className }: NewChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${className || ''}`}
        title="New message"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
      <NewChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
