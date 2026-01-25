'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, Loader2, CornerDownRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useComments, useCreateComment } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import type { CommentWithAuthor } from '@/types/database';

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const { profile } = useAuth();
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments, isLoading } = useComments(postId);
  const createComment = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: comment.trim(),
    });
    setComment('');
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: replyContent.trim(),
      parentId,
    });
    setReplyContent('');
    setReplyingTo(null);
  };

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="p-4 flex items-center gap-3">
        <Avatar
          src={profile?.avatar_url}
          alt={profile?.full_name || profile?.username || 'User'}
          size="sm"
        />
        <div className="flex-1 relative">
          <Input
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="pr-10"
          />
          <button
            type="submit"
            disabled={!comment.trim() || createComment.isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary-500 disabled:text-neutral-300 disabled:cursor-not-allowed"
          >
            {createComment.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="px-4 pb-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((commentItem) => (
            <CommentItem
              key={commentItem.id}
              comment={commentItem}
              onReply={() => setReplyingTo(commentItem.id)}
              isReplying={replyingTo === commentItem.id}
              replyContent={replyContent}
              onReplyContentChange={setReplyContent}
              onSubmitReply={() => handleReply(commentItem.id)}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
              isSubmitting={createComment.isPending}
            />
          ))
        ) : (
          <p className="text-center text-neutral-500 py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  isSubmitting: boolean;
}

function CommentItem({
  comment,
  onReply,
  isReplying,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  isSubmitting,
}: CommentItemProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Link href={`/profile/${comment.profiles.username}`}>
          <Avatar
            src={comment.profiles.avatar_url}
            alt={comment.profiles.full_name || comment.profiles.username}
            size="sm"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
            <Link
              href={`/profile/${comment.profiles.username}`}
              className="font-medium text-sm hover:text-primary-500 transition-colors"
            >
              {comment.profiles.full_name || comment.profiles.username}
            </Link>
            <p className="text-sm mt-1 break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
            <span>{formatRelativeTime(comment.created_at)}</span>
            <button
              onClick={onReply}
              className="hover:text-primary-500 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {/* Reply Input */}
      {isReplying && (
        <div className="ml-11 flex items-center gap-2">
          <Input
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            className="text-sm"
            autoFocus
          />
          <button
            onClick={onSubmitReply}
            disabled={!replyContent.trim() || isSubmitting}
            className="p-2 text-primary-500 disabled:text-neutral-300"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={onCancelReply}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <CornerDownRight className="h-4 w-4 text-neutral-400 mt-2 flex-shrink-0" />
              <Link href={`/profile/${reply.profiles.username}`}>
                <Avatar
                  src={reply.profiles.avatar_url}
                  alt={reply.profiles.full_name || reply.profiles.username}
                  size="xs"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
                  <Link
                    href={`/profile/${reply.profiles.username}`}
                    className="font-medium text-sm hover:text-primary-500 transition-colors"
                  >
                    {reply.profiles.full_name || reply.profiles.username}
                  </Link>
                  <p className="text-sm mt-1 break-words">{reply.content}</p>
                </div>
                <span className="text-xs text-neutral-500 mt-1 block">
                  {formatRelativeTime(reply.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
