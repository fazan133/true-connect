'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import { useUpdateProfile, useUploadImage } from '@/hooks/queries';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Profile } from '@/types/database';

interface EditProfileFormProps {
  profile: Profile & { isOwnProfile?: boolean };
  onClose: () => void;
}

export function EditProfileForm({ profile, onClose }: EditProfileFormProps) {
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadImage();

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let avatarUrl = profile.avatar_url;

    if (avatarFile) {
      avatarUrl = await uploadImage.mutateAsync(avatarFile);
    }

    await updateProfile.mutateAsync({
      full_name: fullName || null,
      bio: bio || null,
      avatar_url: avatarUrl,
    });

    await refreshProfile();
    onClose();
  };

  const isLoading = updateProfile.isPending || uploadImage.isPending;

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <Avatar
            src={avatarPreview}
            alt={profile.username}
            size="xl"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          maxLength={50}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium mb-1">Bio</label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          maxLength={160}
          rows={3}
        />
        <p className="text-xs text-neutral-500 mt-1">{bio.length}/160</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
