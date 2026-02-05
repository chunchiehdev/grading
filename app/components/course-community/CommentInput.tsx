import { useState } from 'react';
import { Image, Smile, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

interface CommentInputProps {
  userAvatar: string;
  userName: string;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CommentInput({
  userAvatar,
  userName,
  placeholder = '留個言吧......',
  onSubmit,
  isSubmitting = false,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    await onSubmit(content);
    setContent('');
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-2 border-[#2B2B2B] dark:border-gray-200 rounded-lg bg-white dark:bg-gray-950 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <Avatar className="h-10 w-10 border-2 border-[#2B2B2B] dark:border-gray-200 flex-shrink-0">
          <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
        </Avatar>

        {/* Input Area */}
        <div className="flex-1">
          <div
            className={`relative rounded-full border-2 transition-all duration-200 ${
              isFocused ? 'border-[#E07A5F] dark:border-[#E87D3E] shadow-md' : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-full text-sm outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:opacity-50"
            />

            {/* Send Button (appears when typing) */}
            {content.trim() && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E07A5F] hover:bg-[#D2691E] dark:bg-[#E87D3E] dark:hover:bg-[#D2691E] flex items-center justify-center transition-colors duration-150 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            )}
          </div>

          {/* Quick Actions (shown when focused or has content) */}
          {(isFocused || content.length > 0) && (
            <div className="flex items-center gap-2 mt-2 px-4">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer text-gray-600 dark:text-gray-400 text-sm"
              >
                <Image className="h-4 w-4" />
                <span>圖片</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer text-gray-600 dark:text-gray-400 text-sm"
              >
                <Smile className="h-4 w-4" />
                <span>表情</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
