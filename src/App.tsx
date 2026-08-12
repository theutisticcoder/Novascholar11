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
  AlertCircle,
  Download,
  Upload,
  LogOut,
  User as UserIcon
} from "lucide-react";

import { Course, CalendarEvent, Note, Goal, Flashcard } from "./types";
import {
  DEFAULT_COURSES,
  DEFAULT_CALENDAR_EVENTS,
  DEFAULT_NOTES,
  DEFAULT_GOALS
} from "./data";
import { GPA_SCALE } from "./components/GradeTrackerView";

// Firebase integration
import { 
  auth, 
  db, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AuthView from "./components/AuthView";

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

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
  };
  const [apiConfigured, setApiConfigured] = useState<boolean>(true);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Listen to Auth State Change and restore saved session
  useEffect(() => {
    const savedActiveUser = localStorage.getItem("novascholar_active_user");
    if (savedActiveUser) {
      try {
        const parsed = JSON.parse(savedActiveUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error("Error parsing local active user", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const activeUser = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || user.email?.split("@")[0] || "Scholar"
        };
        setCurrentUser(activeUser);
        localStorage.setItem("novascholar_active_user", JSON.stringify(activeUser));
      } else if (!localStorage.getItem("novascholar_active_user")) {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    setAuthLoading(false);
    return () => unsubscribe();
  }, []);

  // Sync state from Firestore when user logs in or switches account
  useEffect(() => {
    if (!currentUser) return;

    async function loadUserData() {
      try {
        const userDocRef = doc(db, "users_data", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.courses) setCourses(data.courses);
          if (data.events) setEvents(data.events);
          if (data.notes) setNotes(data.notes);
          if (data.goals) setGoals(data.goals);
          if (data.flashcards) setFlashcards(data.flashcards);
          if (data.notes && data.notes.length > 0) {
            setSelectedNoteId(data.notes[0].id);
          }
        } else {
          // Initialize user data in Firestore
          await setDoc(userDocRef, {
            courses,
            events,
            notes,
            goals,
            flashcards,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error loading user data from Firestore:", err);
      }
    }

    loadUserData();
  }, [currentUser?.uid]);

  // Sync state to Firestore on change when logged in
  useEffect(() => {
    if (!currentUser) return;
    
    const delayDebounce = setTimeout(async () => {
      try {
        const userDocRef = doc(db, "users_data", currentUser.uid);
        await setDoc(userDocRef, {
          courses,
          events,
          notes,
          goals,
          flashcards,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error syncing data to Firestore:", err);
      }
    }, 1500); // 1.5s debounce to throttle firestore write rate

    return () => clearTimeout(delayDebounce);
  }, [courses, events, notes, goals, flashcards, currentUser?.uid]);

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

  const handleExportData = () => {
    try {
      const backupData = {
        version: "novascholar-v2.0",
        timestamp: new Date().toISOString(),
        courses,
        events,
        notes,
        goals,
        flashcards
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `novascholar-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setBackupMessage({ type: "success", text: "All workspace data successfully compiled and exported as JSON!" });
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setBackupMessage({ type: "error", text: "Failed to compile workspace data for export." });
      setTimeout(() => setBackupMessage(null), 5000);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json || typeof json !== "object") {
          throw new Error("Invalid backup file format.");
        }
        
        const importedCourses = Array.isArray(json.courses) ? json.courses : [];
        const importedEvents = Array.isArray(json.events) ? json.events : [];
        const importedNotes = Array.isArray(json.notes) ? json.notes : [];
        const importedGoals = Array.isArray(json.goals) ? json.goals : [];
        const importedFlashcards = Array.isArray(json.flashcards) ? json.flashcards : [];
        
        if (
          !Array.isArray(json.courses) &&
          !Array.isArray(json.events) &&
          !Array.isArray(json.notes) &&
          !Array.isArray(json.goals) &&
          !Array.isArray(json.flashcards)
        ) {
          throw new Error("File does not contain any valid NovaScholar data.");
        }
        
        setCourses(importedCourses);
        setEvents(importedEvents);
        setNotes(importedNotes);
        setGoals(importedGoals);
        setFlashcards(importedFlashcards);
        
        if (importedNotes.length > 0) {
          setSelectedNoteId(importedNotes[0].id);
        } else {
          setSelectedNoteId(null);
        }
        
        setBackupMessage({
          type: "success",
          text: `Backup restored successfully! Loaded ${importedCourses.length} courses, ${importedNotes.length} notes, ${importedEvents.length} events, and ${importedGoals.length} goals.`
        });
        setTimeout(() => setBackupMessage(null), 6000);
      } catch (err: any) {
        console.error(err);
        setBackupMessage({ type: "error", text: err.message || "Failed to parse backup. Ensure it is a valid backup JSON." });
        setTimeout(() => setBackupMessage(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bento-bg flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-bento-primary/10 border-t-bento-primary rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-bento-primary tracking-widest uppercase">Initializing Secure Workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bento-bg text-bento-text-muted font-sans selection:bg-bento-primary/30 selection:text-white">
      {/* Dynamic top bar notifier for API Keys configuration */}
      {!apiConfigured && (
        <div className="bg-amber-950/80 border-b border-amber-500/20 text-amber-300 text-xs text-center py-2.5 px-4 flex items-center justify-center gap-1.5 font-semibold z-50">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>GEMINI_API_KEY is currently missing. AI features require adding your key in the Secrets panel.</span>
        </div>
      )}

      {/* Dynamic top bar notifier for Backup Status */}
      {backupMessage && (
        <div className={`border-b text-xs text-center py-2.5 px-4 flex items-center justify-center gap-1.5 font-semibold z-50 ${
          backupMessage.type === "success" 
            ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300 animate-pulse" 
            : "bg-rose-950/80 border-rose-500/20 text-rose-300"
        }`}>
          {backupMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{backupMessage.text}</span>
          <button 
            onClick={() => setBackupMessage(null)} 
            className="ml-3 font-mono text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition text-white"
          >
            ✕
          </button>
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

          {/* Mobile Profile & Signout Quick Action */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 bg-bento-secondary/35 border border-bento-secondary/20 rounded-xl flex items-center justify-center text-bento-primary" title={currentUser?.displayName || "Scholar"}>
              <UserIcon className="w-4 h-4" />
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-rose-950/40 hover:text-rose-400 rounded-xl text-bento-text-muted/60 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

            <div className="h-6 w-[1px] bg-bento-secondary/25 mx-2" />

            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bento-secondary/10 hover:bg-bento-secondary/25 hover:text-white border border-bento-secondary/20 rounded-xl text-[10px] font-bold text-bento-text-muted transition cursor-pointer"
                title="Export all data at once to JSON backup file"
              >
                <Download className="w-3.5 h-3.5 text-bento-primary" />
                <span>Export Backup</span>
              </button>

              <label
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bento-secondary/10 hover:bg-bento-secondary/25 hover:text-white border border-bento-secondary/20 rounded-xl text-[10px] font-bold text-bento-text-muted transition cursor-pointer"
                title="Import all data at once from a JSON backup file"
              >
                <Upload className="w-3.5 h-3.5 text-bento-primary" />
                <span>Import Backup</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportData} 
                  className="hidden" 
                />
              </label>
            </div>

            <div className="h-6 w-[1px] bg-bento-secondary/25 mx-1" />

            {/* Profile Section */}
            <div className="flex items-center gap-2.5 ml-2 shrink-0">
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-bold text-white leading-none">
                  {currentUser?.displayName || "Scholar"}
                </span>
                <span className="text-[9px] font-medium text-bento-text-muted/50 leading-none mt-1">
                  {currentUser?.email}
                </span>
              </div>
              <div className="w-8 h-8 bg-bento-secondary/35 border border-bento-secondary/20 rounded-xl flex items-center justify-center text-bento-primary">
                <UserIcon className="w-4 h-4" />
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-rose-950/40 hover:text-rose-400 border border-transparent hover:border-rose-500/10 rounded-xl text-bento-text-muted/60 transition cursor-pointer"
                title="Sign Out of Workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
                onUpdateEvent={(updatedEv) => setEvents((prev) => prev.map((e) => e.id === updatedEv.id ? updatedEv : e))}
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
                onUpdateFlashcard={(updatedCard) =>
                  setFlashcards((prev) => prev.map((fc) => (fc.id === updatedCard.id ? updatedCard : fc)))
                }
                onRemoveFlashcard={(fcId) =>
                  setFlashcards((prev) => prev.filter((fc) => fc.id !== fcId))
                }
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleExportData}
              className="bg-bento-bg/50 border border-bento-secondary/20 text-bento-text-muted hover:text-white hover:border-bento-primary/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              title="Export all data at once to JSON backup file"
            >
              <Download className="w-3.5 h-3.5 text-bento-primary" />
              <span>Export All Data</span>
            </button>

            <label
              className="bg-bento-bg/50 border border-bento-secondary/20 text-bento-text-muted hover:text-white hover:border-bento-primary/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              title="Import all data at once from a JSON backup file"
            >
              <Upload className="w-3.5 h-3.5 text-bento-primary" />
              <span>Import All Data</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportData} 
                className="hidden" 
              />
            </label>

            <span className="text-bento-secondary/30 hidden md:inline">|</span>

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
