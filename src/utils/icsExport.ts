import { CalendarEvent } from "../types";

// Helper to format ISO strings to iCalendar date-time format (YYYYMMDDTHHMMSS)
function formatIcsDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function exportToIcs(events: CalendarEvent[], courseNamesMap: Record<string, string>): void {
  if (events.length === 0) {
    alert("No calendar events to export!");
    return;
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Novascholar//Study Suite Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  events.forEach((event) => {
    const courseName = courseNamesMap[event.courseId] || "General Academic";
    const cleanDescription = (event.description || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
    const cleanTitle = `[${courseName}] ${event.title}`.replace(/[,;\\]/g, "\\$&");
    const cleanLocation = (event.location || "").replace(/[,;\\]/g, "\\$&");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:ns-${event.id}@novascholar.com`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatIcsDate(event.start)}`);
    lines.push(`DTEND:${formatIcsDate(event.end)}`);
    lines.push(`SUMMARY:${cleanTitle}`);
    lines.push(`DESCRIPTION:${cleanDescription}`);
    if (cleanLocation) {
      lines.push(`LOCATION:${cleanLocation}`);
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  const icsContent = lines.join("\r\n");
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Trigger file download
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `novascholar_schedule_${new Date().toISOString().split("T")[0]}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
