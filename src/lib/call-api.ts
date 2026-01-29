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
  // Check if users are friends (can call each other)
  async checkAreFriends(otherUserId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if there's a friendship between the users
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', otherUserId)
      .maybeSingle();

    return !!friendship;
  },

  // Get pending offer from a caller
  async getPendingOffer(callerId: string): Promise<CallSignal | null> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('call_signals')
      .select('*')
      .eq('caller_id', callerId)
      .eq('receiver_id', user.id)
      .eq('type', 'offer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CallSignal;
  },

  // Get pending ICE candidates from a caller
  async getPendingIceCandidates(callerId: string): Promise<CallSignal[]> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('call_signals')
      .select('*')
      .eq('caller_id', callerId)
      .eq('receiver_id', user.id)
      .eq('type', 'ice-candidate')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as CallSignal[];
  },

  // Get pending answer from receiver (for caller to fetch)
  async getPendingAnswer(receiverId: string): Promise<CallSignal | null> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('call_signals')
      .select('*')
      .eq('caller_id', receiverId)
      .eq('receiver_id', user.id)
      .eq('type', 'answer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CallSignal;
  },

  // Get all pending signals from other user (for polling)
  async getPendingSignals(otherUserId: string): Promise<CallSignal[]> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('call_signals')
      .select('*')
      .eq('caller_id', otherUserId)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as CallSignal[];
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
// Using free TURN servers from Open Relay Project for better connectivity
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN servers from Metered (limited but works for testing)
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'e5f1a882c8d5e6f8c9a7b3d2',
      credential: 'kP8mN3vR5tY7wX9z',
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'e5f1a882c8d5e6f8c9a7b3d2',
      credential: 'kP8mN3vR5tY7wX9z',
    },
    {
      urls: 'turn:a.relay.metered.ca:443?transport=tcp',
      username: 'e5f1a882c8d5e6f8c9a7b3d2',
      credential: 'kP8mN3vR5tY7wX9z',
    },
  ],
  iceCandidatePoolSize: 10,
};
