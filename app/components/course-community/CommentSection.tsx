import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageCircle, CheckCircle2, Star, Sparkles, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Comment {
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
  submission?: {
    id: string;
    status: string;
    finalScore: number | null;
    normalizedScore: number | null;
  } | null;
  gradingResult?: {
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
  } | null;
  replies?: Comment[];
  _count?: {
    likes: number;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId: string;
  currentUserRole: string;
  onCommentAdded?: () => void;
  onGradeComment?: (commentId: string) => Promise<void>;
}

export function CommentSection({
  postId,
  comments,
  currentUserId: _currentUserId,
  currentUserRole: _currentUserRole,
  onCommentAdded,
  onGradeComment,
}: CommentSectionProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingCommentId, setGradingCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = i18n.language.startsWith('zh') ? zhTW : enUS;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '留言失敗');
      }

      setNewComment('');
      toast.success('留言已發布！');
      onCommentAdded?.();
      // Refresh to show new comment
      navigate('.', { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '留言失敗，請稍後再試';
      setError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Comment input */}
      <div className="border-2 border-[#2B2B2B] dark:border-gray-200 rounded-lg overflow-hidden bg-[#FAF9F6] dark:bg-gray-900/20">
        <div className="bg-gradient-to-r from-[#E07A5F]/10 to-transparent p-3 border-b-2 border-[#2B2B2B] dark:border-gray-200">
          <h4 className="font-semibold text-sm text-[#2B2B2B] dark:text-gray-100 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            發表留言
          </h4>
        </div>
        <form onSubmit={handleSubmitComment} className="p-4 space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="寫下你的留言..."
            rows={3}
            className="border-2 border-[#2B2B2B] dark:border-gray-200 focus:border-[#E07A5F] dark:focus:border-[#E87D3E] transition-colors duration-150 bg-white dark:bg-gray-950 resize-none"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{newComment.length} / 500 字元</p>
            <Button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="cursor-pointer border-2 border-[#2B2B2B] bg-[#E07A5F] hover:bg-[#D2691E] text-white font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-200 dark:bg-[#E87D3E] dark:hover:bg-[#D2691E]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  發送中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  發送留言
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-medium text-[#2B2B2B] dark:text-gray-100 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#E07A5F]" />
            留言 ({comments.length})
          </h3>
        </div>

        {comments.length === 0 ? (
          <div className="border-2 border-dashed border-[#2B2B2B] dark:border-gray-200 rounded-lg p-12 text-center bg-[#FAF9F6]/50 dark:bg-gray-900/20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">還沒有留言</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">成為第一個留言的人吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="border-2 border-[#2B2B2B] dark:border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-950"
              >
                <div className="p-4">
                  {/* Comment header */}
                  <div className="mb-3 flex items-start gap-3">
                    <Avatar className="h-10 w-10 border-2 border-[#2B2B2B] dark:border-gray-200 flex-shrink-0">
                      <img
                        src={comment.author.picture}
                        alt={comment.author.name}
                        className="h-full w-full object-cover"
                      />
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-[#2B2B2B] dark:text-gray-100">{comment.author.name}</h4>
                        {comment.authorRole === 'TEACHER' && (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-[#2B2B2B] dark:border-gray-200"
                          >
                            教師
                          </Badge>
                        )}
                        {comment.submission && (
                          <Badge className="bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            作業提交
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale,
                        })}
                        {comment.isEdited && ' · 已編輯'}
                      </p>
                    </div>

                    {/* Grade Button (Teacher only) */}
                    {_currentUserRole === 'TEACHER' && onGradeComment && comment.authorRole !== 'TEACHER' && (
                      <button
                        onClick={async () => {
                          if (gradingCommentId) return;
                          setGradingCommentId(comment.id);
                          try {
                            await onGradeComment(comment.id);
                            toast.success('評分完成！');
                          } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : '評分失敗';
                            toast.error(`❌ ${errorMessage}`);
                            console.error(err);
                          } finally {
                            setGradingCommentId(null);
                          }
                        }}
                        disabled={!!gradingCommentId}
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
                    )}
                  </div>

                  {/* Comment content */}
                  <div className="ml-13">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>

                  {/* Grading Result Display */}
                  {comment.gradingResult && (
                    <div className="mt-2 ml-13 mr-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] p-3 dark:bg-[#14532D]/20 dark:border-[#14532D]">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-[#22C55E] p-1 text-white dark:bg-[#22C55E]/80">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                                                        <span className="text-lg font-bold text-[#15803D] dark:text-[#86EFAC]">
                              {comment.gradingResult.normalizedScore.toFixed(1)} 分
                            </span>
                          </div>
                          {comment.gradingResult.result.overallFeedback && (
                            <p className="text-sm text-[#166534] dark:text-[#BBF7D0] leading-relaxed">
                              {comment.gradingResult.result.overallFeedback}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submission info (if this is a submission comment) */}
                  {comment.submission && (
                    <div className="mt-4 ml-13 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              {comment.submission.status === 'GRADED' ? '已評分' : '等待評分'}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">作業提交記錄</p>
                          </div>
                        </div>
                        {comment.submission.normalizedScore !== null && (
                          <div className="flex items-center gap-2 bg-white dark:bg-gray-950 px-3 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-lg text-blue-700 dark:text-blue-300">
                              {comment.submission.normalizedScore.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-13 space-y-3 border-l-4 border-gray-200 dark:border-gray-700 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border-2 border-[#2B2B2B] dark:border-gray-200 flex-shrink-0">
                              <img
                                src={reply.author.picture}
                                alt={reply.author.name}
                                className="h-full w-full object-cover"
                              />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-semibold text-[#2B2B2B] dark:text-gray-100">
                                  {reply.author.name}
                                </span>
                                {reply.authorRole === 'TEACHER' && (
                                  <Badge variant="outline" className="text-xs">
                                    教師
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {reply.content}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(reply.createdAt), {
                                  addSuffix: true,
                                  locale,
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
