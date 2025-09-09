import { X } from 'lucide-react';
import Image from 'next/image';
import { Button } from './button';
import { useConfirmation } from '../providers/confirmation-provider';

export function ConfirmationModal() {
  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    illustration,
    onConfirm,
    onCancel,
  } = useConfirmation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Illustration */}
        <div className="mb-6 flex justify-center">
          <Image
            src={`/illustrations/${illustration}`}
            alt="Warning illustration"
            width={220}
            height={220}
            className="object-contain"
          />
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            {title || 'Unsaved Changes'}
          </h3>
          <p className="mb-6 text-sm text-gray-600">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {cancelText || 'Stay Here'}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-destructive hover:bg-red-700"
          >
            {confirmText || 'Leave Page'}
          </Button>
        </div>
      </div>
    </div>
  );
}
