import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { CoursePostCard } from './CoursePostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { FacebookComposer } from './FacebookComposer';

interface Post {
  id: string;
  type: 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'DISCUSSION' | 'MATERIAL';
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    picture: string;
    role: string;
  };
  authorRole: string;
  isPinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  assignmentArea?: {
    id: string;
    name: string;
    description: string | null;
    dueDate: string | null;
  } | null;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> | null;
  likes?: Array<{
    user: {
      id: string;
      name: string;
      picture: string;
    };
  }>;
  previewComments?: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      email: string;
      picture: string;
      role: string;
    };
    authorRole: string;
    createdAt: string;
    isEdited: boolean;
  }>;
  allComments?: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      email: string;
      picture: string;
      role: string;
    };
    authorRole: string;
    createdAt: string;
    isEdited: boolean;
  }>;
}

interface CourseCommunityFeedProps {
  posts: Post[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  isTeacher: boolean;
  courseId: string;
  rubrics?: Array<{ id: string; name: string }>; // Changed from assignments
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onCommentSubmit?: (postId: string, content: string) => Promise<void>;
  onGradeComment?: (commentId: string) => Promise<void>;
}

export function CourseCommunityFeed({
  posts,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isTeacher,
  courseId,
  rubrics = [],
  onLike,
  onComment,
  onCommentSubmit,
  onGradeComment,
}: CourseCommunityFeedProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Facebook-style Composer (only for teachers) */}
      {isTeacher && (
        <FacebookComposer
          userAvatar={currentUserAvatar}
          userName={currentUserName}
          onOpenDialog={() => setCreateDialogOpen(true)}
        />
      )}

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="border border-dashed border-gray-300 dark:border-[#3A3B3C] rounded-lg p-12 text-center bg-white dark:bg-[#242526]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-gray-400 dark:text-[#B0B3B8]" />
          </div>
          <p className="text-gray-600 dark:text-[#B0B3B8] mb-1 font-medium">目前還沒有貼文</p>
          <p className="text-sm text-gray-500 dark:text-[#B0B3B8]">
            {isTeacher ? '點擊上方開始發布第一則貼文吧！' : '等待老師發布貼文'}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <CoursePostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            allComments={post.allComments}
            isTeacher={isTeacher}
            onLike={onLike}
            onComment={onComment}
            onCommentSubmit={onCommentSubmit}
            onGradeComment={onGradeComment}
          />
        ))
      )}

      {/* Create Post Dialog */}
      {isTeacher && (
        <CreatePostDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          courseId={courseId}
          userName={currentUserName}
          userAvatar={currentUserAvatar}
          rubrics={rubrics}
        />
      )}
    </div>
  );
}
