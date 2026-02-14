import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';

interface FormNavigationProps {
    currentStep: number;
    totalSteps: number;
    isLoading: boolean;
    isSubmitDisabled: boolean;
    onNext: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onBack: () => void;
    onCancel: () => void;
  }
  
  export function FormNavigation({
    currentStep,
    totalSteps,
    isLoading,
    isSubmitDisabled,
    onNext,
    onBack,
    onCancel,
  }: FormNavigationProps) {
    const isFirstStep = currentStep === 1;
    const isFinalStep = currentStep === totalSteps;
  
    return (
      <div className="flex justify-between px-6 gap-6">
        <Button
          type="button"
          variant="outline"
          onClick={isFirstStep ? onCancel : onBack}
          className="flex items-center text-sm flex-1"
          size="lg"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {isFirstStep ? 'Cancel' : 'Back'}
        </Button>
  
        {isFinalStep ? (
          <Button
            type="submit"
            disabled={isLoading || isSubmitDisabled}
            className="flex items-center flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Proposal
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            className="flex items-center text-sm flex-1"
            size="lg"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }