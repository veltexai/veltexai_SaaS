import { parseScopeTableData, splitScopeRows } from "../utils/split-scope-rows";

export function getScopeRowChunks(
  content: string | undefined,
  firstPageLimit = 12,
  continuationLimit = 14,
) {
  if (!content) return [];

  const tableData = parseScopeTableData(content);
  if (!tableData) return [];

  return splitScopeRows(tableData, firstPageLimit, continuationLimit);
}
