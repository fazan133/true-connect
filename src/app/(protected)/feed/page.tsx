import { CreatePost } from '@/components/posts/create-post';
import { PostFeed } from '@/components/posts/post-feed';

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <CreatePost />
      <PostFeed />
    </div>
  );
}
