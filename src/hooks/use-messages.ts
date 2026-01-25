import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/lib/messages-api';
import toast from 'react-hot-toast';

export const messageQueryKeys = {
  conversations: ['conversations'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
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
    },
  });
}
