import { useState, useRef } from 'react';
import { Users, Lock, Share2, UserPlus, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { ImageCropModal } from './ImageCropModal';

interface CommunityCoverProps {
  courseName: string;
  memberCount: number;
  memberAvatars?: string[];
  isPrivate?: boolean;
  isTeacher?: boolean;
  courseId: string;
  coverImage?: string | null;
  onCoverImageChange?: (file: File | Blob) => Promise<void>;
}

export function CommunityCover({
  courseName,
  memberCount,
  memberAvatars = [],
  isPrivate = true,
  isTeacher = false,
  courseId,
  coverImage,
  onCoverImageChange,
}: CommunityCoverProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file as data URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!onCoverImageChange) return;

    setIsUploading(true);
    try {
      await onCoverImageChange(croppedBlob);
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
    }
  };

  return (
    <div className="relative">
      {/* Cover Image - Custom image or default gradient */}
      <div className="h-48 sm:h-64 w-full relative overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${courseName} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#5B8A8A] via-[#7BA3A3] to-[#D4847C]">
            {/* Subtle decorative pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1.5" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>

            {/* Soft blur shapes */}
            <div className="absolute top-6 right-16 w-24 h-24 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute bottom-6 left-16 w-32 h-32 rounded-full bg-white/5 blur-3xl"></div>
          </div>
        )}

        {/* Edit cover button for teachers */}
        {isTeacher && onCoverImageChange && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/80 hover:text-white transition-colors disabled:opacity-50"
              aria-label="編輯封面"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin drop-shadow-md" />
              ) : (
                <Pencil className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Course Info Overlay - Clean minimal */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#4A4036]/70 via-[#4A4036]/40 to-transparent p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Title and badges */}
          <div className="mb-2 sm:mb-3">
            <h1 className="font-sans text-xl sm:text-3xl font-semibold text-white mb-1.5 sm:mb-2 drop-shadow-sm truncate">
              {courseName}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/90">
              {/* Privacy Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">{isPrivate ? '私密' : '公開'}</span>
              </div>

              {/* Member Count */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">{memberCount} 位成員</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Avatars left, Buttons right */}
          <div className="flex items-center justify-between">
            {/* Member Avatars - Left side */}
            {memberAvatars.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {memberAvatars.slice(0, 5).map((avatar, idx) => (
                    <img
                      key={idx}
                      src={avatar}
                      alt={`Member ${idx + 1}`}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                  {memberAvatars.length > 5 && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-[#5B8A8A] flex items-center justify-center text-[10px] sm:text-xs font-medium text-white">
                      +{memberAvatars.length - 5}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Action Buttons - Right side */}
            {isTeacher && (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="cursor-pointer bg-white text-[#4A4036] hover:bg-[#FAF8F5] border border-white font-medium transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 text-xs sm:text-sm rounded-full px-3 sm:px-4"
                >
                  <Link to={`/teacher/courses/${courseId}/invite`}>
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                    邀請
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer bg-white/10 backdrop-blur-sm text-white border border-white/50 hover:bg-white/20 font-medium transition-all duration-200 text-xs sm:text-sm rounded-full px-3 sm:px-4"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  分享
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          open={cropModalOpen}
          onOpenChange={(open) => {
            setCropModalOpen(open);
            if (!open) setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          aspectRatio={16 / 6}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

