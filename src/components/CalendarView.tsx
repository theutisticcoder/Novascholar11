import React, { useState } from "react";
import { Plus, Download, Calendar as CalendarIcon, MapPin, Tag, Clock, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { CalendarEvent, Course, EventType } from "../types";
import { exportToIcs } from "../utils/icsExport";

interface CalendarViewProps {
  events: CalendarEvent[];
  courses: Course[];
  onAddEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (id: string) => void;
}

export default function CalendarView({ events, courses, onAddEvent, onRemoveEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 27)); // Set default matching local time frame (July 2026)
  const [selectedDate, setSelectedDate] = useState<string>("2026-07-28");
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Filters
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Form
  const [eventTitle, setEventTitle] = useState("");
  const [eventCourse, setEventCourse] = useState(courses[0]?.id || "");
  const [eventType, setEventType] = useState<EventType>("study");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDesc, setEventDesc] = useState("");

  const courseNamesMap = courses.reduce((acc, c) => {
    acc[c.id] = c.code;
    return acc;
  }, {} as Record<string, string>);

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterCourse !== "all" && e.courseId !== filterCourse) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    return true;
  });

  // Export fully filtered schedule to ICS file
  const handleIcsExport = () => {
    exportToIcs(filteredEvents, courseNamesMap);
  };

  // Days in month calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(formattedDate);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStart || !eventEnd) return;

    // Combine date with time
    const startIso = `${selectedDate}T${eventStart}`;
    const endIso = `${selectedDate}T${eventEnd}`;

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: eventTitle,
      start: startIso,
      end: endIso,
      courseId: eventCourse,
      type: eventType,
      description: eventDesc,
      location: eventLocation
    };

    onAddEvent(newEvent);

    // Reset Form
    setEventTitle("");
    setEventLocation("");
    setEventDesc("");
    setShowAddEvent(false);
  };

  // Find events for specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.start.startsWith(dateStr));
  };

  // Selected date events listing
  const selectedDayEvents = filteredEvents.filter((e) => e.start.startsWith(selectedDate));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Calendar Controller & Grid View (Left 8 Columns) */}
      <div className="lg:col-span-8 bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-bento-secondary/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-bento-bg/80 border border-bento-secondary/20 text-white bg-bento-bg rounded-lg cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-extrabold text-white w-36 text-center select-none">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-bento-bg/80 border border-bento-secondary/20 text-white bg-bento-bg rounded-lg cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleIcsExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-bento-primary/10 border border-bento-primary/20 hover:bg-bento-primary/20 text-bento-primary rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Export schedule to .ics file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ICS</span>
            </button>
            <button
              onClick={() => {
                setEventStart("09:00");
                setEventEnd("10:00");
                setShowAddEvent(true);
              }}
              className="flex items-center gap-1 px-3.5 py-2 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl text-xs font-bold transition shadow-[0_0_15px_rgba(102,252,241,0.2)] border border-bento-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-bento-bg p-3 rounded-xl border border-bento-secondary/10 text-xs text-bento-text-muted">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-bento-secondary" />
            <span className="font-bold text-bento-secondary">Filters:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Course:</span>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="border border-bento-secondary/25 rounded px-2 py-0.5 bg-bento-card text-white focus:outline-none focus:border-bento-primary/50 cursor-pointer font-medium"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-bento-secondary/25 rounded px-2 py-0.5 bg-bento-card text-white focus:outline-none focus:border-bento-primary/50 cursor-pointer font-medium"
            >
              <option value="all">All Types</option>
              <option value="class">Class Lectures</option>
              <option value="exam">Exams</option>
              <option value="study">Study Sessions</option>
              <option value="assignment">Assignments</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-bento-secondary uppercase tracking-widest py-1.5">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Monthly Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty indices */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[64px] bg-bento-bg/30 rounded-xl border border-bento-secondary/5" />
          ))}

          {/* Active Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEventsList = getEventsForDay(day);
            const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selectedDate === formattedDate;

            return (
              <div
                key={`day-${day}`}
                onClick={() => handleDayClick(day)}
                className={`min-h-[72px] p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer select-none ${
                  isSelected
                    ? "bg-bento-card border-bento-primary/60 shadow-[0_0_12px_rgba(102,252,241,0.12)] ring-1 ring-bento-primary/10"
                    : "bg-bento-card/30 border-bento-secondary/10 hover:bg-bento-card/50"
                }`}
              >
                <span className={`text-xs font-bold ${isSelected ? "text-bento-primary" : "text-bento-text-muted"}`}>
                  {day}
                </span>

                {/* mini event indicators */}
                <div className="space-y-1 mt-1">
                  {dayEventsList.slice(0, 2).map((ev) => {
                    let c = "bg-bento-secondary";
                    if (ev.type === "class") c = "bg-sky-400";
                    if (ev.type === "exam") c = "bg-rose-500";
                    if (ev.type === "study") c = "bg-emerald-400";
                    if (ev.type === "assignment") c = "bg-indigo-400";

                    return (
                      <div
                        key={ev.id}
                        className={`h-1 rounded-full w-full ${c} shadow-xs`}
                        title={ev.title}
                      />
                    );
                  })}
                  {dayEventsList.length > 2 && (
                    <span className="text-[8px] font-bold text-bento-secondary block text-center mt-0.5 leading-none">
                      +{dayEventsList.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda View (Right 4 Columns) */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-bold text-bento-secondary uppercase tracking-wider">Day Agenda: {selectedDate}</h3>

        <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-5 shadow-sm space-y-4">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-10 text-bento-text-muted text-sm space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-bento-secondary/30" />
              <p>Nothing scheduled on this day.</p>
              <button
                onClick={() => {
                  setEventStart("12:00");
                  setEventEnd("13:00");
                  setShowAddEvent(true);
                }}
                className="mt-2 text-xs font-bold text-bento-primary hover:underline cursor-pointer transition block w-full text-center"
              >
                Schedule an event
              </button>
            </div>
          ) : (
            <div className="divide-y divide-bento-secondary/10">
              {selectedDayEvents.map((ev) => {
                const startTime = ev.start.split("T")[1]?.slice(0, 5) || "All Day";
                const endTime = ev.end.split("T")[1]?.slice(0, 5) || "";
                const c = courses.find((course) => course.id === ev.courseId);

                let dotColor = "bg-slate-400";
                if (ev.type === "class") dotColor = "bg-sky-400";
                if (ev.type === "exam") dotColor = "bg-rose-500";
                if (ev.type === "study") dotColor = "bg-emerald-400";
                if (ev.type === "assignment") dotColor = "bg-indigo-400";

                return (
                  <div key={ev.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white leading-tight truncate">{ev.title}</h4>
                          <span className="text-[9px] font-bold text-bento-secondary uppercase tracking-wider mt-1 block">
                            {c ? c.code : "General"} • {ev.type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveEvent(ev.id)}
                        className="text-xs text-bento-secondary hover:text-rose-400 rounded px-1.5 py-0.5 hover:bg-rose-950/30 transition cursor-pointer font-bold"
                        title="Delete event"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-2.5 pl-4 space-y-1.5 text-xs text-bento-text-muted/80">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-bento-secondary" />
                        <span>{startTime} {endTime ? `- ${endTime}` : ""}</span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-bento-secondary" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                      {ev.description && (
                        <p className="text-bento-text-muted/60 pl-5 pt-0.5 leading-relaxed text-[11px] font-medium">{ev.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Add Event: {selectedDate}</h3>
              <button
                type="button"
                onClick={() => setShowAddEvent(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heuristics Study Session"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Associated Course</label>
                  <select
                    value={eventCourse}
                    onChange={(e) => setEventCourse(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                  >
                    <option value="" className="bg-bento-bg text-white">General Academic</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-bento-bg text-white">{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                  >
                    <option value="class" className="bg-bento-bg text-white">Class Lecture</option>
                    <option value="exam" className="bg-bento-bg text-white">Exam</option>
                    <option value="study" className="bg-bento-bg text-white">Study Session</option>
                    <option value="assignment" className="bg-bento-bg text-white">Assignment</option>
                    <option value="other" className="bg-bento-bg text-white">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Location / Classroom</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 4C or Library Room 4"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Brief Description</label>
                <textarea
                  rows={2}
                  placeholder="Review specific concepts or notes"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowAddEvent(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Confirm Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
