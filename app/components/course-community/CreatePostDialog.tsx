import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, FileUp, File, Trash2, MessageCircle, Megaphone, ClipboardList, ClipboardCheck, Image, Smile } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  userName: string;
  userAvatar?: string | null;
  rubrics?: Array<{ id: string; name: string }>;
}

interface Attachment {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Helper component for post type icon
function PostTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'DISCUSSION':
      return <MessageCircle className={className} />;
    case 'ANNOUNCEMENT':
      return <Megaphone className={className} />;
    case 'ASSIGNMENT':
      return <ClipboardList className={className} />;
    default:
      return <MessageCircle className={className} />;
  }
}

export function CreatePostDialog({ open, onOpenChange, courseId, userName, userAvatar, rubrics = [] }: CreatePostDialogProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    type: 'DISCUSSION' as 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'DISCUSSION',
    title: '',
    content: '',
    rubricId: '',
  });

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [formData.content]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileUpload = async (files: FileList | null, isImage: boolean = false) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const allowedDocTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedTypes = isImage ? allowedImageTypes : allowedDocTypes;
    
    const docExtPattern = /\.(pdf|docx|txt)$/i;
    const imageExtPattern = /\.(jpg|jpeg|png|gif|webp)$/i;
    const extPattern = isImage ? imageExtPattern : docExtPattern;
    
    if (!allowedTypes.includes(file.type) && !file.name.match(extPattern)) {
      toast.error(isImage ? '只支援 JPG、PNG、GIF、WebP 格式' : '只支援 PDF、DOCX、TXT 格式');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error('檔案大小不能超過 100MB');
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上傳失敗');
      }

      setAttachments(prev => [...prev, {
        fileId: result.data.fileId,
        fileName: result.data.fileName,
        fileSize: result.data.fileSize,
        mimeType: file.type,
      }]);
      toast.success(`已上傳: ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachments(prev => prev.filter(a => a.fileId !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      setError('內容不能為空');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        type: formData.type,
        title: formData.type === 'ASSIGNMENT' && formData.title.trim() 
          ? formData.title 
          : formData.content.substring(0, 100),
        content: formData.content,
      };

      if (formData.type === 'ASSIGNMENT' && formData.rubricId) {
        payload.rubricId = formData.rubricId;
      }

      if (attachments.length > 0) {
        payload.attachments = attachments;
      }

      const response = await fetch(`/api/courses/${courseId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '發布失敗');
      }

      onOpenChange(false);
      setFormData({
        type: 'DISCUSSION',
        title: '',
        content: '',
        rubricId: '',
      });
      setAttachments([]);
      navigate('.', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '發布失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPostTypeName = (type: string) => {
    switch (type) {
      case 'DISCUSSION': return '討論';
      case 'ANNOUNCEMENT': return '公告';
      case 'ASSIGNMENT': return '作業';
      default: return '討論';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-[540px] p-0 bg-[#FFFEFB] dark:bg-[#242526] border border-[#E8E4DD] dark:border-[#393A3B] rounded-xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="relative flex items-center justify-center border-b border-[#E8E4DD] dark:border-[#393A3B] py-4 px-4">
          <h2 className="text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB]">建立貼文</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 w-9 h-9 flex items-center justify-center rounded-full bg-[#F0EDE8] dark:bg-[#3A3B3C] hover:bg-[#E8E4DD] dark:hover:bg-[#4E4F50] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#9C9488] dark:text-[#B0B3B8]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* User Info & Post Type */}
          <div className="px-4 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#F0EDE8] overflow-hidden flex-shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#4A4036] font-medium">
                    {userName[0]}
                  </div>
                )}
              </div>

              {/* Name */}
              <span className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">{userName}</span>
            </div>

            {/* Post Type Selector */}
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as any, rubricId: '' })}
            >
              <SelectTrigger className="w-full bg-[#FAF8F5] dark:bg-[#3A3B3C] border-[#E8E4DD] dark:border-[#393A3B] text-[#4A4036] dark:text-[#E4E6EB] hover:bg-[#F0EDE8] dark:hover:bg-[#4E4F50] h-10">
                <div className="flex items-center gap-2">
                  <PostTypeIcon type={formData.type} className="w-4 h-4" />
                  <span>{getPostTypeName(formData.type)}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#FFFEFB] dark:bg-[#242526] border-[#E8E4DD] dark:border-[#393A3B]">
                <SelectItem value="DISCUSSION" className="text-[#4A4036] dark:text-[#E4E6EB] focus:bg-[#F0EDE8] dark:focus:bg-[#3A3B3C]">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>討論</span>
                  </div>
                </SelectItem>
                <SelectItem value="ANNOUNCEMENT" className="text-[#4A4036] dark:text-[#E4E6EB] focus:bg-[#F0EDE8] dark:focus:bg-[#3A3B3C]">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    <span>公告</span>
                  </div>
                </SelectItem>
                <SelectItem value="ASSIGNMENT" className="text-[#4A4036] dark:text-[#E4E6EB] focus:bg-[#F0EDE8] dark:focus:bg-[#3A3B3C]">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    <span>作業</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Assignment-specific fields */}
            {formData.type === 'ASSIGNMENT' && (
              <div className="space-y-3">
                {/* Title input */}
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="作業標題（例如：第一週反思作業）"
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#3A3B3C] border border-[#E8E4DD] dark:border-[#393A3B] rounded-lg text-[#4A4036] dark:text-[#E4E6EB] placeholder:text-[#9C9488] dark:placeholder:text-[#B0B3B8] text-sm focus:outline-none focus:ring-1 focus:ring-[#5B8A8A]"
                />

                {/* Rubric selector */}
                {rubrics.length > 0 ? (
                  <Select
                    value={formData.rubricId}
                    onValueChange={(value) => setFormData({ ...formData, rubricId: value })}
                  >
                    <SelectTrigger className="w-full bg-[#FAF8F5] dark:bg-[#3A3B3C] border-[#E8E4DD] dark:border-[#393A3B] text-[#4A4036] dark:text-[#E4E6EB] hover:bg-[#F0EDE8] dark:hover:bg-[#4E4F50] h-10">
                      <div className="flex items-center gap-2 w-0 flex-1 [&_span]:truncate [&_span]:block">
                        <ClipboardCheck className="w-4 h-4 text-[#5B8A8A] dark:text-[#E4E6EB] flex-shrink-0" />
                        <SelectValue placeholder="選擇評分標準（必選）" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#FFFEFB] dark:bg-[#242526] border-[#E8E4DD] dark:border-[#393A3B] max-w-[500px]">
                      {rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id} className="text-[#4A4036] dark:text-[#E4E6EB] focus:bg-[#F0EDE8] dark:focus:bg-[#3A3B3C]">
                          <span className="block truncate">{rubric.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#FEF7ED] border border-[#F5D9A8] rounded-lg text-sm text-[#A67C4A]">
                    <ClipboardList className="w-4 h-4" />
                    <span>尚未建立評分標準，請先建立 Rubric 後再發布作業</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Textarea */}
          <div className="px-4 pb-3">
            <Textarea
              ref={contentTextareaRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="在這裡輸入內容..."
              className="w-full bg-transparent border-0 text-[#4A4036] dark:text-[#E4E6EB] placeholder:text-[#9C9488] dark:placeholder:text-[#B0B3B8] text-base resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[80px] max-h-[300px]"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Attachments Section */}
          <div className="mx-4 mb-3 border-t border-[#E8E4DD] dark:border-[#393A3B] pt-3">
            <div className="flex items-center justify-between px-3 py-2 border border-[#E8E4DD] dark:border-[#393A3B] rounded-lg hover:bg-[#F0EDE8]/30 dark:hover:bg-[#3A3B3C] transition-colors">
              <span className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">新增到貼文</span>
              <div className="flex items-center gap-1">
                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => handleFileUpload(e.target.files, false)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F0EDE8] transition-colors cursor-pointer disabled:opacity-50"
                  title="上傳檔案 (PDF/DOCX/TXT)"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-[#6B9B6B] animate-spin" />
                  ) : (
                    <FileUp className="w-5 h-5 text-[#6B9B6B]" />
                  )}
                </button>

                {/* Image Upload */}
                <input
                  type="file"
                  className="hidden"
                  id="image-upload"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => handleFileUpload(e.target.files, true)}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isUploading}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F0EDE8] transition-colors cursor-pointer disabled:opacity-50"
                  title="上傳圖片"
                >
                  <Image className="w-5 h-5 text-[#5B8A8A]" />
                </button>

                {/* Mood/Feeling Button */}
                <button
                  type="button"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F0EDE8] transition-colors cursor-pointer"
                  title="感受/活動"
                >
                  <Smile className="w-5 h-5 text-[#C5A055]" />
                </button>
              </div>
            </div>

            {/* Uploaded Attachments Display */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.fileId}
                    className="flex items-center justify-between px-3 py-2 bg-[#F5F3EF] dark:bg-[#3A3B3C] border border-[#E8E4DD] dark:border-[#393A3B] rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-4 h-4 text-[#5B8A8A] dark:text-[#E4E6EB] flex-shrink-0" />
                      <span className="text-sm text-[#4A4036] dark:text-[#E4E6EB] truncate">{attachment.fileName}</span>
                      <span className="text-xs text-[#9C9488] flex-shrink-0">
                        {formatFileSize(attachment.fileSize)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.fileId)}
                      className="p-1 rounded hover:bg-[#E8E4DD] transition-colors cursor-pointer"
                      title="移除附件"
                    >
                      <Trash2 className="w-4 h-4 text-[#D4847C]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 mb-3 rounded-lg bg-[#FDF4F3] border border-[#D4847C]/30 p-3 text-sm text-[#D4847C]">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="px-4 pb-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.content.trim() || (formData.type === 'ASSIGNMENT' && !formData.rubricId)}
              className="w-full bg-[#5B8A8A] hover:bg-[#4A7676] disabled:bg-[#E8E4DD] dark:disabled:bg-[#3A3B3C] disabled:text-[#9C9488] dark:disabled:text-gray-500 text-white font-medium h-10 rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  發布中...
                </>
              ) : (
                '發佈'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
