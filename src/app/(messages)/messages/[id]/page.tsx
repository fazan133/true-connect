'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';
import { NewChatButton } from '@/components/messages/new-chat';
import { useConversations } from '@/hooks/use-messages';
import type { Profile } from '@/types/database';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [otherUser, setOtherUser] = useState<Profile | undefined>();

  const { data: conversations } = useConversations();

  useEffect(() => {
    if (conversations && conversationId) {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation?.otherUser) {
        setOtherUser(conversation.otherUser);
      }
    }
  }, [conversations, conversationId]);

  return (
    <div className="flex h-full">
      {/* Conversation List - hidden on mobile when viewing a conversation */}
      <div className="hidden lg:block w-80 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <NewChatButton />
        </div>
        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          <ConversationList activeConversationId={conversationId} />
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-white dark:bg-neutral-900">
        <ChatWindow conversationId={conversationId} otherUser={otherUser} />
      </div>
    </div>
  );
}
