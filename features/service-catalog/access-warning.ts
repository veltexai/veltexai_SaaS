/** Advisory only: this heuristic is not an access-control or redaction boundary. */
export function hasPossibleEntryCode(text: string) {
  // Area quantities are not entry codes. Names are not passed to this helper.
  const prose = text.replace(/\b\d+(?:[.,]\d+)?\s*(?:sq\.?\s*(?:ft|feet)|square feet)\b/gi, 'area');
  return /\b(?:lockbox|gate|alarm|entry|access|keypad|pin|code|combo|opener)\b.{0,30}\d{3,8}\b|\b\d{3,8}\b.{0,30}\b(?:lockbox|gate|alarm|entry|keypad|pin|code|combo|opener)\b|#\d{3,8}\b/i.test(prose);
}
