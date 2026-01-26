import { createClient } from '@/lib/supabase/client';
import type { Post, PostWithAuthor, Profile, Comment, CommentWithAuthor, Like } from '@/types/database';

// Create a shared client instance
const getSupabase = () => createClient();

// Type helpers for Supabase responses
type SupabaseResponse<T> = T | null;

// Posts API
export const postsApi = {
  async getFeed({ pageParam = 0 }: { pageParam?: number }) {
    const supabase = getSupabase();
    const limit = 10;
    const from = pageParam * limit;
    const to = from + limit - 1;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Return empty feed instead of throwing - auth might still be loading
      return { posts: [], nextPage: undefined };
    }

    // Get list of users the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    // Create array of user IDs to show posts from (followed users + own posts)
    const followingIds = (following as any[] | null)?.map(f => f.following_id) || [];
    const userIds = [...followingIds, user.id];

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*),
        likes (*),
        comments (id)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const posts = (data as any[])?.map((post: any) => ({
      ...post,
      _count: {
        likes: post.likes?.length || 0,
        comments: post.comments?.length || 0,
      },
      isLiked: post.likes?.some((like: any) => like.user_id === user?.id) || false,
    })) as PostWithAuthor[];

    return {
      posts,
      nextPage: data && data.length === limit ? pageParam + 1 : undefined,
    };
  },

  async getPostById(id: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*),
        likes (*),
        comments (id)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const postData = data as any;
    return {
      ...postData,
      _count: {
        likes: postData.likes?.length || 0,
        comments: postData.comments?.length || 0,
      },
      isLiked: postData.likes?.some((like: any) => like.user_id === user?.id) || false,
    } as PostWithAuthor;
  },

  async getUserPosts(userId: string, pageParam = 0) {
    const supabase = getSupabase();
    const limit = 10;
    const from = pageParam * limit;
    const to = from + limit - 1;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*),
        likes (*),
        comments (id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const posts = (data as any[])?.map((post: any) => ({
      ...post,
      _count: {
        likes: post.likes?.length || 0,
        comments: post.comments?.length || 0,
      },
      isLiked: post.likes?.some((like: any) => like.user_id === user?.id) || false,
    })) as PostWithAuthor[];

    return {
      posts,
      nextPage: data && data.length === limit ? pageParam + 1 : undefined,
    };
  },

  async createPost({ content, imageUrl }: { content: string; imageUrl?: string }) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content,
        image_url: imageUrl,
      } as any)
      .select(`
        *,
        profiles (*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deletePost(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
  },
};

// Likes API
export const likesApi = {
  async likePost(postId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: postId } as any);

    if (error && error.code !== '23505') throw error; // Ignore unique constraint violation
  },

  async unlikePost(postId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (error) throw error;
  },
};

// Comments API
export const commentsApi = {
  async getComments(postId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (*)
      `)
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      ((data || []) as any[]).map(async (comment: any) => {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            *,
            profiles (*)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        } as CommentWithAuthor;
      })
    );

    return commentsWithReplies;
  },

  async createComment({
    postId,
    content,
    parentId,
  }: {
    postId: string;
    content: string;
    parentId?: string;
  }) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        post_id: postId,
        content,
        parent_id: parentId,
      } as any)
      .select(`
        *,
        profiles (*)
      `)
      .single();

    if (error) throw error;
    return data as CommentWithAuthor;
  },

  async deleteComment(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
  },
};

// Profiles API
export const profilesApi = {
  async getProfile(username: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;

    const profileData = data as any;

    // Get follower and following counts
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id),
    ]);

    // Check if current user follows this profile
    let isFollowing = false;
    let hasPendingRequest = false;
    if (user && user.id !== profileData.id) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .single();
      isFollowing = !!follow;

      // Check for pending follow request
      if (!isFollowing) {
        const { data: request } = await supabase
          .from('follow_requests')
          .select('id')
          .eq('requester_id', user.id)
          .eq('target_id', profileData.id)
          .eq('status', 'pending')
          .single();
        hasPendingRequest = !!request;
      }
    }

    // Get posts count
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileData.id);

    return {
      ...profileData,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      postsCount: postsCount || 0,
      isFollowing,
      hasPendingRequest,
      isOwnProfile: user?.id === profileData.id,
    };
  },

  async updateProfile(updates: Partial<Profile>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // @ts-ignore - Supabase typing issue
    const { data, error } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async searchProfiles(query: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return (data || []) as Profile[];
  },
};

// Follows API
export const followsApi = {
  async followUser(userId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId } as any);

    if (error && error.code !== '23505') throw error;
  },

  async unfollowUser(userId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
  },

  async getFollowers(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follows_follower_id_fkey (*)
      `)
      .eq('following_id', userId);

    if (error) throw error;
    return (data as any[])?.map((f: any) => f.follower) || [];
  },

  async getFollowing(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!follows_following_id_fkey (*)
      `)
      .eq('follower_id', userId);

    if (error) throw error;
    return (data as any[])?.map((f: any) => f.following) || [];
  },
};

// Follow Requests API
export const followRequestsApi = {
  async sendFollowRequest(targetUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follow_requests')
      .insert({ requester_id: user.id, target_id: targetUserId } as any);

    if (error && error.code !== '23505') throw error;
  },

  async cancelFollowRequest(targetUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', user.id)
      .eq('target_id', targetUserId);

    if (error) throw error;
  },

  async acceptFollowRequest(requesterId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // @ts-ignore - Supabase typing issue
    const { error } = await supabase
      .from('follow_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() } as never)
      .eq('requester_id', requesterId)
      .eq('target_id', user.id);

    if (error) throw error;
  },

  async rejectFollowRequest(requesterId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('target_id', user.id);

    if (error) throw error;
  },

  async getPendingRequests() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('follow_requests')
      .select(`
        *,
        requester:profiles!follow_requests_requester_id_fkey (*)
      `)
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSentRequests() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return (data as any[])?.map((r: any) => r.target_id) || [];
  },

  async getFollowStatus(targetUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isFollowing: false, hasPendingRequest: false };

    // Check if following
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    // Check if has pending request
    const { data: requestData } = await supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', user.id)
      .eq('target_id', targetUserId)
      .eq('status', 'pending')
      .single();

    return {
      isFollowing: !!followData,
      hasPendingRequest: !!requestData,
    };
  },
};

// Storage API
export const storageApi = {
  async uploadImage(file: File, bucket: string = 'images') {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  },
};

// Notifications API
export const notificationsApi = {
  async getNotifications() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return []; // Return empty instead of throwing

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey (*),
        post:posts (id, content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  async markAsRead(notificationId: string) {
    const supabase = getSupabase();
    // @ts-ignore - Supabase typing issue
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('id', notificationId);

    if (error) throw error;
  },

  async markAllAsRead() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // @ts-ignore - Supabase typing issue
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
  },

  async getUnreadCount() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  },
};

// Real-time subscription helper
export const realtimeApi = {
  subscribeToLikes(postIds: string[], callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        (payload) => {
          // Check if this like is for one of our posts
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postIds.includes(postId)) {
            callback();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToNotifications(userId: string, callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
