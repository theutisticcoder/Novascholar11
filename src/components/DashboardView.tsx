import { motion } from "motion/react";
import { BookOpen, Calendar, Award, Target, Plus, CheckSquare, Sparkles, LogIn, ChevronRight, FileText } from "lucide-react";
import { Course, CalendarEvent, Note, Goal } from "../types";

interface DashboardViewProps {
  courses: Course[];
  events: CalendarEvent[];
  notes: Note[];
  goals: Goal[];
  onNavigate: (tab: string) => void;
  onSelectNote: (noteId: string) => void;
  gpa: number;
}

export default function DashboardView({
  courses,
  events,
  notes,
  goals,
  onNavigate,
  onSelectNote,
  gpa
}: DashboardViewProps) {
  // Get today's events
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEvents = events.filter((e) => e.start.startsWith(todayStr));

  // Get active goals
  const activeGoals = goals.filter((g) => g.status === "in_progress");

  // Get recent notes
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Panel */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-br from-bento-card to-bento-bg rounded-3xl p-6 md:p-8 text-white overflow-hidden border border-bento-primary/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles className="w-48 h-48 text-bento-primary" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bento-primary/10 text-bento-primary text-xs font-semibold mb-3 border border-bento-primary/20">
            <BookOpen className="w-3.5 h-3.5" />
            Integrated Academic Engine
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-white">
            Welcome to your Academic Hub
          </h2>
          <p className="text-bento-text-muted text-sm leading-relaxed mb-6">
            Manage your course deliverables, sketch visual diagrams, typeset LaTeX mathematics, and use the study suite to practice active recall quizzes and study guides.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("notes")}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg text-xs font-bold rounded-xl transition shadow-[0_0_15px_rgba(102,252,241,0.25)] cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>Create New Note</span>
            </button>
            <button
              onClick={() => onNavigate("ai-companion")}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-bento-card/60 hover:bg-bento-card/90 text-white text-xs font-bold rounded-xl transition border border-bento-secondary/30 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-bento-primary" />
              <span>Study Suite</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Analytics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bento-card border border-bento-secondary/15 p-4.5 rounded-2xl flex items-center gap-4 hover:border-bento-primary/20 transition-all">
          <div className="p-3 bg-bento-primary/10 rounded-xl text-bento-primary shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Current GPA</span>
            <span className="text-2xl font-extrabold text-white leading-tight block">{gpa.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-bento-card border border-bento-secondary/15 p-4.5 rounded-2xl flex items-center gap-4 hover:border-bento-primary/20 transition-all">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Courses</span>
            <span className="text-2xl font-extrabold text-white leading-tight block">{courses.length}</span>
          </div>
        </div>

        <div className="bg-bento-card border border-bento-secondary/15 p-4.5 rounded-2xl flex items-center gap-4 hover:border-bento-primary/20 transition-all">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Today's Events</span>
            <span className="text-2xl font-extrabold text-white leading-tight block">{todayEvents.length}</span>
          </div>
        </div>

        <div className="bg-bento-card border border-bento-secondary/15 p-4.5 rounded-2xl flex items-center gap-4 hover:border-bento-primary/20 transition-all">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Active Goals</span>
            <span className="text-2xl font-extrabold text-white leading-tight block">{activeGoals.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Splitted Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schedule Agenda + Recent Study Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Notes */}
          <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-bento-primary" />
                <span>Recent Course Notes</span>
              </h3>
              <button
                onClick={() => onNavigate("notes")}
                className="text-xs font-semibold text-bento-primary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-8 bg-bento-bg/40 rounded-2xl border border-bento-secondary/10">
                <p className="text-sm text-bento-text-muted">No notes created yet.</p>
                <button
                  onClick={() => onNavigate("notes")}
                  className="mt-2 text-xs font-semibold text-bento-primary hover:underline cursor-pointer"
                >
                  Create your first note
                </button>
              </div>
            ) : (
              <div className="divide-y divide-bento-secondary/10">
                {recentNotes.map((note) => {
                  const c = courses.find((course) => course.id === note.courseId);
                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      className="flex items-center justify-between py-3 hover:bg-bento-bg/50 px-3 rounded-xl transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-4">
                        <span className="text-sm font-semibold text-white truncate block">
                          {note.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-bento-text-muted/70">
                          <span className="px-1.5 py-0.5 rounded bg-bento-bg border border-bento-secondary/20 font-bold uppercase tracking-wider text-[9px] text-bento-primary">
                            {c ? c.code : "General"}
                          </span>
                          <span>•</span>
                          <span>{note.type === "cornell" ? "Cornell Notes" : "Outline Notes"}</span>
                          <span>•</span>
                          <span>{note.date}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-bento-secondary shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Agenda */}
          <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-bento-primary" />
                <span>Today's Academic Agenda</span>
              </h3>
              <button
                onClick={() => onNavigate("calendar")}
                className="text-xs font-semibold text-bento-primary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Full Calendar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <div className="text-center py-10 bg-bento-bg/40 rounded-2xl border border-bento-secondary/10 text-bento-text-muted">
                <p className="text-sm">No classes, study sessions, or deadlines scheduled for today.</p>
                <p className="text-xs text-bento-secondary mt-1">Enjoy the open study block!</p>
              </div>
            ) : (
              <div className="relative border-l border-bento-secondary/10 pl-4 ml-2 space-y-4 py-2">
                {todayEvents.map((event) => {
                  const startTime = event.start.split("T")[1].slice(0, 5);
                  const endTime = event.end.split("T")[1].slice(0, 5);
                  const c = courses.find((course) => course.id === event.courseId);

                  let typeColor = "bg-bento-bg text-bento-text-muted border-bento-secondary/20";
                  if (event.type === "class") typeColor = "bg-blue-950/40 text-blue-300 border-blue-500/20";
                  if (event.type === "exam") typeColor = "bg-rose-950/40 text-rose-300 border-rose-500/20 font-bold";
                  if (event.type === "study") typeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-500/20";
                  if (event.type === "assignment") typeColor = "bg-purple-950/40 text-purple-300 border-purple-500/20";

                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-bento-primary ring-4 ring-bento-card" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-bento-bg/30 border border-bento-secondary/10 rounded-xl hover:border-bento-primary/20 transition-all">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${typeColor}`}>
                              {event.type}
                            </span>
                            {c && (
                              <span className="text-[9px] uppercase font-bold tracking-wider bg-bento-bg border border-bento-secondary/20 text-bento-primary px-1.5 py-0.5 rounded">
                                {c.code}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-white">{event.title}</h4>
                          {event.location && <span className="text-xs text-bento-text-muted/65 block mt-0.5">Location: {event.location}</span>}
                        </div>
                        <div className="text-xs font-semibold text-bento-primary bg-bento-bg/80 border border-bento-secondary/20 px-2 py-1 rounded-md self-start md:self-center shrink-0">
                          {startTime} - {endTime}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Goals Checklist Roadmap */}
        <div className="space-y-6">
          <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-bento-primary" />
                <span>Goal Roadmap Targets</span>
              </h3>
              <button
                onClick={() => onNavigate("goals")}
                className="text-xs font-semibold text-bento-primary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Manage</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="text-center py-8 bg-bento-bg/40 rounded-2xl border border-bento-secondary/10 text-bento-text-muted">
                <p className="text-sm">No active goals listed.</p>
                <button
                  onClick={() => onNavigate("goals")}
                  className="mt-2 text-xs font-semibold text-bento-primary hover:underline cursor-pointer"
                >
                  Set your goals roadmap
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-bento-bg/30 border border-bento-secondary/10 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <h4 className="text-sm font-bold text-white leading-snug">{goal.title}</h4>
                        <span className="text-[10px] text-bento-secondary font-bold uppercase tracking-wider block mt-1">
                          Due: {goal.dueDate}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-bento-primary bg-bento-primary/10 border border-bento-primary/20 px-1.5 py-0.5 rounded">
                        {goal.progress}%
                      </span>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="w-full bg-bento-bg h-2 rounded-full overflow-hidden border border-bento-secondary/10">
                      <div
                        className="bg-gradient-to-r from-bento-secondary to-bento-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>

                    {/* Milestones Sneak Peak */}
                    {goal.milestones.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-bento-secondary/10">
                        {goal.milestones.slice(0, 2).map((ms) => (
                          <div key={ms.id} className="flex items-center gap-2 text-xs">
                            <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${ms.completed ? "text-bento-primary fill-bento-primary/10" : "text-bento-secondary/30"}`} />
                            <span className={ms.completed ? "text-bento-text-muted/40 line-through" : "text-bento-text-muted/80"}>
                              {ms.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
