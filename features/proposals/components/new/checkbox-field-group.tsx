// features/proposals/components/checkbox-field-group.tsx
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ProposalFormData } from "@/lib/validations/proposal";
import { cn } from "@/lib/utils";

interface CheckboxFieldGroupProps {
  name: string; // form field path
  label: string;
  options: string[];
  description?: string;
  hasDivider?: boolean;
}

export function CheckboxFieldGroup({
  name,
  label,
  options,
  description,
  hasDivider = false,
}: CheckboxFieldGroupProps) {
  const form = useFormContext<ProposalFormData>();

  return (
    <FormField
      control={form.control}
      name={name as any}
      render={() => (
        <FormItem className={cn(hasDivider && "border-b pb-3")}>
          <FormLabel>{label}</FormLabel>
          {description && (
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {options.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name={name as any}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={(field.value as string[])?.includes(item)}
                        onCheckedChange={(checked) => {
                          const current: string[] = Array.isArray(field.value)
                            ? field.value
                            : [];
                          field.onChange(
                            checked
                              ? [...current, item]
                              : current.filter((v) => v !== item),
                          );
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {item}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
