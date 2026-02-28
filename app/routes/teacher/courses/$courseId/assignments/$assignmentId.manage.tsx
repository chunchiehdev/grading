import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { Save, Trash2, Calendar, FileText, Users, Clock, FileUp, File, Loader2, Image, Smile, Check, X } from 'lucide-react';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

import { requireTeacher } from '@/services/auth.server';
import {
  getAssignmentAreaById,
  updateAssignmentArea,
  deleteAssignmentArea,
  type UpdateAssignmentAreaData,
} from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseDateOnlyToUTCDate } from '@/lib/date';

interface Attachment {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  assignmentArea: any;
  rubrics: any[];
  formattedDueDate?: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  existingAttachments: Attachment[];
}

interface ActionData {
  success?: boolean;
  error?: string;
  action?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;

  if (!courseId || !assignmentId) {
    throw new Response('Course ID and Assignment ID are required', { status: 400 });
  }

  const [assignmentArea, rubricsResult] = await Promise.all([
    getAssignmentAreaById(assignmentId, teacher.id),
    listRubrics(teacher.id),
  ]);

  if (!assignmentArea) {
    throw new Response('Assignment area not found', { status: 404 });
  }

  const { formatDateForForm, formatDateForDisplay } = await import('@/lib/date.server');
  const formattedDueDate = assignmentArea.dueDate ? formatDateForForm(assignmentArea.dueDate) : undefined;
  const formattedCreatedAt = formatDateForDisplay(new Date(assignmentArea.createdAt));
  const formattedUpdatedAt = formatDateForDisplay(new Date(assignmentArea.updatedAt));

  // Load existing attachments
  let existingAttachments: Attachment[] = [];
  if (assignmentArea.referenceFileIds) {
    try {
      const fileIds = JSON.parse(assignmentArea.referenceFileIds);
      if (fileIds && fileIds.length > 0) {
        const { db } = await import('@/lib/db.server');
        const files = await db.uploadedFile.findMany({
          where: {
            id: { in: fileIds },
            isDeleted: false,
          },
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
          },
        });
        existingAttachments = files.map((file) => ({
          fileId: file.id,
          fileName: file.originalFileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        }));
      }
    } catch (error) {
      console.error('Failed to load existing attachments:', error);
    }
  }

  return {
    teacher,
    assignmentArea,
    rubrics: rubricsResult.rubrics?.filter((r: any) => r.isActive) || [],
    formattedDueDate,
    formattedCreatedAt,
    formattedUpdatedAt,
    existingAttachments,
  };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (!courseId || !assignmentId) {
    return { success: false, error: 'course:assignment.manage.errors.missingIds' };
  }

  try {
    if (intent === 'delete') {
      const success = await deleteAssignmentArea(assignmentId, teacher.id);
      if (success) {
        throw redirect(`/teacher/courses/${courseId}`);
      } else {
        return { success: false, error: 'course:assignment.manage.errors.deleteFailed' };
      }
    }

    if (intent === 'update') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const rubricId = formData.get('rubricId') as string;
      const dueDate = formData.get('dueDate') as string;
      const referenceFileIds = formData.get('referenceFileIds') as string;
      const customGradingPrompt = formData.get('customGradingPrompt') as string;

      if (!name || name.trim().length === 0) {
        return { success: false, error: 'course:assignment.manage.errors.nameRequired' };
      }

      if (!rubricId) {
        return { success: false, error: 'course:assignment.manage.errors.rubricRequired' };
      }

      const updateData: UpdateAssignmentAreaData = {
        name: name.trim(),
        description: description?.trim() || undefined,
        rubricId,
        dueDate: parseDateOnlyToUTCDate(dueDate),
      };

      const updatedArea = await updateAssignmentArea(assignmentId, teacher.id, updateData);

      if (!updatedArea) {
        return { success: false, error: 'course:assignment.manage.errors.updateFailed' };
      }

      // Update reference files and custom grading prompt
      const additionalUpdateData: any = {};

      if (referenceFileIds && referenceFileIds.trim() !== '') {
        try {
          const fileIds = JSON.parse(referenceFileIds);
          const validFileIds = fileIds.filter((id: any) => id && typeof id === 'string');
          if (validFileIds.length > 0) {
            additionalUpdateData.referenceFileIds = JSON.stringify(validFileIds);
          } else {
            additionalUpdateData.referenceFileIds = null;
          }
        } catch (error) {
          console.error('Failed to parse referenceFileIds:', error);
        }
      } else {
        additionalUpdateData.referenceFileIds = null;
      }

      if (customGradingPrompt && customGradingPrompt.trim() !== '') {
        additionalUpdateData.customGradingPrompt = customGradingPrompt.trim();
      } else {
        additionalUpdateData.customGradingPrompt = null;
      }

      if (Object.keys(additionalUpdateData).length > 0) {
        const { db } = await import('@/lib/db.server');
        await db.assignmentArea.update({
          where: { id: assignmentId },
          data: additionalUpdateData,
        });
      }

      return { success: true, action: 'update' };
    }

    return { success: false, error: 'course:assignment.manage.errors.invalidAction' };
  } catch (error) {
    console.error('Error in assignment area action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'course:assignment.manage.errors.generic',
    };
  }
}

