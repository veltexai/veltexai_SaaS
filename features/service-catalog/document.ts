/** Text representation used by all catalog render/export paths. Never recalculate
 * historical documents against a newer catalog or silently drop their sections. */
export function catalogDocumentText(content: string): string {
  return content.replace(/```veliz_scope_table\s*([\s\S]*?)```/g, (_, json) => {
    const data = JSON.parse(json);
    return data.rows.map((r: { area: string; frequency: string }) => `- ${r.area} — ${r.frequency}`).join('\n');
  }).replace(/```veliz_pricing_table\s*([\s\S]*?)```/g, (_, json) => {
    const data = JSON.parse(json);
    return data.rows.map((r: { service: string; frequency: string; pricePerMonth: string }) => `${r.service} (${r.frequency}): **${r.pricePerMonth}**`).join('\n\n') + `\n\n**Total before any applicable tax: ${data.summary.total}**`;
  });
}
