'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PublishConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  worksheetTitle?: string;
}

export function PublishConfirmDialog({
  open,
  onOpenChange,
  onConfirm
}: PublishConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>학습지 목록 추가</DialogTitle>
          <DialogDescription>
            학습지 목록에 현재 학습지를 추가합니다.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="border-red-200 bg-red-50 p-3">
          <AlertDescription className="m-0 p-0">
            <p className="text-sm">
              목록에 추가한 후에는 제목과 출제자 정보를 수정할 수 없습니다.
            </p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-black hover:bg-gray-800 text-white"
          >
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}