export type {
  DemoType,
  DemoSection,
  DemoProposalData,
  DemoCardConfig,
  ResidentialPackageType,
  ResidentialPackageConfig,
} from "./types/demo-proposal";

export { getDemoData, COMMERCIAL_DEMO_CARD, RESIDENTIAL_DEMO_CARD } from "./constants";
export { RESIDENTIAL_PACKAGES, RESIDENTIAL_PACKAGE_LABELS } from "./constants/residential-packages";
export { DEMO_INSIGHTS } from "./constants/demo-insights";
export type { DemoInsight } from "./constants/demo-insights";
export { getDemoTemplateData } from "./utils/get-demo-template-data";
export type { DemoTemplateData } from "./utils/get-demo-template-data";
export type { TemplateImages } from "@/features/templates/types/templates";

export { DemoTypeSelector } from "./components/demo-type-selector";
export { DemoPreview } from "./components/demo-preview";
export { DemoSectionBlock } from "./components/demo-section";
export { DemoCTA, SIGNUP_HREF } from "./components/demo-cta";
export { DemoPackageSelector } from "./components/demo-package-selector";
export { DemoSignupModal } from "./components/demo-signup-modal";
export { DemoActions } from "./components/demo-actions";
export { DemoShell } from "./components/demo-shell";
export { DemoStepper } from "./components/demo-stepper";
export { DemoGeneratingOverlay } from "./components/demo-generating-overlay";
export { DemoResultLayout } from "./components/demo-result-layout";
export { DemoViewerToolbar } from "./components/demo-viewer-toolbar";
