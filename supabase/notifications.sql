-- Notifications Schema for True-Connect
-- Run this in your Supabase SQL Editor AFTER the main schema

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow inserts from triggers (system)
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification on like
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new likes
DROP TRIGGER IF EXISTS on_new_like ON public.likes;
CREATE TRIGGER on_new_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

-- Function to create notification on comment
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new comments
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- Function to create notification on follow
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new follows
DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow();

-- Function to delete notification when like is removed
CREATE OR REPLACE FUNCTION public.handle_delete_like()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE actor_id = OLD.user_id 
    AND post_id = OLD.post_id 
    AND type = 'like';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for deleted likes
DROP TRIGGER IF EXISTS on_delete_like ON public.likes;
CREATE TRIGGER on_delete_like
  AFTER DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_like();

-- Function to delete notification when follow is removed
CREATE OR REPLACE FUNCTION public.handle_delete_follow()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE actor_id = OLD.follower_id 
    AND user_id = OLD.following_id 
    AND type = 'follow';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for deleted follows
DROP TRIGGER IF EXISTS on_delete_follow ON public.follows;
CREATE TRIGGER on_delete_follow
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_follow();
