import { Users, Lock, Share2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

interface CommunityCoverProps {
  courseName: string;
  memberCount: number;
  memberAvatars?: string[];
  isPrivate?: boolean;
  isTeacher?: boolean;
  courseId: string;
}

export function CommunityCover({
  courseName,
  memberCount,
  memberAvatars = [],
  isPrivate = true,
  isTeacher = false,
  courseId,
}: CommunityCoverProps) {
  return (
    <div className="relative">
      {/* Cover Image - Minimalist soft gradient */}
      <div className="h-48 w-full bg-gradient-to-br from-[#5B8A8A] via-[#7BA3A3] to-[#D4847C] relative overflow-hidden">
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

      {/* Course Info Overlay - Clean minimal */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#4A4036]/70 via-[#4A4036]/40 to-transparent p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <h1 className="font-sans text-3xl font-semibold text-white mb-2 drop-shadow-sm">{courseName}</h1>

              <div className="flex items-center gap-3 text-white/90">
                {/* Privacy Badge */}
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">{isPrivate ? '私密課程' : '公開課程'}</span>
                </div>

                {/* Member Count */}
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{memberCount} 位成員</span>
                </div>
              </div>

              {/* Member Avatars */}
              {memberAvatars.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {memberAvatars.slice(0, 5).map((avatar, idx) => (
                      <img
                        key={idx}
                        src={avatar}
                        alt={`Member ${idx + 1}`}
                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                    {memberAvatars.length > 5 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-[#5B8A8A] flex items-center justify-center text-xs font-medium text-white">
                        +{memberAvatars.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isTeacher && (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  className="cursor-pointer bg-white text-[#4A4036] hover:bg-[#FAF8F5] border border-white font-medium transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <Link to={`/teacher/courses/${courseId}/invite`}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    邀請
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer bg-white/10 backdrop-blur-sm text-white border border-white/50 hover:bg-white/20 font-medium transition-all duration-200"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  分享
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

