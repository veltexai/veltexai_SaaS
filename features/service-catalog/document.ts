/** Text representation used by all catalog render/export paths. Never recalculate
 * historical documents against a newer catalog or silently drop their sections. */
export function catalogDocumentText(content: string): string {
  const safeParse = (json: string) => { try { return JSON.parse(json); } catch { return { rows: [], summary: { total: 'See agreed price' } }; } };
  return content.replace(/^Access:.*$/gm, '')
    .replace(/This scope and suggested price are subject to operator review and customer acceptance\./gi, '')
    .replace(/No price is guaranteed by Veltex AI\./g, '')
    .replace(/Suggested price requires operator review and customer acceptance\./gi, '')
    .replace(/Operator notes: No additional terms specified\./g, '')
    .replace(/Operator signature:/g, 'Cleaning company signature:').replace(/Suggested price/g, 'Price')
    .replace(/```veliz_scope_table\s*([\s\S]*?)```/g, (_, json) => {
    const data = safeParse(json) ?? {};
    return (Array.isArray(data.rows) ? data.rows : []).map((r: { area: string; frequency: string }) => `- ${r.area}`).join('\n');
  }).replace(/```veliz_pricing_table\s*([\s\S]*?)```/g, (_, json) => {
    const data = safeParse(json) ?? {};
    return (Array.isArray(data.rows) ? data.rows : []).map((r: { service: string; frequency: string; pricePerMonth: string }) => `${r.service} (${r.frequency}): **${r.pricePerMonth}**`).join('\n\n') + `\n\n**Total before any applicable tax: ${data.summary?.total ?? 'See agreed price'}**`;
  });
}
