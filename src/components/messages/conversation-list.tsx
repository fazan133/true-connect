'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, MoreVertical } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useConversations, useDeleteConversation } from '@/hooks/use-messages';
import { Avatar } from '@/components/ui/avatar';
import { ConversationSkeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ConversationListProps {
  activeConversationId?: string;
}

export function ConversationList({ activeConversationId }: ConversationListProps) {
  const router = useRouter();
  const { data: conversations, isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteModalOpen(true);
    setMenuOpen(null);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation.mutateAsync(conversationToDelete);
      setDeleteModalOpen(false);
      setConversationToDelete(null);
      if (activeConversationId === conversationToDelete) {
        router.push('/messages');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(5)].map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500">
        <p>No conversations yet.</p>
        <p className="text-sm mt-1">Start a conversation from someone's profile!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`relative group flex items-center gap-3 p-3 rounded-lg transition-colors ${
              activeConversationId === conversation.id
                ? 'bg-primary-50 dark:bg-primary-950'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Link
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative">
                <Avatar
                  src={conversation.otherUser?.avatar_url}
                  alt={conversation.otherUser?.full_name || conversation.otherUser?.username || 'User'}
                  size="md"
                />
                {conversation.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-primary-500 text-white text-xs rounded-full">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">
                    {conversation.otherUser?.full_name || conversation.otherUser?.username}
                  </p>
                  {conversation.lastMessage && (
                    <span className="text-xs text-neutral-500">
                      {formatRelativeTime(conversation.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p className="text-sm text-neutral-500 truncate">
                    {conversation.lastMessage.content}
                  </p>
                )}
              </div>
            </Link>
            <button
              onClick={(e) => handleDeleteClick(e, conversation.id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all"
              title="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Conversation"
      >
        <div className="p-4">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Are you sure you want to delete this conversation? This will delete all messages and images permanently.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteConversation.isPending}
              className="flex-1"
            >
              {deleteConversation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
