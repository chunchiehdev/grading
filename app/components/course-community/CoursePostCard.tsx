import { useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle, Send, Pin, Calendar, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { CommentPreview } from './CommentPreview';
import { PostDetailModal } from './PostDetailModal';

interface PostAuthor {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: string;
}

interface AssignmentArea {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
}

interface GradingResult {
  id: string;
  normalizedScore: number;
  result: {
    breakdown?: Array<{
      name: string;
      score: number;
      feedback: string;
      criteriaId: string;
    }>;
    overallFeedback: string;
  };
  thoughtSummary?: string;
  createdAt: string;
  grader?: {
    name: string;
    picture: string;
  };
}

interface Comment {
  id: string;
  content: string;
  author: PostAuthor;
  authorRole: string;
  createdAt: string;
  isEdited: boolean;
  gradingResult?: GradingResult | null;
}

interface Post {
  id: string;
  type: 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'DISCUSSION' | 'MATERIAL';
  title: string;
  content: string;
  author: PostAuthor;
  authorRole: string;
  isPinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  assignmentArea?: AssignmentArea | null;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> | null;
  previewComments?: Comment[];
}

interface CoursePostCardProps {
  post: Post;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  allComments?: Comment[];
  isTeacher?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onCommentSubmit?: (postId: string, content: string) => Promise<any>;
  onGradeComment?: (commentId: string) => Promise<any>;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function CoursePostCard({
  post,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  allComments: propAllComments = [],
  isTeacher = false,
  onLike,
  onComment: _onComment,
  onCommentSubmit,
  onGradeComment,
  onEdit,
  onDelete,
}: CoursePostCardProps) {
  const { i18n } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [allComments, setAllComments] = useState<Comment[]>(propAllComments);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasLoadedComments, setHasLoadedComments] = useState(propAllComments.length > 0);
  const isAuthor = post.author.id === currentUserId;

  // Fetch all comments when modal opens (if not already provided or loaded)
  useEffect(() => {
    if (showModal && !hasLoadedComments && !isLoadingComments) {
      setIsLoadingComments(true);
      fetch(`/api/posts/${post.id}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data && data.data.comments) {
            // Transform comments to match the expected format
            const transformedComments = data.data.comments.map((c: any) => ({
              ...c,
              createdAt: new Date(c.createdAt).toISOString(),
              gradingResult: c.gradingResult ? {
                id: c.gradingResult.id,
                normalizedScore: c.gradingResult.normalizedScore,
                result: c.gradingResult.result,
                thoughtSummary: c.gradingResult.thoughtSummary,
                createdAt: c.createdAt
              } : null,
            }));
            setAllComments(transformedComments);
          }
          setHasLoadedComments(true);
        })
        .catch((error) => {
          console.error('Failed to load comments:', error);
          setHasLoadedComments(true); // Prevent retry loop on error
        })
        .finally(() => {
          setIsLoadingComments(false);
        });
    }
  }, [showModal, post.id, hasLoadedComments, isLoadingComments]);
  const locale = i18n.language.startsWith('zh') ? zhTW : enUS;

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  };

  const handleCommentSubmit = async (content: string) => {
    if (!onCommentSubmit) return;
    
    const newComment = await onCommentSubmit(post.id, content);
    
    // Add new comment to the list
    if (newComment) {
      setAllComments(prevComments => [
        ...prevComments,
        {
          ...newComment,
          createdAt: new Date(newComment.createdAt).toISOString(),
          gradingResult: null,
        },
      ]);
    }
  };

  // Handle grading and update comment state
  const handleGradeCommentWithUpdate = async (commentId: string) => {
    if (!onGradeComment) return;
    
    const gradingResult = await onGradeComment(commentId);
    
    // Update the comment with grading result
    if (gradingResult) {
      setAllComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                gradingResult: {
                  id: gradingResult.gradingResultId,
                  normalizedScore: gradingResult.result.normalizedScore,
                  result: gradingResult.result,
                  thoughtSummary: gradingResult.thoughtSummary,
                  createdAt: gradingResult.createdAt instanceof Date ? gradingResult.createdAt.toISOString() : gradingResult.createdAt,
                },
              }
            : comment
        )
      );
    }
  };

  return (
    <Card className="bg-[#FFFEFB] dark:bg-[#242526] border border-[#E8E4DD] dark:border-[#393A3B] rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-5">
        {/* Pinned indicator */}
        {post.isPinned && (
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#5B8A8A] dark:text-[#7BA3A3]">
            <Pin className="h-4 w-4" fill="currentColor" />
            <span>置頂貼文</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-3 flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <img src={post.author.picture} alt={post.author.name} className="h-full w-full object-cover" />
          </Avatar>

          {/* Author info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-[#4A4036] dark:text-[#E4E6EB]">{post.author.name}</h4>
              {post.authorRole === 'TEACHER' && (
                <Badge className="bg-[#E8F4F4] dark:bg-[#5B8A8A]/20 text-[#5B8A8A] dark:text-[#7BA3A3] text-xs font-medium border-0 rounded-full px-2 py-0.5">
                  教師
                </Badge>
              )}
            </div>
            <div className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-0.5">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale })}
            </div>
          </div>

          {/* Action buttons for author */}
          {isAuthor && (
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[#F0EDE8] dark:hover:bg-[#3A3B3C]"
                  onClick={() => onEdit(post.id)}
                >
                  <Edit className="h-4 w-4 text-[#9C9488] dark:text-[#B0B3B8]" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[#D4847C] dark:text-red-400 hover:bg-[#FDF4F3] dark:hover:bg-red-950/30"
                  onClick={() => onDelete(post.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="mb-2 text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB] leading-snug">{post.title}</h3>
        )}

        {/* Assignment info */}
        {post.type === 'ASSIGNMENT' && post.assignmentArea && (
          <div className="mb-3 rounded-lg border border-[#E8E4DD] dark:border-[#393A3B] bg-[#FAF8F5] dark:bg-[#18191A] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5B8A8A] flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#4A4036] dark:text-[#E4E6EB] mb-1">{post.assignmentArea.name}</p>
                {post.assignmentArea.dueDate && (
                  <div className="flex items-center gap-1.5 text-sm text-[#9C9488] dark:text-[#B0B3B8]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      截止：
                      {new Date(post.assignmentArea.dueDate).toLocaleDateString(i18n.language, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-3">
          <p className="whitespace-pre-wrap text-[#4A4036] dark:text-[#E4E6EB] leading-relaxed">{post.content}</p>
        </div>

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {post.attachments.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center gap-3 border border-[#E8E4DD] dark:border-[#393A3B] rounded-lg px-4 py-3 text-sm hover:bg-[#FAF8F5] dark:hover:bg-[#3A3B3C] transition-colors duration-200 cursor-pointer"
              >
                <div className="w-8 h-8 rounded bg-[#F0EDE8] dark:bg-[#3A3B3C] flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-[#9C9488] dark:text-[#E4E6EB]" />
                </div>
                <span className="flex-1 truncate font-medium text-[#4A4036] dark:text-[#E4E6EB]">{file.fileName}</span>
                <span className="text-xs text-[#9C9488] dark:text-[#B0B3B8] flex-shrink-0">
                  {(file.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="border-t border-[#E8E4DD] dark:border-[#393A3B] flex items-center">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-3 hover:bg-[#F0EDE8] dark:hover:bg-[#3A3B3C] transition-colors duration-200 cursor-pointer ${
            isLiked ? 'text-[#5B8A8A] dark:text-[#7BA3A3]' : 'text-[#9C9488] dark:text-[#B0B3B8]'
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">讚 {post.likeCount > 0 ? `(${post.likeCount})` : ''}</span>
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[#9C9488] hover:bg-[#F0EDE8] dark:text-[#B0B3B8] dark:hover:bg-[#3A3B3C] transition-colors duration-200 cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">留言 {post.commentCount > 0 ? `(${post.commentCount})` : ''}</span>
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-[#9C9488] hover:bg-[#F0EDE8] dark:text-[#B0B3B8] dark:hover:bg-[#3A3B3C] transition-colors duration-200 cursor-pointer">
          <Send className="h-4 w-4" />
          <span className="text-sm font-medium">傳送</span>
        </button>
      </div>

      {/* Comment Preview */}
      {post.previewComments && post.previewComments.length > 0 && (
        <div className="p-4 border-t border-[#E8E4DD] dark:border-[#393A3B]">
          <CommentPreview comments={post.previewComments} maxPreview={3} onViewAll={() => setShowModal(true)} />
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        open={showModal}
        onOpenChange={setShowModal}
        post={post}
        comments={allComments}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        isTeacher={isTeacher}
        onCommentSubmit={handleCommentSubmit}
        onGradeComment={handleGradeCommentWithUpdate}
      />
    </Card>
  );
}

