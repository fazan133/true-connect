'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMessages, useSendMessage, useMarkAsRead, messageQueryKeys } from '@/hooks/use-messages';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { messagesApi } from '@/lib/messages-api';
import type { MessageWithSender, Profile } from '@/types/database';
import Link from 'next/link';

interface ChatWindowProps {
  conversationId: string;
  otherUser?: Profile;
}

export function ChatWindow({ conversationId, otherUser }: ChatWindowProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;
    
    console.log('Setting up message subscription for:', conversationId);
    
    const subscription = messagesApi.subscribeToMessages(
      conversationId,
      (newMessage: MessageWithSender) => {
        console.log('Received new message in component:', newMessage);
        queryClient.setQueryData(
          messageQueryKeys.messages(conversationId),
          (old: MessageWithSender[] | undefined) => {
            if (!old) return [newMessage];
            // Avoid duplicates
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          }
        );
      }
    );

    return () => {
      console.log('Cleaning up message subscription for:', conversationId);
      subscription.unsubscribe();
    };
  }, [conversationId, queryClient]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      conversationId,
      content: message.trim(),
    });
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
        <Link
          href="/messages"
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {otherUser && (
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3">
            <Avatar
              src={otherUser.avatar_url}
              alt={otherUser.full_name || otherUser.username}
              size="md"
            />
            <div>
              <p className="font-semibold">{otherUser.full_name || otherUser.username}</p>
              <p className="text-sm text-neutral-500">@{otherUser.username}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id;
            const showAvatar =
              !isOwn && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-2',
                  isOwn ? 'justify-end' : 'justify-start'
                )}
              >
                {!isOwn && showAvatar && (
                  <Avatar
                    src={msg.profiles.avatar_url}
                    alt={msg.profiles.username}
                    size="sm"
                  />
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}
                <div
                  className={cn(
                    'max-w-[70%] px-4 py-2 rounded-2xl animate-slide-up',
                    isOwn
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 rounded-bl-md'
                  )}
                >
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      isOwn ? 'text-primary-100' : 'text-neutral-500'
                    )}
                  >
                    {formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500">
            <p>No messages yet.</p>
            <p className="text-sm">Send a message to start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-neutral-200 dark:border-neutral-800 pb-20 lg:pb-4"
      >
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessage.isPending}
            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
