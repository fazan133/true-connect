'use client';

import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { useConversations } from '@/hooks/use-messages';
import { Avatar } from '@/components/ui/avatar';
import { ConversationSkeleton } from '@/components/ui/skeleton';

interface ConversationListProps {
  activeConversationId?: string;
}

export function ConversationList({ activeConversationId }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();

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
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/messages/${conversation.id}`}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            activeConversationId === conversation.id
              ? 'bg-primary-50 dark:bg-primary-950'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
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
      ))}
    </div>
  );
}
