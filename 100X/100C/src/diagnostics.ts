import type { DiagnosticEvent, DiagnosticSink } from "./types";

export class JsonConsoleDiagnosticSink implements DiagnosticSink {
  emit(event: DiagnosticEvent): void {
    const output = JSON.stringify(event);
    if (event.level === "error") console.error(output);
    else if (event.level === "warn") console.warn(output);
    else console.info(output);
  }
}
export class MemoryDiagnosticSink implements DiagnosticSink {
  readonly events: DiagnosticEvent[] = [];
  emit(event: DiagnosticEvent): void { this.events.push(event); }
}
