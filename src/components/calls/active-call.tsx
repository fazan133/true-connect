'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { callApi, rtcConfig, CallSignal } from '@/lib/call-api';
import type { Profile } from '@/types/database';
import { cn } from '@/lib/utils';

interface ActiveCallProps {
  otherUser: Profile;
  isVideo: boolean;
  isOutgoing: boolean;
  currentUserId: string;
  onEndCall: () => void;
}

export function ActiveCall({ 
  otherUser, 
  isVideo, 
  isOutgoing, 
  currentUserId,
  onEndCall 
}: ActiveCallProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const callStartTime = useRef<number | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected' && callStartTime.current) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Initialize WebRTC
  const initializeCall = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      localStream.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams[0]) {
          // Set video element source
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          // Also set audio element for voice-only calls or as backup
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callApi.sendSignal(otherUser.id, 'ice-candidate', {
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          callStartTime.current = Date.now();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleEndCall();
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallStatus('connected');
          if (!callStartTime.current) {
            callStartTime.current = Date.now();
          }
        } else if (pc.iceConnectionState === 'failed') {
          console.error('ICE connection failed');
          handleEndCall();
        }
      };

      if (isOutgoing) {
        // Create and send offer
        setCallStatus('ringing');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await callApi.sendSignal(otherUser.id, 'offer', {
          sdp: offer,
          isVideo,
        });
        
        // Poll for answer since realtime subscription might miss it
        const pollForAnswer = async () => {
          const maxAttempts = 60; // 30 seconds
          for (let i = 0; i < maxAttempts; i++) {
            if (!peerConnection.current || peerConnection.current.connectionState === 'connected') {
              return;
            }
            
            const pendingAnswer = await callApi.getPendingAnswer(otherUser.id);
            if (pendingAnswer && !pc.remoteDescription) {
              console.log('Found pending answer via polling');
              await pc.setRemoteDescription(new RTCSessionDescription(pendingAnswer.data.sdp));
              
              // Also get any pending ICE candidates
              const pendingCandidates = await callApi.getPendingIceCandidates(otherUser.id);
              for (const candidate of pendingCandidates) {
                if (candidate.data.candidate) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate.data.candidate));
                  } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                  }
                }
              }
              return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        };
        pollForAnswer();
      } else {
        // Receiver: fetch the pending offer and respond
        setCallStatus('connecting');
        const pendingOffer = await callApi.getPendingOffer(otherUser.id);
        if (pendingOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await callApi.sendSignal(otherUser.id, 'answer', { sdp: answer });
          
          // Also add any pending ICE candidates
          const pendingCandidates = await callApi.getPendingIceCandidates(otherUser.id);
          for (const candidate of pendingCandidates) {
            if (candidate.data.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate.data.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            }
          }
          
          // Continue polling for new ICE candidates
          const pollForIceCandidates = async () => {
            const processedIds = new Set(pendingCandidates.map(c => c.id));
            const maxAttempts = 30;
            for (let i = 0; i < maxAttempts; i++) {
              if (!peerConnection.current || peerConnection.current.connectionState === 'connected') {
                return;
              }
              
              const newCandidates = await callApi.getPendingIceCandidates(otherUser.id);
              for (const candidate of newCandidates) {
                if (!processedIds.has(candidate.id) && candidate.data.candidate) {
                  processedIds.add(candidate.id);
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate.data.candidate));
                  } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                  }
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          };
          pollForIceCandidates();
        }
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      onEndCall();
    }
  }, [isVideo, isOutgoing, otherUser.id, onEndCall]);

  // Helper to flush pending ICE candidates
  const flushIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of pendingIceCandidates.current) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error('Error adding buffered ICE candidate:', e);
      }
    }
    pendingIceCandidates.current = [];
  }, []);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: CallSignal) => {
    if (signal.caller_id !== otherUser.id) return;

    const pc = peerConnection.current;
    if (!pc) {
      console.log('No peer connection yet, ignoring signal:', signal.type);
      return;
    }

    console.log('Handling signal:', signal.type);

    try {
      switch (signal.type) {
        case 'offer':
          // Only handle if we haven't set remote description yet
          if (!pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
            await flushIceCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await callApi.sendSignal(otherUser.id, 'answer', { sdp: answer });
          }
          break;

        case 'answer':
          if (!pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
            await flushIceCandidates(pc);
            console.log('Answer received and set, connection should establish');
          }
          break;

        case 'ice-candidate':
          if (signal.data.candidate) {
            const candidate = new RTCIceCandidate(signal.data.candidate);
            // Buffer if no remote description yet
            if (pc.remoteDescription) {
              await pc.addIceCandidate(candidate);
            } else {
              console.log('Buffering ICE candidate, no remote description yet');
              pendingIceCandidates.current.push(candidate);
            }
          }
          break;

        case 'call-end':
        case 'call-reject':
          handleEndCall();
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }, [otherUser.id, flushIceCandidates]);

  // Initialize call and subscribe to signals
  useEffect(() => {
    initializeCall();

    const unsubscribe = callApi.subscribeToSignals(currentUserId, handleSignal);

    return () => {
      unsubscribe();
      cleanup();
    };
  }, [initializeCall, currentUserId, handleSignal]);

  const cleanup = () => {
    localStream.current?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    localStream.current = null;
    peerConnection.current = null;
  };

  const handleEndCall = async () => {
    try {
      await callApi.sendSignal(otherUser.id, 'call-end', {});
    } catch (error) {
      // Ignore errors when ending call
    }
    cleanup();
    await callApi.cleanupSignals(otherUser.id);
    onEndCall();
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={cn(
      "fixed z-50 bg-neutral-900 flex flex-col",
      isFullscreen ? "inset-0" : "bottom-4 right-4 w-96 h-[500px] rounded-2xl shadow-2xl"
    )}>
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Remote Video / Avatar */}
      <div className="flex-1 relative bg-neutral-800 overflow-hidden rounded-t-2xl">
        {callStatus === 'connected' && isVideo && !isVideoOff ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Avatar
              src={otherUser.avatar_url}
              alt={otherUser.full_name || otherUser.username}
              size="xl"
            />
            <h3 className="text-white text-xl font-semibold mt-4">
              {otherUser.full_name || otherUser.username}
            </h3>
            <p className="text-neutral-400 mt-1">
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
            </p>
          </div>
        )}

        {/* Local Video (PiP) */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden bg-neutral-700 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                isVideoOff && "hidden"
              )}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-neutral-400" />
              </div>
            )}
          </div>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-neutral-900 rounded-b-2xl">
        <button
          onClick={toggleMute}
          className={cn(
            "p-4 rounded-full transition-colors",
            isMuted 
              ? "bg-red-500 text-white" 
              : "bg-neutral-700 text-white hover:bg-neutral-600"
          )}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {isVideo && (
          <button
            onClick={toggleVideo}
            className={cn(
              "p-4 rounded-full transition-colors",
              isVideoOff 
                ? "bg-red-500 text-white" 
                : "bg-neutral-700 text-white hover:bg-neutral-600"
            )}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
