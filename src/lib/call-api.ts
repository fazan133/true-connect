import { createClient } from '@/lib/supabase/client';

const getSupabase = () => createClient();

export interface CallSignal {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end' | 'call-reject';
  data: any;
  created_at: string;
}

export const callApi = {
  // Check if users mutually follow each other
  async checkMutualFollow(otherUserId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if current user follows the other user
    const { data: iFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', otherUserId)
      .maybeSingle();

    if (!iFollow) return false;

    // Check if other user follows current user
    const { data: theyFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', otherUserId)
      .eq('following_id', user.id)
      .maybeSingle();

    return !!theyFollow;
  },

  // Send a call signal (offer, answer, ice-candidate, etc.)
  async sendSignal(receiverId: string, type: CallSignal['type'], data: any) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('call_signals')
      .insert({
        caller_id: user.id,
        receiver_id: receiverId,
        type,
        data,
      } as any);

    if (error) throw error;
  },

  // Subscribe to incoming call signals
  subscribeToSignals(userId: string, callback: (signal: CallSignal) => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`call-signals-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: any) => {
          callback(payload.new as CallSignal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Clean up old signals
  async cleanupSignals(otherUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete signals between these two users
    await supabase
      .from('call_signals')
      .delete()
      .or(`caller_id.eq.${user.id},caller_id.eq.${otherUserId}`)
      .or(`receiver_id.eq.${user.id},receiver_id.eq.${otherUserId}`);
  },
};

// WebRTC configuration
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};
