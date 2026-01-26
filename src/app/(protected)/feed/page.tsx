import { CreatePost } from '@/components/posts/create-post';
import { PostFeed } from '@/components/posts/post-feed';
import { SuggestedUsers } from '@/components/profile/suggested-users';

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <CreatePost />
      <SuggestedUsers limit={3} title="People you may know" />
      <PostFeed />
    </div>
  );
}
