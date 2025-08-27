'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorksheetMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; author: string }) => void;
  initialData?: { title?: string; author?: string };
  isEditing?: boolean;
}

export function WorksheetMetadataDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false
}: WorksheetMetadataDialogProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [author, setAuthor] = useState(initialData?.author || '');

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '');
      setAuthor(initialData?.author || '');
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && author.trim()) {
      onSubmit({
        title: title.trim(),
        author: author.trim()
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? '학습지 정보 수정' : '학습지 정보 입력'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? '학습지 제목과 출제자 정보를 수정할 수 있습니다.'
                : '학습지 제목과 출제자 정보를 입력해주세요.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                학습지명 *
              </label>
              <Input
                id="title"
                placeholder="학습지 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="author" className="text-sm font-medium">
                출제자 *
              </label>
              <Input
                id="author"
                placeholder="출제자명을 입력하세요"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !author.trim()}
              className={
                isEditing 
                  ? "bg-black hover:bg-gray-800 text-white" 
                  : "text-white"
              }
              style={
                isEditing 
                  ? undefined 
                  : { backgroundColor: '#FF00A1' }
              }
              onMouseEnter={
                isEditing 
                  ? undefined 
                  : (e) => e.currentTarget.style.backgroundColor = '#E6009A'
              }
              onMouseLeave={
                isEditing 
                  ? undefined 
                  : (e) => e.currentTarget.style.backgroundColor = '#FF00A1'
              }
            >
              {isEditing ? '저장' : '진행'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}