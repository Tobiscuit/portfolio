/** "October 10, 2026". In UTC, so a date never depends on where the server runs. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}

/** 92 -> "1:32". */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
