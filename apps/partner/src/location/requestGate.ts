export class LocationRequestGate {
  private revision = 0;
  begin(): number { return ++this.revision; }
  current(ticket: number): boolean { return ticket === this.revision; }
  invalidate(): void { this.revision++; }
}
