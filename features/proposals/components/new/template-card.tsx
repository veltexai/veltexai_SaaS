import { TemplateCardInfo, TemplateItem, TemplateCardPreview  } from "@/features/proposals";
import { cn } from "@/lib/utils";


interface TemplateCardProps {
    template: TemplateItem;
    isSelected: boolean;
    canAccess: boolean;
    onSelect: (id: string) => void;
    onPreview: (template: TemplateItem) => void;
  }
  
  export function TemplateCard({
    template,
    isSelected,
    canAccess,
    onSelect,
    onPreview,
  }: TemplateCardProps) {
    return (
      <article
        role="button"
        tabIndex={canAccess ? 0 : -1}
        aria-pressed={isSelected}
        aria-disabled={!canAccess}
        className={cn(
          'relative border-2 rounded-lg overflow-hidden transition-all',
          isSelected ? 'border-blue-500 bg-blue-50'
            : canAccess ? 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
            : 'border-gray-200 opacity-60'
        )}
        onClick={() => canAccess && onSelect(template.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (canAccess && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(template.id);
          }
        }}
      >
        <TemplateCardPreview template={template} canAccess={canAccess} isSelected={isSelected} />
        <TemplateCardInfo
          template={template}
          isSelected={isSelected}
          canAccess={canAccess}
          onSelect={onSelect}
          onPreview={onPreview}
        />
      </article>
    );
  }