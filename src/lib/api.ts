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
        .maybeSingle();
      isFollowing = !!follow;

      // Check for pending follow request
      if (!isFollowing) {
        const { data: request } = await supabase
          .from('follow_requests')
          .select('id')
          .eq('requester_id', user.id)
          .eq('target_id', profileData.id)
          .eq('status', 'pending')
          .maybeSingle();
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

  async getSuggestedUsers(limit: number = 5) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get users that the current user is already following
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = (following || []).map((f:any) => f.following_id);
    
    // Get pending follow requests sent by the user
    const { data: pendingRequests } = await supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    const pendingRequestIds = (pendingRequests || []).map((r: any) => r.target_id);
    
    // Combine all IDs to exclude
    const excludeIds = Array.from(new Set([...followingIds, ...pendingRequestIds, user.id]));

    // Get suggested users: newest users that aren't followed yet and don't have pending requests
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Exclude all IDs (current user, following, pending requests)
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suggested users:', error);
      return [];
    }
    return (data || []) as Profile[];
  },
};

// Follows API
export const followsApi = {
  async followUser(userId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if target user has a private account
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_private')
      .eq('id', userId)
      .single();

    if ((targetProfile as any)?.is_private) {
      throw new Error('Cannot directly follow a private account. Send a follow request instead.');
    }

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

  async removeFollower(followerId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', user.id);

    if (error) throw error;
  },
};

// Follow Requests API
export const followRequestsApi = {
  async sendFollowRequest(targetUserId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('follow_requests')
      .select('id, status')
      .eq('requester_id', user.id)
      .eq('target_id', targetUserId)
      .maybeSingle();

    const request = existingRequest as { id: string; status: string } | null;

    if (request) {
      // If there's a rejected or accepted request, delete it and create new one
      if (request.status === 'rejected' || request.status === 'accepted') {
        const { error: deleteError } = await supabase
          .from('follow_requests')
          .delete()
          .eq('id', request.id);
        if (deleteError) throw deleteError;
        // Continue to create new request below
      } else {
        // If already pending, do nothing
        return;
      }
    }

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

    // First create the follow relationship
    const { error: followError } = await supabase
      .from('follows')
      .insert({ follower_id: requesterId, following_id: user.id } as any);

    // Ignore duplicate key error (23505) - they might already be following
    if (followError && followError.code !== '23505') throw followError;

    // Then delete the follow request
    const { error: deleteError } = await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('target_id', user.id);

    if (deleteError) throw deleteError;
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
    if (!user) return { isFollowing: false, hasPendingRequest: false, isPrivate: false };

    // Get target user's privacy status
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_private')
      .eq('id', targetUserId)
      .single();

    // Check if following
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    // Check if has pending request
    const { data: requestData } = await supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', user.id)
      .eq('target_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle();

    return {
      isFollowing: !!followData,
      hasPendingRequest: !!requestData,
      isPrivate: !!(targetProfile as any)?.is_private,
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

  async deleteNotification(notificationId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error, count } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
    console.log('Deleted notification:', notificationId, 'count:', count);
  },
};

// Real-time subscription helper
export const realtimeApi = {
  subscribeToPosts(callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
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

  subscribeToLikes(callback: () => void) {
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
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToComments(callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
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

  subscribeToPostComments(postId: string, callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
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

  subscribeToNotifications(userId: string, callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`notifications-${userId}`)
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

  subscribeToFollowRequests(userId: string, callback: () => void) {
    const supabase = getSupabase();
    
    // Subscribe to follow requests where user is the target (receiving requests)
    const channel = supabase
      .channel('follow-requests-target')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          filter: `target_id=eq.${userId}`,
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

  subscribeToSentFollowRequests(userId: string, callback: () => void) {
    const supabase = getSupabase();
    
    // Subscribe to follow requests where user is the requester (sent requests)
    const channel = supabase
      .channel('follow-requests-sender')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          filter: `requester_id=eq.${userId}`,
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

  subscribeToFollows(callback: () => void) {
    const supabase = getSupabase();
    
    const channel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
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
