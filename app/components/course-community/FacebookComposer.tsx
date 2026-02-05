import { Avatar } from '@/components/ui/avatar';
import { UserCircle, Smile, BarChart3 } from 'lucide-react';

interface FacebookComposerProps {
  userAvatar: string;
  userName: string;
  onOpenDialog: () => void;
}

export function FacebookComposer({ userAvatar, userName, onOpenDialog }: FacebookComposerProps) {
  return (
    <div className="bg-white dark:bg-[#242526] rounded-lg p-4 border border-gray-200 dark:border-[#393A3B]">
      {/* Top Row: Avatar + Input */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
        </Avatar>

        <button
          onClick={onOpenDialog}
          className="flex-1 bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] rounded-full px-4 py-2.5 text-left text-gray-500 dark:text-[#B0B3B8] transition-colors duration-150 cursor-pointer"
        >
          留個言吧......
        </button>
      </div>

      {/* Bottom Row: Action Buttons */}
    </div>
  );
}
