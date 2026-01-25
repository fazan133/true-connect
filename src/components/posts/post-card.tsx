'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useLikePost, useUnlikePost, useDeletePost } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { Modal } from '@/components/ui/modal';
import { CommentsSection } from '@/components/posts/comments-section';
import type { PostWithAuthor } from '@/types/database';

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();

  const isOwner = user?.id === post.user_id;

  const handleLike = () => {
    if (post.isLiked) {
      unlikePost.mutate(post.id);
    } else {
      likePost.mutate(post.id);
    }
  };

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
    setShowDeleteModal(false);
  };

  return (
    <>
      <article className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <Link
              href={`/profile/${post.profiles.username}`}
              className="flex items-center gap-3 group"
            >
              <Avatar
                src={post.profiles.avatar_url}
                alt={post.profiles.full_name || post.profiles.username}
                size="md"
              />
              <div>
                <p className="font-semibold group-hover:text-primary-500 transition-colors">
                  {post.profiles.full_name || post.profiles.username}
                </p>
                <p className="text-sm text-neutral-500">
                  @{post.profiles.username} · {formatRelativeTime(post.created_at)}
                </p>
              </div>
            </Link>

            {isOwner && (
              <Dropdown>
                <DropdownTrigger className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <MoreHorizontal className="h-5 w-5 text-neutral-500" />
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem onClick={() => setShowDeleteModal(true)} danger>
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="whitespace-pre-wrap break-words">{post.content}</p>
        </div>

        {/* Image */}
        {post.image_url && (
          <div className="relative">
            <Image
              src={post.image_url}
              alt="Post image"
              width={600}
              height={400}
              className="w-full object-cover max-h-[500px]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={handleLike}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors',
              post.isLiked
                ? 'text-red-500'
                : 'text-neutral-500 hover:text-red-500'
            )}
          >
            <Heart
              className={cn('h-5 w-5 transition-all', post.isLiked && 'fill-current scale-110')}
            />
            <span>{post._count?.likes || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-500 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post._count?.comments || 0}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <CommentsSection postId={post.id} />
        )}
      </article>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Post"
      >
        <div className="p-4">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
