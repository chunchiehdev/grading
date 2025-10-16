import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddCategoryDialogProps {
  onAddCategory: (name: string) => void;
  children?: React.ReactNode;
}

export const AddCategoryDialog = ({ onAddCategory, children }: AddCategoryDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const { t } = useTranslation(['rubric', 'common']);

  const handleAdd = () => {
    if (categoryName.trim()) {
      onAddCategory(categoryName.trim());
      setCategoryName('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            {t('rubric:addCategory')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('rubric:addCategory')}</DialogTitle>
          <DialogDescription>{t('rubric:addCategoryDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category-name" className="text-right">
              {t('rubric:categoryName')}
            </Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('rubric:categoryNamePlaceholder')}
              className="col-span-3"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={!categoryName.trim()}>
            {t('rubric:addCategory')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
