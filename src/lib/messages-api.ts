import { createClient } from '@/lib/supabase/client';
import type { ConversationWithDetails, MessageWithSender } from '@/types/database';

// Helper to get fresh Supabase client
const getSupabase = () => createClient();

// Compress image before upload
async function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

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

  async deleteConversation(conversationId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First, get all messages with images to delete from storage
    const { data: messages } = await supabase
      .from('messages')
      .select('image_url')
      .eq('conversation_id', conversationId)
      .not('image_url', 'is', null);

    // Delete images from storage
    if (messages && messages.length > 0) {
      const imagePaths = messages
        .filter((m: any) => m.image_url)
        .map((m: any) => {
          // Extract path from URL
          const url = m.image_url;
          const match = url.match(/chat-images\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (imagePaths.length > 0) {
        await supabase.storage.from('chat-images').remove(imagePaths);
      }
    }

    // Delete messages
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    // Delete conversation participants
    await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId);

    // Delete conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  },

  async sendImageMessage(conversationId: string, file: File) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Compress the image
    const compressedImage = await compressImage(file);
    
    // Generate unique filename
    const fileExt = 'jpg'; // Always save as jpg after compression
    const fileName = `${conversationId}/${user.id}-${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, compressedImage, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    // Create message with image
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: '📷 Image',
        image_url: publicUrl,
      } as any)
      .select(`
        *,
        profiles (*)
      `)
      .single();

    if (error) throw error;
    return data as MessageWithSender;
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

  subscribeToReadReceipts(conversationId: string, callback: (messageId: string, readAt: string) => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`read-receipts-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Only trigger if read_at was updated (was null, now has value)
          const newReadAt = (payload.new as any)?.read_at;
          const oldReadAt = (payload.old as any)?.read_at;
          
          if (newReadAt && !oldReadAt) {
            callback((payload.new as any).id, newReadAt);
          }
        }
      )
      .subscribe((status) => {
        console.log('Read receipts subscription status:', status);
      });

    return {
      unsubscribe: () => {
        console.log('Unsubscribing from read receipts channel');
        supabase.removeChannel(channel);
      }
    };
  },
};
