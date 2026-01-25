-- Fix for infinite recursion in conversation_participants RLS policy
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: DISABLE RLS temporarily to clean up
-- ============================================
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL policies (using DO block to handle any policy names)
-- ============================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on conversations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
    END LOOP;
    
    -- Drop all policies on conversation_participants
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', pol.policyname);
    END LOOP;
    
    -- Drop all policies on messages
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create SECURITY DEFINER function to check conversation membership
-- ============================================
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid);

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, usr_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = usr_id
  );
$$;

-- ============================================
-- STEP 4: Re-enable RLS
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create clean policies
-- ============================================

-- CONVERSATIONS POLICIES
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

-- CONVERSATION_PARTICIPANTS POLICIES
CREATE POLICY "participants_select" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "participants_insert" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- MESSAGES POLICIES
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- ============================================
-- STEP 6: Create a function to create conversations that bypasses RLS
-- ============================================
CREATE OR REPLACE FUNCTION public.create_conversation_with_participant(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  current_user_id uuid;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if conversation already exists between these users
  SELECT cp1.conversation_id INTO new_conv_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id AND cp2.user_id = other_user_id
  LIMIT 1;
  
  IF new_conv_id IS NOT NULL THEN
    RETURN new_conv_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO new_conv_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conv_id, current_user_id),
    (new_conv_id, other_user_id);
  
  RETURN new_conv_id;
END;
$$;
