/**
 * Utility to split scope of service table rows across multiple pages
 * to prevent PDF overflow/overlap issues
 */

export type ScopeRow = {
  area: string;
  frequency: string;
  costPerVisit?: string | null;
  monthlyCost?: string | null;
  note?: string | null;
};

export type ScopeTableData = {
  rows: ScopeRow[];
};

/**
 * Parse scope content to extract table data
 */
export function parseScopeTableData(content: string): ScopeTableData | null {
  const lines = content.split('\n').map((l) => l.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```') && line.toLowerCase().includes('veliz_scope_table')) {
      const jsonLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        jsonLines.push(lines[i]);
        i++;
      }
      const jsonText = jsonLines.join('\n');
      try {
        return JSON.parse(jsonText) as ScopeTableData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Split scope table rows into page-sized chunks
 * Returns an array of row arrays, each representing a page's worth of content
 */
export function splitScopeRows(
  data: ScopeTableData,
  maxFirstPage: number = 8,
  maxContinuationPage: number = 14
): ScopeRow[][] {
  const rows = data?.rows ?? [];
  
  if (rows.length === 0) {
    return [];
  }
  
  // If all rows fit on first page, return single chunk
  if (rows.length <= maxFirstPage) {
    return [rows];
  }
  
  const chunks: ScopeRow[][] = [];
  
  // First page gets fewer rows (has title, description, etc.)
  chunks.push(rows.slice(0, maxFirstPage));
  
  // Remaining rows go into continuation pages
  let remaining = rows.slice(maxFirstPage);
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxContinuationPage));
    remaining = remaining.slice(maxContinuationPage);
  }
  
  return chunks;
}
