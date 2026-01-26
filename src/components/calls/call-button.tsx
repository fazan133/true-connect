'use client';

import { useState } from 'react';
import { Phone, Video, Loader2 } from 'lucide-react';
import { callApi } from '@/lib/call-api';
import toast from 'react-hot-toast';

interface CallButtonProps {
  otherUserId: string;
  onStartCall: (isVideo: boolean) => void;
}

export function CallButton({ otherUserId, onStartCall }: CallButtonProps) {
  const [checking, setChecking] = useState(false);

  const handleCall = async (isVideo: boolean) => {
    setChecking(true);
    try {
      const canCall = await callApi.checkMutualFollow(otherUserId);
      if (!canCall) {
        toast.error('You can only call users who follow you back');
        return;
      }
      onStartCall(isVideo);
    } catch (error) {
      toast.error('Failed to start call');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleCall(false)}
        disabled={checking}
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        title="Voice call"
      >
        {checking ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={() => handleCall(true)}
        disabled={checking}
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        title="Video call"
      >
        <Video className="h-5 w-5" />
      </button>
    </div>
  );
}
