'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchProfiles } from '@/hooks/queries';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: profiles, isLoading } = useSearchProfiles(debouncedQuery);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
        <Input
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        {isLoading && debouncedQuery ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : profiles && profiles.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.username}`}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.username}
                  size="md"
                />
                <div>
                  <p className="font-medium">
                    {profile.full_name || profile.username}
                  </p>
                  <p className="text-sm text-neutral-500">@{profile.username}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : debouncedQuery ? (
          <div className="p-8 text-center text-neutral-500">
            No users found for "{debouncedQuery}"
          </div>
        ) : (
          <div className="p-8 text-center text-neutral-500">
            Search for users by name or username
          </div>
        )}
      </div>
    </div>
  );
}
