import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { postsApi, likesApi, commentsApi, profilesApi, followsApi, followRequestsApi, storageApi, notificationsApi, realtimeApi } from '@/lib/api';
import type { PostWithAuthor } from '@/types/database';
import toast from 'react-hot-toast';

// Query keys
export const queryKeys = {
  feed: ['feed'] as const,
  post: (id: string) => ['post', id] as const,
  userPosts: (userId: string) => ['userPosts', userId] as const,
  comments: (postId: string) => ['comments', postId] as const,
  profile: (username: string) => ['profile', username] as const,
  followers: (userId: string) => ['followers', userId] as const,
  following: (userId: string) => ['following', userId] as const,
  searchProfiles: (query: string) => ['searchProfiles', query] as const,
  notifications: ['notifications'] as const,
  unreadNotificationCount: ['unreadNotificationCount'] as const,
  pendingFollowRequests: ['pendingFollowRequests'] as const,
};

// Feed hooks
export function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: postsApi.getFeed,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => postsApi.getPostById(id),
    enabled: !!id,
  });
}

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.userPosts(userId),
    queryFn: ({ pageParam }) => postsApi.getUserPosts(userId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      toast.success('Post created!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      toast.success('Post deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete post');
    },
  });
}

// Like hooks with optimistic updates
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likesApi.likePost,
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });

      // Snapshot previous value
      const previousFeed = queryClient.getQueryData(queryKeys.feed);

      // Optimistically update
      queryClient.setQueryData(queryKeys.feed, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: PostWithAuthor) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: true,
                    _count: { ...post._count, likes: (post._count?.likes || 0) + 1 },
                  }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(queryKeys.feed, context?.previousFeed);
      toast.error('Failed to like post');
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likesApi.unlikePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previousFeed = queryClient.getQueryData(queryKeys.feed);

      queryClient.setQueryData(queryKeys.feed, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: PostWithAuthor) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: false,
                    _count: { ...post._count, likes: Math.max(0, (post._count?.likes || 0) - 1) },
                  }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(queryKeys.feed, context?.previousFeed);
      toast.error('Failed to unlike post');
    },
  });
}

// Comments hooks
export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => commentsApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commentsApi.createComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commentsApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });
}

// Profile hooks
export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: () => profilesApi.getProfile(username),
    enabled: !!username,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profilesApi.updateProfile,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(data.username) });
      toast.success('Profile updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: queryKeys.searchProfiles(query),
    queryFn: () => profilesApi.searchProfiles(query),
    enabled: query.length > 0,
  });
}

// Follow hooks
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followsApi.followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Following!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to follow');
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followsApi.unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Unfollowed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unfollow');
    },
  });
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: queryKeys.followers(userId),
    queryFn: () => followsApi.getFollowers(userId),
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: queryKeys.following(userId),
    queryFn: () => followsApi.getFollowing(userId),
    enabled: !!userId,
  });
}

// Follow Request hooks
export function useSendFollowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followRequestsApi.sendFollowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Follow request sent!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send request');
    },
  });
}

export function useCancelFollowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followRequestsApi.cancelFollowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Request cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel request');
    },
  });
}

export function useAcceptFollowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followRequestsApi.acceptFollowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingFollowRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Follow request accepted!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept request');
    },
  });
}

export function useRejectFollowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followRequestsApi.rejectFollowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingFollowRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success('Follow request rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject request');
    },
  });
}

export function usePendingFollowRequests() {
  return useQuery({
    queryKey: queryKeys.pendingFollowRequests,
    queryFn: followRequestsApi.getPendingRequests,
  });
}

// Storage hooks
export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => storageApi.uploadImage(file, 'images'),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });
}

// Notifications hooks
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: notificationsApi.getNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.unreadNotificationCount,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    },
  });
}

// Real-time hooks
export function useRealtimeFeed() {
  const queryClient = useQueryClient();
  const feedQuery = useFeed();
  
  useEffect(() => {
    const posts = feedQuery.data?.pages.flatMap(page => page.posts) || [];
    const postIds = posts.map(post => post.id);
    
    if (postIds.length === 0) return;

    const unsubscribe = realtimeApi.subscribeToLikes(postIds, () => {
      // Refetch the feed when likes change
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    });

    return unsubscribe;
  }, [feedQuery.data, queryClient]);

  return feedQuery;
}

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = realtimeApi.subscribeToNotifications(userId, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
      toast('You have a new notification!', { icon: '🔔' });
    });

    return unsubscribe;
  }, [userId, queryClient]);
}