export default function ManageAssignmentArea() {
  const { teacher, assignmentArea, rubrics, formattedDueDate, formattedCreatedAt, formattedUpdatedAt, existingAttachments } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t, i18n } = useTranslation(['course', 'common']);
  
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [assignTo, setAssignTo] = useState<'all' | 'specific'>('all');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['groupA']);
  
  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>(existingAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Custom grading prompt state
  const [customGradingPrompt, setCustomGradingPrompt] = useState(assignmentArea.customGradingPrompt || '');
  const lastActionToastRef = useRef<string | null>(null);

  const resolveMessage = (message?: string): string => {
    if (!message) return '';
    return i18n.exists(message) ? t(message) : message;
  };

  useEffect(() => {
    if (!actionData) return;
    const toastKey = `${actionData.action || 'none'}:${actionData.success ? '1' : '0'}:${actionData.error || ''}`;
    if (lastActionToastRef.current === toastKey) return;
    lastActionToastRef.current = toastKey;

    if (actionData.success && actionData.action === 'update') {
      toast.success(t('course:assignment.manage.updateSuccess'));
      return;
    }

    if (actionData.error) {
      toast.error(resolveMessage(actionData.error));
    }
  }, [actionData, t, i18n]);

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
      toast.error(
        t(
          isImage
            ? 'course:assignment.manage.attachments.imageTypeNotSupported'
            : 'course:assignment.manage.attachments.docTypeNotSupported'
        )
      );
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error(t('course:assignment.manage.attachments.fileTooLarge'));
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
        throw new Error(result.error || 'course:assignment.manage.attachments.uploadFailed');
      }

      setAttachments(prev => [...prev, {
        fileId: result.data.fileId,
        fileName: result.data.fileName,
        fileSize: result.data.fileSize,
        mimeType: file.type,
      }]);
      toast.success(t('course:assignment.manage.attachments.uploaded', { fileName: file.name }));
    } catch (err) {
      toast.error(resolveMessage(err instanceof Error ? err.message : 'course:assignment.manage.attachments.uploadFailed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachments(prev => prev.filter(a => a.fileId !== fileId));
    toast.success(t('course:assignment.manage.attachments.removed'));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">{t('course:assignment.manage.editAssignment')}</h1>
            <Link
              to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/submissions`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
              title={t('course:assignment.manage.viewSubmissions')}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('course:assignment.manage.viewSubmissions')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <Form id="delete-assignment-form" method="post" className="hidden">
          <input type="hidden" name="intent" value="delete" />
        </Form>

        <Form method="post" className="space-y-6">
          <input type="hidden" name="intent" value="update" />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* General Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('course:assignment.manage.generalInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium mb-2 block">
                      {t('course:assignment.manage.assignmentTitle')}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={assignmentArea.name}
                      required
                      className="h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                      {t('course:assignment.manage.instructions')}
                    </Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {/* Rich Text Toolbar */}
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30">
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.bold')}>
                          <span className="font-bold text-sm">B</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.italic')}>
                          <span className="italic text-sm">I</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.underline')}>
                          <span className="underline text-sm">U</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.strikethrough')}>
                          <span className="line-through text-sm">S</span>
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.code')}>
                          <span className="font-mono text-sm">&lt;/&gt;</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.superscript')}>
                          <span className="text-sm">x²</span>
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.bulletList')}>
                          <span className="text-sm">•</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.numberedList')}>
                          <span className="text-sm">1.</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.indent')}>
                          <span className="text-sm">→</span>
                        </button>
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.outdent')}>
                          <span className="text-sm">←</span>
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button type="button" className="p-1.5 hover:bg-accent rounded" title={t('course:assignment.manage.editor.link')}>
                          <span className="text-sm">🔗</span>
                        </button>
                      </div>
                      <Textarea
                        id="description"
                        name="description"
                        rows={16}
                        defaultValue={assignmentArea.description || ''}
                        placeholder={t('course:assignment.manage.instructionsPlaceholder')}
                        className="border-0 focus-visible:ring-0 resize-none"
                      />
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between px-3 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-sm font-medium text-foreground">{t('course:assignment.manage.attachments.addReference')}</span>
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
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                          title={t('course:assignment.manage.attachments.uploadFileTitle')}
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-[#6B9B6B] animate-spin" />
                          ) : (
                            <FileUp className="w-5 h-5 text-[#6B9B6B]" />
                          )}
                        </button>

                        {/* Image Upload */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.webp"
                          onChange={(e) => handleFileUpload(e.target.files, true)}
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                          title={t('course:assignment.manage.attachments.uploadImageTitle')}
                        >
                          <Image className="w-5 h-5 text-[#5B8A8A]" />
                        </button>
                      </div>
                    </div>

                    {/* Uploaded Attachments Display */}
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((attachment) => (
                          <div 
                            key={attachment.fileId}
                            className="flex items-center justify-between px-3 py-2 bg-muted/50 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <File className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-sm text-foreground truncate">{attachment.fileName}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatFileSize(attachment.fileSize)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.fileId)}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors text-destructive"
                              title={t('course:assignment.manage.attachments.removeTitle')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hidden input for form submission */}
                    <input 
                      type="hidden" 
                      name="referenceFileIds" 
                      value={JSON.stringify(attachments.map(a => a.fileId))} 
                    />
                  </div>

                  {/* Custom Grading Instructions */}
                  <div className="pt-4 border-t border-border space-y-2">
                    <Label htmlFor="customGradingPrompt" className="text-sm font-medium">
                      {t('course:assignment.manage.customPrompt.title')}
                    </Label>
                    <Textarea
                      id="customGradingPrompt"
                      name="customGradingPrompt"
                      value={customGradingPrompt}
                      onChange={(e) => setCustomGradingPrompt(e.target.value)}
                      rows={4}
                      placeholder={t('course:assignment.manage.customPrompt.placeholder')}
                      className="resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('course:assignment.manage.customPrompt.helpText')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Submission & Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('course:assignment.manage.submissionTimeline')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dueDate" className="text-sm font-medium mb-2 block">
                        {t('course:assignment.manage.dueDate')}
                      </Label>
                      <DatePicker
                        name="dueDate"
                        defaultISOString={assignmentArea.dueDate ? new Date(assignmentArea.dueDate).toISOString() : undefined}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueTime" className="text-sm font-medium mb-2 block">
                        {t('course:assignment.manage.dueTime')}
                      </Label>
                      <Select name="dueTime" defaultValue="18:00">
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00:00">12:00 AM</SelectItem>
                          <SelectItem value="06:00">6:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM</SelectItem>
                          <SelectItem value="23:59">11:59 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="submissionType" className="text-sm font-medium mb-2 block">
                      {t('course:assignment.manage.submissionType')}
                    </Label>
                    <Select name="submissionType" defaultValue="file-upload">
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file-upload">{t('course:assignment.manage.submissionTypes.fileUploadTextEntry')}</SelectItem>
                        <SelectItem value="file-only">{t('course:assignment.manage.submissionTypes.fileOnly')}</SelectItem>
                        <SelectItem value="text-only">{t('course:assignment.manage.submissionTypes.textOnly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* This feature is not implemented.*/}
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="allowLate" className="text-sm font-medium">
                      {t('course:assignment.manage.allowLateSubmissions')}
                    </Label>
                    <Switch
                      id="allowLate"
                      name="allowLate"
                      checked={allowLateSubmissions}
                      onCheckedChange={setAllowLateSubmissions}
                    />
                  </div>

                  <div>
                    <Label htmlFor="penalty" className="text-sm font-medium mb-2 block">
                      {t('course:assignment.manage.penaltySubmissions')}
                    </Label>
                    <Select name="penalty" defaultValue="0">
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('course:assignment.manage.penaltyOptions.none')}</SelectItem>
                        <SelectItem value="5">{t('course:assignment.manage.penaltyOptions.five')}</SelectItem>
                        <SelectItem value="10">{t('course:assignment.manage.penaltyOptions.ten')}</SelectItem>
                        <SelectItem value="15">{t('course:assignment.manage.penaltyOptions.fifteen')}</SelectItem>
                        <SelectItem value="20">{t('course:assignment.manage.penaltyOptions.twenty')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              {/* Grading & Evaluation */}
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('course:assignment.manage.gradingEvaluation')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                      <Label htmlFor="rubricId" className="text-sm font-medium flex-shrink-0">
                        {t('course:assignment.manage.gradingRubric')}
                      </Label>
                      <a
                        href="/teacher/rubrics/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-shrink-0 whitespace-nowrap"
                      >
                        {t('course:assignment.manage.createNew')}
                      </a>
                    </div>
                    <Select name="rubricId" defaultValue={assignmentArea.rubricId} required>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t('course:assignment.manage.selectRubric')} />
                      </SelectTrigger>
                      <SelectContent>
                        {rubrics.map((rubric) => (
                          <SelectItem key={rubric.id} value={rubric.id}>
                            {rubric.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm font-medium mb-2 block">
                      {t('course:assignment.manage.gradingCategory')}
                    </Label>
                    <Select name="category" defaultValue="">
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('course:assignment.manage.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homework">{t('course:assignment.manage.categories.homework')}</SelectItem>
                        <SelectItem value="quiz">{t('course:assignment.manage.categories.quiz')}</SelectItem>
                        <SelectItem value="exam">{t('course:assignment.manage.categories.exam')}</SelectItem>
                        <SelectItem value="project">{t('course:assignment.manage.categories.project')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('course:assignment.manage.distribution.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">{t('course:assignment.manage.distribution.assignTo')}</Label>
                    <RadioGroup
                      value={assignTo}
                      onValueChange={(value) => setAssignTo(value as 'all' | 'specific')}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all-students" />
                        <Label htmlFor="all-students" className="font-normal cursor-pointer">
                          {t('course:assignment.manage.allStudents')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific" id="specific-groups" />
                        <Label htmlFor="specific-groups" className="font-normal cursor-pointer">
                          {t('course:assignment.manage.specificGroups')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {assignTo === 'specific' && (
                    <div className="space-y-2 pl-6 pt-2">
                      {['groupA', 'groupB', 'groupC'].map((group) => (
                        <div key={group} className="flex items-center space-x-2">
                          <Checkbox
                            id={group}
                            checked={selectedGroups.includes(group)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGroups([...selectedGroups, group]);
                              } else {
                                setSelectedGroups(selectedGroups.filter((g) => g !== group));
                              }
                            }}
                          />
                          <Label htmlFor={group} className="font-normal cursor-pointer">
                            {t(`course:assignment.manage.group${group.slice(-1).toUpperCase()}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border gap-2">
            <button
              type="submit"
              form="delete-assignment-form"
              formNoValidate
              className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 px-2 sm:px-0"
              title={t('course:assignment.manage.deleteAssignment')}
              onClick={(e) => {
                if (!confirm(t('course:assignment.manage.deleteConfirm'))) {
                  e.preventDefault();
                }
              }}
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t('course:assignment.manage.deleteAssignment')}</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to={`/teacher/courses/${assignmentArea.courseId}`}
                className="inline-flex items-center justify-center rounded-lg border border-border w-10 h-10 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                title={t('course:assignment.manage.cancel')}
              >
                <X className="h-5 w-5 sm:hidden" />
                <span className="hidden sm:inline">{t('course:assignment.manage.cancel')}</span>
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary w-10 h-10 sm:w-auto sm:h-auto sm:px-6 sm:py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                title={t('course:assignment.manage.saveChanges')}
              >
                <Check className="h-5 w-5 sm:hidden" />
                <Save className="h-4 w-4 hidden sm:block flex-shrink-0" />
                <span className="hidden sm:inline">{t('course:assignment.manage.saveChanges')}</span>
              </button>
            </div>
          </div>
        </Form>
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return <ErrorPage statusCode={400} messageKey="errors.400.missingParams" returnTo="/teacher" />;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.assignment" returnTo="/teacher" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.assignment" returnTo="/teacher" />;
}
