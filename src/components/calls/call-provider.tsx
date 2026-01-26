'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { callApi, CallSignal } from '@/lib/call-api';
import { IncomingCall } from './incoming-call';
import { ActiveCall } from './active-call';
import type { Profile } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface CallContextType {
  startCall: (otherUser: Profile, isVideo: boolean) => void;
  isInCall: boolean;
}

const CallContext = createContext<CallContextType>({
  startCall: () => {},
  isInCall: false,
});

export const useCall = () => useContext(CallContext);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<{
    caller: Profile;
    isVideo: boolean;
  } | null>(null);
  const [activeCall, setActiveCall] = useState<{
    otherUser: Profile;
    isVideo: boolean;
    isOutgoing: boolean;
  } | null>(null);

  const isInCall = !!activeCall;

  // Handle incoming call offers
  const handleIncomingSignal = useCallback(async (signal: CallSignal) => {
    if (signal.type === 'offer' && !activeCall && !incomingCall) {
      // Fetch caller profile
      const supabase = createClient();
      const { data: caller } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signal.caller_id)
        .single();

      if (caller) {
        setIncomingCall({
          caller: caller as Profile,
          isVideo: signal.data.isVideo,
        });
      }
    } else if (signal.type === 'call-reject' || signal.type === 'call-end') {
      if (activeCall && signal.caller_id === activeCall.otherUser.id) {
        setActiveCall(null);
        toast('Call ended', { icon: '📞' });
      }
    }
  }, [activeCall, incomingCall]);

  // Subscribe to incoming call signals
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = callApi.subscribeToSignals(user.id, handleIncomingSignal);

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleIncomingSignal]);

  const startCall = (otherUser: Profile, isVideo: boolean) => {
    if (activeCall) {
      toast.error('You are already in a call');
      return;
    }
    setActiveCall({
      otherUser,
      isVideo,
      isOutgoing: true,
    });
  };

  const acceptCall = () => {
    if (incomingCall) {
      setActiveCall({
        otherUser: incomingCall.caller,
        isVideo: incomingCall.isVideo,
        isOutgoing: false,
      });
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await callApi.sendSignal(incomingCall.caller.id, 'call-reject', {});
      await callApi.cleanupSignals(incomingCall.caller.id);
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    setActiveCall(null);
  };

  return (
    <CallContext.Provider value={{ startCall, isInCall }}>
      {children}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active Call */}
      {activeCall && user && (
        <ActiveCall
          otherUser={activeCall.otherUser}
          isVideo={activeCall.isVideo}
          isOutgoing={activeCall.isOutgoing}
          currentUserId={user.id}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  );
}
