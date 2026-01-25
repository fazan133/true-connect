'use client';

import { MessageCircle } from 'lucide-react';
import { ConversationList } from '@/components/messages/conversation-list';
import { NewChatButton } from '@/components/messages/new-chat';

export default function MessagesPage() {
  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-full lg:w-80 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <NewChatButton />
        </div>
        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          <ConversationList />
        </div>
      </div>

      {/* Empty State */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
          <p className="text-neutral-500">Select a conversation to start chatting</p>
        </div>
      </div>
    </div>
  );
}
