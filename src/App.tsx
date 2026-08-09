import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Award,
  Target,
  Sparkles,
  FileText,
  HelpCircle,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { Course, CalendarEvent, Note, Goal, Flashcard } from "./types";
import {
  DEFAULT_COURSES,
  DEFAULT_CALENDAR_EVENTS,
  DEFAULT_NOTES,
  DEFAULT_GOALS
} from "./data";
import { GPA_SCALE } from "./components/GradeTrackerView";

// Modular Views
import DashboardView from "./components/DashboardView";
import GradeTrackerView from "./components/GradeTrackerView";
import NotesEditorView from "./components/NotesEditorView";
import CalendarView from "./components/CalendarView";
import AiCompanionView from "./components/AiCompanionView";
import GoalRoadmapView from "./components/GoalRoadmapView";

export default function App() {
  // Load State from LocalStorage or Fallback to pre-populated seed data
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem("ns_courses");
    return saved ? JSON.parse(saved) : DEFAULT_COURSES;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem("ns_events");
    return saved ? JSON.parse(saved) : DEFAULT_CALENDAR_EVENTS;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("ns_notes");
    return saved ? JSON.parse(saved) : DEFAULT_NOTES;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem("ns_goals");
    return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });

  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem("ns_flashcards");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    const savedNotes = localStorage.getItem("ns_notes");
    const parsed = savedNotes ? JSON.parse(savedNotes) : DEFAULT_NOTES;
    return parsed.length > 0 ? parsed[0].id : null;
  });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [apiConfigured, setApiConfigured] = useState<boolean>(true);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // One-time clear of default storage to ensure a clean slate
  useEffect(() => {
    if (!localStorage.getItem("ns_default_cleared_v4")) {
      localStorage.removeItem("ns_courses");
      localStorage.removeItem("ns_events");
      localStorage.removeItem("ns_notes");
      localStorage.removeItem("ns_goals");
      localStorage.removeItem("ns_flashcards");
      localStorage.setItem("ns_default_cleared_v4", "true");
      setCourses([]);
      setEvents([]);
      setNotes([]);
      setGoals([]);
      setFlashcards([]);
      setSelectedNoteId(null);
    }
  }, []);

  const handleResetData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    } else {
      localStorage.clear();
      setCourses([]);
      setEvents([]);
      setNotes([]);
      setGoals([]);
      setFlashcards([]);
      setSelectedNoteId(null);
      setConfirmReset(false);
    }
  };

  // Persistence effects
  useEffect(() => {
    localStorage.setItem("ns_courses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem("ns_events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem("ns_notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("ns_goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem("ns_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  // Check Gemini key on server load
  useEffect(() => {
    fetch("/api/gemini/config")
      .then((res) => res.json())
      .then((data) => {
        setApiConfigured(data.configured);
      })
      .catch(() => setApiConfigured(false));
  }, []);

  // GPA calculation helper
  const calculateCumulativeGpa = (coursesList: Course[]) => {
    let totalGradePoints = 0;
    let totalCredits = 0;

    coursesList.forEach((c) => {
      if (c.grade && GPA_SCALE[c.grade] !== undefined) {
        totalGradePoints += GPA_SCALE[c.grade] * c.creditHours;
        totalCredits += c.creditHours;
      }
    });

    return totalCredits > 0 ? totalGradePoints / totalCredits : 4.0;
  };

  const gpa = calculateCumulativeGpa(courses);

  // Route/Tab Transition Animation Config
  const tabVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: 10, transition: { duration: 0.15 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bento-bg text-bento-text-muted font-sans selection:bg-bento-primary/30 selection:text-white">
      {/* Dynamic top bar notifier for API Keys configuration */}
      {!apiConfigured && (
        <div className="bg-amber-950/80 border-b border-amber-500/20 text-amber-300 text-xs text-center py-2.5 px-4 flex items-center justify-center gap-1.5 font-semibold z-50">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>GEMINI_API_KEY is currently missing. AI features require adding your key in the Secrets panel.</span>
        </div>
      )}

      {/* Main Premium Application Navigation Header */}
      <header className="sticky top-0 z-40 bg-bento-bg/80 backdrop-blur-md border-b border-bento-secondary/20">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-bento-primary text-bento-bg rounded-xl shadow-[0_0_15px_rgba(102,252,241,0.35)]">
              <Sparkles className="w-5 h-5 fill-bento-bg/20" />
            </div>
            <div>
              <h1 id="app-logo" className="text-lg font-black tracking-tight text-white flex items-center">
                NovaScholar
                <span className="text-bento-primary text-[10px] font-mono ml-1.5 bg-bento-primary/10 border border-bento-primary/20 px-1 rounded-sm">v2.0</span>
              </h1>
              <span className="text-[10px] text-bento-secondary font-bold uppercase tracking-wider block">Integrated Study Suite</span>
            </div>
          </div>

          {/* Navigation Bar Desktop tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {[
              { id: "dashboard", label: "Dashboard", icon: BookOpen },
              { id: "courses", label: "Grade Tracker", icon: Award },
              { id: "notes", label: "Study Notes", icon: FileText },
              { id: "calendar", label: "Schedules", icon: CalendarIcon },
              { id: "ai-companion", label: "AI Study Suite", icon: Sparkles },
              { id: "goals", label: "Goal Roadmaps", icon: Target }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer border ${
                    isActive
                      ? "text-bento-primary bg-bento-card border-bento-primary/30 shadow-[0_0_12px_rgba(102,252,241,0.08)]"
                      : "text-bento-text-muted/70 hover:text-white hover:bg-bento-card/40 border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-bento-primary" : "text-bento-text-muted/65"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation tab container */}
        <div className="lg:hidden bg-bento-bg/95 border-t border-bento-secondary/15 px-2 py-1.5 overflow-x-auto flex gap-1.5 scrollbar-none scroll-smooth">
          {[
            { id: "dashboard", label: "Dashboard", icon: BookOpen },
            { id: "courses", label: "Grades", icon: Award },
            { id: "notes", label: "Notes", icon: FileText },
            { id: "calendar", label: "Calendar", icon: CalendarIcon },
            { id: "ai-companion", label: "AI Companion", icon: Sparkles },
            { id: "goals", label: "Roadmaps", icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border ${
                  isActive
                    ? "bg-bento-card text-bento-primary border-bento-primary/30"
                    : "text-bento-text-muted/60 border-transparent hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Core Viewport Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="outline-none h-full"
          >
            {activeTab === "dashboard" && (
              <DashboardView
                courses={courses}
                events={events}
                notes={notes}
                goals={goals}
                onNavigate={setActiveTab}
                onSelectNote={(nId) => {
                  setSelectedNoteId(nId);
                  setActiveTab("notes");
                }}
                gpa={gpa}
              />
            )}

            {activeTab === "courses" && (
              <GradeTrackerView
                courses={courses}
                onAddCourse={(newC) => setCourses((prev) => [...prev, newC])}
                onUpdateCourse={(updatedC) =>
                  setCourses((prev) => prev.map((c) => (c.id === updatedC.id ? updatedC : c)))
                }
                onRemoveCourse={(cId) => {
                  setCourses((prev) => prev.filter((c) => c.id !== cId));
                  setEvents((prev) => prev.filter((e) => e.courseId !== cId));
                  setNotes((prev) => prev.filter((n) => n.courseId !== cId));
                }}
                gpa={gpa}
              />
            )}

            {activeTab === "notes" && (
              <NotesEditorView
                notes={notes}
                courses={courses}
                onAddNote={(newN) => setNotes((prev) => [newN, ...prev])}
                onUpdateNote={(updatedN) =>
                  setNotes((prev) => prev.map((n) => (n.id === updatedN.id ? updatedN : n)))
                }
                onRemoveNote={(nId) => setNotes((prev) => prev.filter((n) => n.id !== nId))}
                selectedNoteId={selectedNoteId}
                setSelectedNoteId={setSelectedNoteId}
              />
            )}

            {activeTab === "calendar" && (
              <CalendarView
                events={events}
                courses={courses}
                onAddEvent={(newEv) => setEvents((prev) => [...prev, newEv])}
                onRemoveEvent={(evId) => setEvents((prev) => prev.filter((e) => e.id !== evId))}
              />
            )}

            {activeTab === "ai-companion" && (
              <AiCompanionView
                courses={courses}
                notes={notes}
                flashcards={flashcards}
                onAddFlashcards={(newCards) => setFlashcards((prev) => [...newCards, ...prev])}
                onUpdateFlashcardStrength={(fcId, str) =>
                  setFlashcards((prev) => prev.map((fc) => (fc.id === fcId ? { ...fc, strength: str } : fc)))
                }
                onAddNote={(newNote) => {
                  setNotes((prev) => [newNote, ...prev]);
                  setSelectedNoteId(newNote.id);
                  setActiveTab("notes");
                }}
              />
            )}

            {activeTab === "goals" && (
              <GoalRoadmapView
                goals={goals}
                onAddGoal={(newG) => setGoals((prev) => [...prev, newG])}
                onUpdateGoal={(updatedG) =>
                  setGoals((prev) => prev.map((g) => (g.id === updatedG.id ? updatedG : g)))
                }
                onRemoveGoal={(gId) => setGoals((prev) => prev.filter((g) => g.id !== gId))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sub-footer metadata branding */}
      <footer className="bg-bento-card/30 border-t border-bento-secondary/10 mt-12 py-6 text-center text-xs text-bento-text-muted/60">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>&copy; 2026 Novascholar Suite. Built for optimal academic execution.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetData}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                confirmReset
                  ? "bg-rose-950/40 border-rose-500/50 text-rose-300 animate-pulse"
                  : "bg-bento-bg/50 border-bento-secondary/20 text-bento-text-muted hover:text-white hover:border-bento-primary/30"
              }`}
            >
              {confirmReset ? "Click again to confirm Reset" : "Reset Workspace Data"}
            </button>
            <span className="text-bento-secondary/30">|</span>
            <span className="flex items-center gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 bg-bento-primary rounded-full animate-pulse"></span>
              <span>Powered by Mistral AI (mistral-small-2506)</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
