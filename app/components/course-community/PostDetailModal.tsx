import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Send, Calendar, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

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
  rubric?: {
    id: string;
    name: string;
  } | null;
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
    overallFeedback?: string;
  };
  thoughtSummary?: string;
  createdAt: string;
  grader?: {
    name: string;
    picture: string;
  };
}

interface Post {
  id: string;
  type: 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'DISCUSSION' | 'MATERIAL';
  title: string;
  content: string;
  author: PostAuthor;
  authorRole: string;
  createdAt: string;
  assignmentArea?: AssignmentArea | null;
  rubric?: {
    id: string;
    name: string;
  } | null;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> | null;
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

interface PostDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  comments: Comment[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  isTeacher?: boolean;
  onCommentSubmit?: (content: string) => Promise<void>;
  onGradeComment?: (commentId: string) => Promise<void>;
}

export function PostDetailModal({
  open,
  onOpenChange,
  post,
  comments,
  currentUserId: _currentUserId,
  currentUserName,
  currentUserAvatar,
  isTeacher = false,
  onCommentSubmit,
  onGradeComment,
}: PostDetailModalProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? zhTW : enUS;
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingCommentId, setGradingCommentId] = useState<string | null>(null);
  const [expandedGradingResults, setExpandedGradingResults] = useState<Set<string>>(new Set());
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Toggle expanded grading result
  const toggleGradingResult = (commentId: string) => {
    setExpandedGradingResults((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = commentTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newComment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onCommentSubmit) return;

    setIsSubmitting(true);
    try {
      await onCommentSubmit(newComment);
      setNewComment('');
      // Reset textarea height after submit
      if (commentTextareaRef.current) {
        commentTextareaRef.current.style.height = 'auto';
      }
      toast.success('留言已發布！');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '留言發布失敗';
      toast.error(`❌ ${errorMessage}`);
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrade = async (commentId: string) => {
    if (!onGradeComment) return;
    
    setGradingCommentId(commentId);
    try {
      await onGradeComment(commentId);
      toast.success('評分完成！');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '評分失敗，請稍後再試';
      toast.error(`❌ ${errorMessage}`);
      console.error('Failed to grade comment:', error);
    } finally {
      setGradingCommentId(null);
    }
  };

  // Check if this is an assignment post (grading enabled)
  // Allow grading for any ASSIGNMENT type post, even without assignmentArea
  const isAssignmentPost = post.type === 'ASSIGNMENT';
  
  // Check if rubric is available for grading
  const hasRubric = !!(post.rubric || post.assignmentArea?.rubric);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#FFFEFB] dark:bg-[#242526] border border-[#E8E4DD] dark:border-[#393A3B] shadow-lg p-0">
        <DialogHeader className="border-b border-[#E8E4DD] dark:border-[#393A3B] pb-4 pt-6 px-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB]">
              {post.author.name} 的貼文
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 hover:bg-[#F0EDE8] dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-[#9C9488] dark:text-[#B0B3B8]" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4 px-6">
          {/* Post Content */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <img src={post.author.picture} alt={post.author.name} className="h-full w-full object-cover" />
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#4A4036] dark:text-[#E4E6EB]">{post.author.name}</span>
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
            </div>

            {post.title && <h3 className="text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB]">{post.title}</h3>}

            <p className="whitespace-pre-wrap text-[#4A4036] dark:text-[#E4E6EB] leading-relaxed">{post.content}</p>

            {/* Assignment Area */}
            {post.type === 'ASSIGNMENT' && post.assignmentArea && (
              <div className="rounded-lg border border-[#E8E4DD] dark:border-[#393A3B] bg-[#FAF8F5] dark:bg-[#18191A] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#5B8A8A] flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#4A4036] dark:text-[#E4E6EB] mb-1">{post.assignmentArea.name}</p>
                    {post.assignmentArea.description && (
                      <p className="text-sm text-[#9C9488] dark:text-[#B0B3B8] mb-2 whitespace-pre-wrap">
                        {post.assignmentArea.description}
                      </p>
                    )}
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

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="space-y-2">
                {post.attachments.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center gap-3 border border-[#E8E4DD] dark:border-[#393A3B] rounded-lg px-4 py-3 text-sm hover:bg-[#FAF8F5] dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded bg-[#F0EDE8] dark:bg-[#3A3B3C] flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-[#9C9488] dark:text-[#E4E6EB]" />
                    </div>
                    <span className="flex-1 truncate font-medium text-[#4A4036] dark:text-[#E4E6EB]">
                      {file.fileName}
                    </span>
                    <span className="text-xs text-[#9C9488] flex-shrink-0">
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t border-[#E8E4DD] dark:border-[#393A3B] pt-4 space-y-3">
            <h4 className="font-semibold text-[#4A4036] dark:text-[#E4E6EB]">
              {isAssignmentPost ? '學生反思 ' : '留言 '}
              ({comments.length})
            </h4>

            {comments.length === 0 ? (
              <p className="text-center text-[#9C9488] dark:text-[#B0B3B8] py-8">
                {isAssignmentPost ? '目前還沒有學生提交反思' : '目前還沒有留言'}
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <img
                        src={comment.author.picture}
                        alt={comment.author.name}
                        className="h-full w-full object-cover"
                      />
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-[#FAF8F5] dark:bg-[#3A3B3C] rounded-2xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">
                            {comment.author.name}
                          </span>
                          {comment.authorRole === 'TEACHER' && (
                            <Badge className="bg-[#E8F4F4] dark:bg-[#5B8A8A]/20 text-[#5B8A8A] dark:text-[#7BA3A3] text-xs font-medium border-0 rounded-full px-2 py-0">
                              教師
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#4A4036] dark:text-[#E4E6EB] break-words">{comment.content}</p>
                      </div>
                      
                      {/* Grading Result Display */}
                      {comment.gradingResult && (
                        <div className="mt-2 ml-1 mr-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] dark:bg-[#14532D]/20 dark:border-[#14532D]">
                          <div className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-full bg-[#22C55E] p-1 text-white dark:bg-[#22C55E]/80">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-[#15803D] dark:text-[#86EFAC]">
                                    {comment.gradingResult.normalizedScore.toFixed(1)} 分
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleGradingResult(comment.id)}
                                    className="h-6 px-2 text-[#15803D] hover:bg-[#BBF7D0]/30 dark:text-[#86EFAC] dark:hover:bg-[#14532D]/30"
                                  >
                                    {expandedGradingResults.has(comment.id) ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        <span className="text-xs">收起</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        <span className="text-xs">詳細評分</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                                {comment.gradingResult.result.overallFeedback && (
                                  <p className="text-sm text-[#166534] dark:text-[#BBF7D0] leading-relaxed">
                                    {comment.gradingResult.result.overallFeedback}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedGradingResults.has(comment.id) && (
                            <div className="border-t border-[#BBF7D0] dark:border-[#14532D] px-3 pb-3 pt-2 space-y-3">
                              {/* Breakdown */}
                              {comment.gradingResult.result.breakdown && comment.gradingResult.result.breakdown.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-[#15803D] dark:text-[#86EFAC] uppercase tracking-wide">
                                    評分細節
                                  </h5>
                                  {comment.gradingResult.result.breakdown.map((item, idx) => (
                                    <div key={idx} className="bg-white/60 dark:bg-[#14532D]/40 rounded-md p-2.5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#15803D] dark:text-[#86EFAC]">
                                          {item.name}
                                        </span>
                                        <span className="text-sm font-bold text-[#15803D] dark:text-[#86EFAC]">
                                          {item.score} 分
                                        </span>
                                      </div>
                                      <div className="text-xs text-[#166534] dark:text-[#BBF7D0] leading-relaxed whitespace-pre-wrap">
                                        {item.feedback}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Thought Summary */}
                              {comment.gradingResult.thoughtSummary && (
                                <div className="space-y-1.5">
                                  <h5 className="text-xs font-semibold text-[#15803D] dark:text-[#86EFAC] uppercase tracking-wide">
                                    評分思考過程
                                  </h5>
                                  <div className="bg-white/60 dark:bg-[#14532D]/40 rounded-md p-2.5 text-xs text-[#166534] dark:text-[#BBF7D0] leading-relaxed prose prose-sm max-w-none prose-headings:text-[#15803D] dark:prose-headings:text-[#86EFAC] prose-headings:font-semibold prose-headings:text-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                    <ReactMarkdown>{comment.gradingResult.thoughtSummary}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 px-3 mt-1">
                        <span className="text-xs text-[#9C9488]">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale })}
                          {comment.isEdited && ' · 已編輯'}
                        </span>
                        
                        {/* Grade Button (Teacher only, for assignment posts, if student comment) */}
                        {isTeacher && isAssignmentPost && comment.authorRole !== 'TEACHER' && (
                          <>
                            {hasRubric ? (
                              <button
                                onClick={() => handleGrade(comment.id)}
                                disabled={gradingCommentId === comment.id}
                                className={`flex-shrink-0 flex items-center gap-1 p-1.5 rounded-full transition-colors ${
                                  comment.gradingResult
                                    ? 'text-[#5B8A8A] hover:bg-[#E8F4F4]'
                                    : 'text-[#9C9488] hover:text-[#E07A5F] hover:bg-[#FAF9F6]'
                                } disabled:opacity-50 cursor-pointer`}
                                title={comment.gradingResult ? '重新評分' : 'AI 評分'}
                              >
                                {gradingCommentId === comment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div 
                                className="flex items-center gap-1 text-xs text-[#D4847C] bg-[#FDF4F3] px-2 py-1 rounded-full"
                                title="此作業未設定評分標準"
                              >
                                <AlertCircle className="h-3 w-3" />
                                <span>未設定 Rubric</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className="border-t border-[#E8E4DD] dark:border-[#393A3B] pt-4 px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
            </Avatar>
            <div className="flex-1 flex items-end gap-2 bg-[#F0EDE8] dark:bg-[#3A3B3C] rounded-2xl px-4 py-2">
              <Textarea
                ref={commentTextareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={isAssignmentPost ? "撰寫你的反思..." : "留個言吧..."}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-sm text-[#4A4036] dark:text-[#E4E6EB] placeholder:text-[#9C9488] dark:placeholder:text-[#B0B3B8] p-0 min-h-[20px] max-h-[200px] overflow-y-auto"
                disabled={isSubmitting}
                style={{ height: 'auto' }}
              />
              <Button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
                className="cursor-pointer bg-transparent hover:bg-transparent text-[#5B8A8A] dark:text-[#7BA3A3] hover:text-[#4A7676] dark:hover:text-[#5B8A8A] p-0 h-auto disabled:opacity-30"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
