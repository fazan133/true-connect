'use client';

import { useState, useRef } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useCreatePost, useUploadImage } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

export function CreatePost() {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = useCreatePost();
  const uploadImage = useUploadImage();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;

    let imageUrl: string | undefined;

    if (imageFile) {
      imageUrl = await uploadImage.mutateAsync(imageFile);
    }

    await createPost.mutateAsync({ content: content.trim(), imageUrl });

    setContent('');
    removeImage();
  };

  const isLoading = createPost.isPending || uploadImage.isPending;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex gap-3">
        <Avatar
          src={profile?.avatar_url}
          alt={profile?.full_name || profile?.username || 'User'}
          size="md"
        />
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-0 p-0 focus:ring-0 resize-none"
            maxLength={500}
          />

          {imagePreview && (
            <div className="relative mt-3 inline-block">
              <Image
                src={imagePreview}
                alt="Preview"
                width={200}
                height={200}
                className="rounded-lg object-cover max-h-48"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-neutral-900 text-white rounded-full hover:bg-neutral-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                disabled={isLoading}
              >
                <ImageIcon className="h-5 w-5 text-primary-500" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">
                {content.length}/500
              </span>
              <Button
                onClick={handleSubmit}
                disabled={(!content.trim() && !imageFile) || isLoading}
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
