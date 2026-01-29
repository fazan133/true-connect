'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, ArrowLeft, Image as ImageIcon, X, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMessages, useSendMessage, useMarkAsRead, useSendImageMessage, messageQueryKeys } from '@/hooks/use-messages';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { messagesApi } from '@/lib/messages-api';
import { CallButton } from '@/components/calls/call-button';
import { useCall } from '@/components/calls/call-provider';
import type { MessageWithSender, Profile } from '@/types/database';
import Link from 'next/link';

interface ChatWindowProps {
  conversationId: string;
  otherUser?: Profile;
}

export function ChatWindow({ conversationId, otherUser }: ChatWindowProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { startCall } = useCall();

  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const sendImageMessage = useSendImageMessage();
  const markAsRead = useMarkAsRead();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing (only when window is visible)
  useEffect(() => {
    if (!conversationId) return;
    
    // Mark as read immediately if document is visible
    const markMessagesAsRead = () => {
      if (document.visibilityState === 'visible') {
        markAsRead.mutate(conversationId);
      }
    };
    
    // Mark as read on initial load if visible
    markMessagesAsRead();
    
    // Mark as read when tab becomes visible
    const handleVisibilityChange = () => markMessagesAsRead();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Mark new messages as read when they arrive (if window is visible)
  useEffect(() => {
    if (!conversationId || !messages?.length) return;
    
    const hasUnreadFromOthers = messages.some(
      (m) => m.sender_id !== user?.id && !(m as any).read_at
    );
    
    if (hasUnreadFromOthers && document.visibilityState === 'visible') {
      markAsRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Subscribe to real-time messages and read receipts
  useEffect(() => {
    if (!conversationId) return;
    
    console.log('Setting up message subscription for:', conversationId);
    
    const messageSubscription = messagesApi.subscribeToMessages(
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
    
    // Subscribe to read receipt updates
    const readReceiptSubscription = messagesApi.subscribeToReadReceipts(
      conversationId,
      (messageId: string, readAt: string) => {
        queryClient.setQueryData(
          messageQueryKeys.messages(conversationId),
          (old: MessageWithSender[] | undefined) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === messageId ? { ...m, read_at: readAt } : m
            );
          }
        );
      }
    );

    return () => {
      console.log('Cleaning up message subscription for:', conversationId);
      messageSubscription.unsubscribe();
      readReceiptSubscription.unsubscribe();
    };
  }, [conversationId, queryClient]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('Image must be less than 10MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Send image if selected
    if (selectedImage) {
      await sendImageMessage.mutateAsync({
        conversationId,
        file: selectedImage,
      });
      clearSelectedImage();
    }
    
    // Send text message if present
    if (message.trim()) {
      await sendMessage.mutateAsync({
        conversationId,
        content: message.trim(),
      });
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
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
        {otherUser && (
          <CallButton
            otherUserId={otherUser.id}
            onStartCall={(isVideo) => startCall(otherUser, isVideo)}
          />
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
                    'max-w-[70%] rounded-2xl animate-slide-up overflow-hidden',
                    isOwn
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 rounded-bl-md',
                    (msg as any).image_url ? 'p-1' : 'px-4 py-2'
                  )}
                >
                  {(msg as any).image_url && (
                    <a 
                      href={(msg as any).image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={(msg as any).image_url} 
                        alt="Shared image" 
                        className="max-w-full rounded-xl max-h-64 object-cover"
                      />
                    </a>
                  )}
                  {!(msg as any).image_url && (
                    <p className="break-words">{msg.content}</p>
                  )}
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-1',
                      isOwn ? 'justify-end' : '',
                      (msg as any).image_url && 'px-2 pb-1'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs',
                        isOwn ? 'text-primary-100' : 'text-neutral-500'
                      )}
                    >
                      {formatRelativeTime(msg.created_at)}
                    </span>
                    {isOwn && (
                      (msg as any).read_at ? (
                        <CheckCheck className="h-4 w-4 text-primary-100" />
                      ) : (
                        <Check className="h-4 w-4 text-primary-200" />
                      )
                    )}
                  </div>
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

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 w-20 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={clearSelectedImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-neutral-200 dark:border-neutral-800 pb-20 lg:pb-4"
      >
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ImageIcon className="h-5 w-5 text-neutral-500" />
          </button>
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={(!message.trim() && !selectedImage) || sendMessage.isPending || sendImageMessage.isPending}
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
