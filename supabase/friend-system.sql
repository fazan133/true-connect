-- Friend System Migration
-- This replaces the follow system with a mutual friendship model

-- First, rename follows table to friendships
ALTER TABLE IF EXISTS public.follows RENAME TO friendships;

-- Add status column to friendships (for backward compatibility during migration)
ALTER TABLE public.friendships 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted' CHECK (status IN ('accepted'));

-- Rename columns in friendships table
ALTER TABLE public.friendships RENAME COLUMN follower_id TO user_id;
ALTER TABLE public.friendships RENAME COLUMN following_id TO friend_id;

-- Update indexes
DROP INDEX IF EXISTS idx_follows_follower_id;
DROP INDEX IF EXISTS idx_follows_following_id;
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);

-- Rename follow_requests to friend_requests  
ALTER TABLE IF EXISTS public.follow_requests RENAME TO friend_requests;

-- Update friend_requests columns if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='friend_requests' AND column_name='requester_id') THEN
    -- Column exists, keep it
    NULL;
  END IF;
END $$;

-- Ensure friend_requests has correct structure
-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CHECK (requester_id != target_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_target ON public.friend_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);

-- Enable RLS on friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.friendships;
DROP POLICY IF EXISTS "Users can create their own follows" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.friendships;

CREATE POLICY "Friendships are viewable by participants" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for friend_requests
DROP POLICY IF EXISTS "Users can view their friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update friend requests they received" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can delete their sent requests" ON public.friend_requests;

CREATE POLICY "Users can view their friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = target_id);

CREATE POLICY "Users can delete friend requests" ON public.friend_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Add email column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request and create mutual friendship
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  v_requester_id UUID;
  v_target_id UUID;
BEGIN
  -- Get the request details
  SELECT requester_id, target_id INTO v_requester_id, v_target_id
  FROM public.friend_requests
  WHERE id = request_id AND target_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;
  
  -- Create mutual friendships (both directions)
  INSERT INTO public.friendships (user_id, friend_id) 
  VALUES (v_requester_id, v_target_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  INSERT INTO public.friendships (user_id, friend_id) 
  VALUES (v_target_id, v_requester_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  -- Update the request status
  UPDATE public.friend_requests 
  SET status = 'accepted'
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add friend directly (for public accounts)
CREATE OR REPLACE FUNCTION public.add_friend_direct(friend_user_id UUID)
RETURNS void AS $$
DECLARE
  v_is_private BOOLEAN;
BEGIN
  -- Check if target account is private
  SELECT is_private INTO v_is_private
  FROM public.profiles
  WHERE id = friend_user_id;
  
  IF v_is_private THEN
    RAISE EXCEPTION 'Cannot directly add private account as friend';
  END IF;
  
  -- Create mutual friendships
  INSERT INTO public.friendships (user_id, friend_id) 
  VALUES (auth.uid(), friend_user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  INSERT INTO public.friendships (user_id, friend_id) 
  VALUES (friend_user_id, auth.uid())
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove friend (removes both directions)
CREATE OR REPLACE FUNCTION public.remove_friend(friend_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.friendships 
  WHERE (user_id = auth.uid() AND friend_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notification types to include friend_request
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'follow', 'friend_request', 'friend_accept'));

-- Enable realtime for friend_requests (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  END IF;
END $$;

-- Create view for getting friends (for easier querying)
CREATE OR REPLACE VIEW public.user_friends AS
SELECT 
  f.user_id,
  f.friend_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.is_private,
  p.email,
  f.created_at as friends_since
FROM public.friendships f
JOIN public.profiles p ON p.id = f.friend_id;

-- Grant access to the view
GRANT SELECT ON public.user_friends TO authenticated;
