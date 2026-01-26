-- Fix for accepting follow requests
-- The RLS policy only allows users to insert follows where they are the follower_id
-- But when accepting a request, the current user is the following_id
-- This function bypasses RLS to handle this case securely

-- Option 1: Update RLS policy to allow accepting follow requests
-- Drop the old policy and create a new one that allows both cases

DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;

CREATE POLICY "Users can create follows" ON public.follows
  FOR INSERT WITH CHECK (
    -- User can follow someone (they are the follower)
    auth.uid() = follower_id
    OR
    -- User can accept a follow request (they are being followed AND there's a pending request)
    (
      auth.uid() = following_id
      AND EXISTS (
        SELECT 1 FROM public.follow_requests
        WHERE requester_id = follower_id
        AND target_id = following_id
        AND status = 'pending'
      )
    )
  );

-- Also update delete policy to allow users to remove their followers
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

CREATE POLICY "Users can delete follows" ON public.follows
  FOR DELETE USING (
    -- User can unfollow someone (they are the follower)
    auth.uid() = follower_id
    OR
    -- User can remove a follower (they are being followed)
    auth.uid() = following_id
  );
