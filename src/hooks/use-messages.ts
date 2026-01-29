import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { messagesApi } from '@/lib/messages-api';
import toast from 'react-hot-toast';

export const messageQueryKeys = {
  conversations: ['conversations'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  unreadCount: ['unreadMessageCount'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: messageQueryKeys.conversations,
    queryFn: messagesApi.getConversations,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messageQueryKeys.messages(conversationId),
    queryFn: () => messagesApi.getMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      messagesApi.sendMessage(conversationId, content),
    onSuccess: (data, variables) => {
      // Optimistically add the message
      queryClient.setQueryData(
        messageQueryKeys.messages(variables.conversationId),
        (old: any) => (old ? [...old, data] : [data])
      );
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagesApi.getOrCreateConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start conversation');
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagesApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.unreadCount });
    },
  });
}

// Unread message count hook
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: messageQueryKeys.unreadCount,
    queryFn: messagesApi.getTotalUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagesApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
      toast.success('Conversation deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete conversation');
    },
  });
}

export function useSendImageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, file }: { conversationId: string; file: File }) =>
      messagesApi.sendImageMessage(conversationId, file),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        messageQueryKeys.messages(variables.conversationId),
        (old: any) => (old ? [...old, data] : [data])
      );
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send image');
    },
  });
}

// Real-time hook for all messages (for unread count badge)
export function useRealtimeUnreadMessages(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = messagesApi.subscribeToAllMessages(userId, () => {
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.unreadCount });
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.conversations });
    });

    return unsubscribe;
  }, [userId, queryClient]);
}
