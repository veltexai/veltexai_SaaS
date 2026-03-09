// features/proposals/hooks/use-area-frequency.ts
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ProposalFormData } from "@/lib/validations/proposal";
import { DEFAULT_AREA_FREQUENCY } from "../constants/facility-options";

interface UseAreaFrequencyReturn {
  areasIncluded: string[];
  frequencyDetails: Record<string, string>;
  customAreaInput: string;
  showCustomAreaInput: boolean;
  setCustomAreaInput: (value: string) => void;
  setShowCustomAreaInput: (value: boolean) => void;
  handleToggleArea: (area: string) => void;
  handleAreaFrequencyChange: (area: string, frequency: string) => void;
  handleRemoveArea: (area: string) => void;
  handleAddCustomArea: () => void;
  handleSelectAll: (presetOptions: string[]) => void;
  handleClearAll: (presetOptions: string[]) => void;
}

export function useAreaFrequency(): UseAreaFrequencyReturn {
  const form = useFormContext<ProposalFormData>();
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);

  const areasIncluded: string[] =
    form.watch("service_scope.areas_included") ?? [];
  const frequencyDetails: Record<string, string> =
    (form.watch("service_scope.frequency_details") as Record<string, string>) ??
    {};

  const updateAreasForm = (
    areas: string[],
    details: Record<string, string>,
  ) => {
    form.setValue("service_scope.areas_included", areas, { shouldDirty: true });
    form.setValue("service_scope.frequency_details", details, {
      shouldDirty: true,
    });
  };

  const handleToggleArea = (area: string) => {
    const details = { ...frequencyDetails };
    if (areasIncluded.includes(area)) {
      const { [area]: _, ...rest } = details;
      updateAreasForm(
        areasIncluded.filter((a) => a !== area),
        rest,
      );
    } else {
      details[area] = DEFAULT_AREA_FREQUENCY;
      updateAreasForm([...areasIncluded, area], details);
    }
  };

  const handleAreaFrequencyChange = (area: string, frequency: string) => {
    updateAreasForm(areasIncluded, { ...frequencyDetails, [area]: frequency });
  };

  const handleRemoveArea = (area: string) => {
    const { [area]: _, ...rest } = frequencyDetails;
    updateAreasForm(
      areasIncluded.filter((a) => a !== area),
      rest,
    );
  };

  const handleAddCustomArea = () => {
    const name = customAreaInput.trim();
    if (!name || areasIncluded.includes(name)) return;
    updateAreasForm([...areasIncluded, name], {
      ...frequencyDetails,
      [name]: DEFAULT_AREA_FREQUENCY,
    });
    setCustomAreaInput("");
    setShowCustomAreaInput(false);
  };

  const handleSelectAll = (presetOptions: string[]) => {
    const newAreas = [...new Set([...areasIncluded, ...presetOptions])];
    const details = { ...frequencyDetails };
    for (const area of presetOptions) {
      if (!details[area]) details[area] = DEFAULT_AREA_FREQUENCY;
    }
    updateAreasForm(newAreas, details);
  };

  const handleClearAll = (presetOptions: string[]) => {
    const optionSet = new Set(presetOptions);
    const remaining = areasIncluded.filter((a) => !optionSet.has(a));
    const details = Object.fromEntries(
      Object.entries(frequencyDetails).filter(([key]) => !optionSet.has(key)),
    );
    updateAreasForm(remaining, details);
  };

  return {
    areasIncluded,
    frequencyDetails,
    customAreaInput,
    showCustomAreaInput,
    setCustomAreaInput,
    setShowCustomAreaInput,
    handleToggleArea,
    handleAreaFrequencyChange,
    handleRemoveArea,
    handleAddCustomArea,
    handleSelectAll,
    handleClearAll,
  };
}
