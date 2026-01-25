-- Private Account Feature for True-Connect
-- Run this in your Supabase SQL Editor

-- Add is_private column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Create follow_requests table
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- Indexes for follow_requests
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON public.follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_id ON public.follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON public.follow_requests(status);

-- Enable RLS for follow_requests
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow_requests
CREATE POLICY "Users can view their own follow requests" ON public.follow_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create follow requests" ON public.follow_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target users can update follow requests" ON public.follow_requests
  FOR UPDATE USING (auth.uid() = target_id);

CREATE POLICY "Users can delete their own requests" ON public.follow_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Enable realtime for follow_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_requests;

-- Update posts RLS policy to respect private accounts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Posts are viewable based on privacy" ON public.posts
  FOR SELECT USING (
    -- User can always see their own posts
    auth.uid() = user_id
    OR
    -- Posts from public accounts are visible to everyone
    NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = posts.user_id AND profiles.is_private = true
    )
    OR
    -- Posts from private accounts are visible to approved followers
    EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follows.follower_id = auth.uid() 
      AND follows.following_id = posts.user_id
    )
  );

-- Function to create notification on follow request
CREATE OR REPLACE FUNCTION public.handle_new_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.target_id, NEW.requester_id, 'follow_request');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new follow requests
DROP TRIGGER IF EXISTS on_new_follow_request ON public.follow_requests;
CREATE TRIGGER on_new_follow_request
  AFTER INSERT ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow_request();

-- Function to handle accepted follow request (create follow + notification)
CREATE OR REPLACE FUNCTION public.handle_accept_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create the follow relationship
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- Delete the follow request notification
    DELETE FROM public.notifications 
    WHERE actor_id = NEW.requester_id 
      AND user_id = NEW.target_id 
      AND type = 'follow_request';
    
    -- Create accepted notification for requester
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.requester_id, NEW.target_id, 'follow_accepted');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for accepted follow requests
DROP TRIGGER IF EXISTS on_accept_follow_request ON public.follow_requests;
CREATE TRIGGER on_accept_follow_request
  AFTER UPDATE ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_accept_follow_request();

-- Update notifications check constraint to include new types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'follow', 'follow_request', 'follow_accepted'));
