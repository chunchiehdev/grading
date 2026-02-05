import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  authorRole: string;
  createdAt: string;
}

interface CommentPreviewProps {
  comments: Comment[];
  maxPreview?: number;
  onViewAll?: () => void;
}

export function CommentPreview({ comments, maxPreview = 3, onViewAll }: CommentPreviewProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? zhTW : enUS;

  const previewComments = comments.slice(0, maxPreview);
  const remainingCount = Math.max(0, comments.length - maxPreview);

  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {previewComments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <img src={comment.author.picture} alt={comment.author.name} className="h-full w-full object-cover" />
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 dark:bg-[#3A3B3C] rounded-2xl px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-[#050505] dark:text-[#E4E6EB]">{comment.author.name}</span>
                {comment.authorRole === 'TEACHER' && (
                  <Badge className="bg-gray-200 dark:bg-[#4E4F50] text-gray-700 dark:text-[#B0B3B8] text-xs font-medium border-0 rounded-full px-2 py-0">
                    教師
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#050505] dark:text-[#E4E6EB] break-words">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 px-3 mt-1">
              <span className="text-xs text-gray-500 dark:text-[#B0B3B8]">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale })}
              </span>
            </div>
          </div>
        </div>
      ))}

      {remainingCount > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          className="text-sm font-medium text-gray-600 dark:text-[#B0B3B8] hover:underline cursor-pointer"
        >
          查看全部 {comments.length} 則留言
        </button>
      )}
    </div>
  );
}
