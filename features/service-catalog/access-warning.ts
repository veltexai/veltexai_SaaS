/** Advisory only: this heuristic is not an access-control or redaction boundary. */
export function hasPossibleEntryCode(text: string) {
  return /\b(?:lockbox|gate|alarm|entry|access|keypad|pin|code|combo|opener)\b.{0,30}\d{3,8}\b|#\d{3,8}\b/i.test(text);
}
