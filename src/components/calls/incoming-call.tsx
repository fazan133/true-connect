'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { Profile } from '@/types/database';

interface IncomingCallProps {
  caller: Profile;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({ caller, isVideo, onAccept, onReject }: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-scale-in">
        <div className="relative inline-block mb-4">
          <Avatar
            src={caller.avatar_url}
            alt={caller.full_name || caller.username}
            size="xl"
          />
          <div className="absolute -bottom-1 -right-1 p-2 bg-primary-500 rounded-full animate-pulse">
            {isVideo ? (
              <Video className="h-4 w-4 text-white" />
            ) : (
              <Phone className="h-4 w-4 text-white" />
            )}
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-1">
          {caller.full_name || caller.username}
        </h2>
        <p className="text-neutral-500 mb-6">
          Incoming {isVideo ? 'video' : 'voice'} call...
        </p>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onReject}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={onAccept}
            className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors animate-pulse"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Ringtone effect - pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 border-4 border-primary-500/30 rounded-full animate-ping" />
      </div>
    </div>
  );
}
