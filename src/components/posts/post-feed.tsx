'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { useRealtimeFeed } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { PostCard } from '@/components/posts/post-card';
import { PostSkeleton } from '@/components/ui/skeleton';

export function PostFeed() {
  const { user, isLoading: authLoading } = useAuth();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useRealtimeFeed();

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Wait for auth to be ready
  if (authLoading || !user) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          Something went wrong loading the feed.
        </p>
        <button
          onClick={() => refetch()}
          className="text-primary-500 hover:text-primary-600 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
        <p className="text-neutral-600 dark:text-neutral-400 mb-2">
          Your feed is empty.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Follow some users to see their posts here, or create your own post!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={ref} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        )}
      </div>
    </div>
  );
}
