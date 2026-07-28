import type { DemoProposalData, DemoType } from "../types/demo-proposal";
import { COMMERCIAL_DEMO_DATA } from "./commercial-demo";
import { RESIDENTIAL_DEMO_DATA } from "./residential-demo";

export function getDemoData(type: DemoType): DemoProposalData {
  return type === "commercial" ? COMMERCIAL_DEMO_DATA : RESIDENTIAL_DEMO_DATA;
}

export { COMMERCIAL_DEMO_CARD, COMMERCIAL_DEMO_DATA } from "./commercial-demo";
export { RESIDENTIAL_DEMO_CARD, RESIDENTIAL_DEMO_DATA } from "./residential-demo";
