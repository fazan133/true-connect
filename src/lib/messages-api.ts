import { createClient } from '@/lib/supabase/client';
import type { ConversationWithDetails, MessageWithSender } from '@/types/database';

// Helper to get fresh Supabase client
const getSupabase = () => createClient();

export const messagesApi = {
  async getConversations() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get full conversation details with other participant
    const conversations = await Promise.all(
      (data || []).map(async (cp: any) => {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            profiles (*)
          `)
          .eq('conversation_id', cp.conversation_id)
          .neq('user_id', user.id);

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', cp.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', cp.conversation_id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        return {
          ...cp.conversations,
          otherUser: (participants as any[])?.[0]?.profiles,
          lastMessage,
          unreadCount: unreadCount || 0,
        };
      })
    );

    // Sort by last message or creation date
    return conversations.sort((a, b) => {
      const dateA = a.lastMessage?.created_at || a.updated_at;
      const dateB = b.lastMessage?.created_at || b.updated_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  },

  async getOrCreateConversation(otherUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use the database function to create/get conversation (bypasses RLS issues)
    // @ts-ignore - Custom RPC function
    const { data, error } = await supabase
      .rpc('create_conversation_with_participant', { other_user_id: otherUserId } as never);

    if (error) throw error;
    return data as string;
  },

  async getMessages(conversationId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles (*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as MessageWithSender[];
  },

  async sendMessage(conversationId: string, content: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      } as any)
      .select(`
        *,
        profiles (*)
      `)
      .single();

    if (error) throw error;
    return data as MessageWithSender;
  },

  async markAsRead(conversationId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // @ts-ignore - Supabase typing issue
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() } as never)
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (error) throw error;
  },

  async getTotalUnreadCount() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get all conversations the user is part of
    const { data: conversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map((c: any) => c.conversation_id);

    // Count unread messages in all conversations
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (error) return 0;
    return count || 0;
  },

  subscribeToAllMessages(userId: string, callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Only trigger callback if message is not from current user
          if ((payload.new as any)?.sender_id !== userId) {
            callback();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToMessages(conversationId: string, callback: (message: MessageWithSender) => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          // Fetch the full message with profile
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data as MessageWithSender);
          }
        }
      )
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
      });

    return {
      unsubscribe: () => {
        console.log('Unsubscribing from messages channel');
        supabase.removeChannel(channel);
      }
    };
  },
};
