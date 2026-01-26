-- Call Signals Table for True-Connect Video/Audio Calling
-- Run this in your Supabase SQL Editor

-- Create call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  caller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'call-end', 'call-reject')),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_signals_caller ON public.call_signals(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver ON public.call_signals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_created ON public.call_signals(created_at);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own signals" ON public.call_signals;
CREATE POLICY "Users can view their own signals" ON public.call_signals
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send signals" ON public.call_signals;
CREATE POLICY "Users can send signals" ON public.call_signals
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can delete their signals" ON public.call_signals;
CREATE POLICY "Users can delete their signals" ON public.call_signals
  FOR DELETE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Auto-cleanup old signals (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_call_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM public.call_signals 
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
