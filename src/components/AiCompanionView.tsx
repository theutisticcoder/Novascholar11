import React, { useState } from "react";
import { BookOpen, Layers, Award, Plus, Bookmark, FileText, CheckCircle2, Check, Trash2, Edit2 } from "lucide-react";
import { Course, Note, Quiz, QuizQuestion, Flashcard, StudyGuide, Curriculum, CurriculumLesson } from "../types";

interface AiCompanionViewProps {
  courses: Course[];
  notes: Note[];
  flashcards: Flashcard[];
  onAddFlashcards: (cards: Flashcard[]) => void;
  onUpdateFlashcardStrength: (id: string, strength: "new" | "learning" | "mastered") => void;
  onAddNote?: (note: Note) => void;
  onUpdateFlashcard?: (card: Flashcard) => void;
  onRemoveFlashcard?: (id: string) => void;
}

export default function AiCompanionView({
  courses,
  notes,
  flashcards,
  onAddFlashcards,
  onUpdateFlashcardStrength,
  onAddNote,
  onUpdateFlashcard,
  onRemoveFlashcard
}: AiCompanionViewProps) {
  // Config selection states
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "");
  const [activeMode, setActiveMode] = useState<"curriculum" | "flashcards" | "quiz" | "guide">("curriculum");

  // Generated / Local Active Deck Outputs
  const [generatedGuide, setGeneratedGuide] = useState<StudyGuide | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);

  // Active Quiz Running State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  // Active Flashcards Deck State
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Manual Flashcard Modal State
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  // Curriculum Studio States
  const [generatedCurriculums, setGeneratedCurriculums] = useState<{ [courseId: string]: Curriculum }>(() => {
    const saved = localStorage.getItem("ns_generated_curriculums");
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error reading saved curriculums:", e);
      return {};
    }
  });

  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonExplanation, setNewLessonExplanation] = useState("");

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseNotes = notes.filter((n) => n.courseId === selectedCourseId);
  const courseFlashcards = flashcards.filter((f) => f.courseId === selectedCourseId);

  // 1. Create Flashcards from Notes Cues
  const handleGenerateFlashcardsFromNotes = () => {
    const extractedCards: Flashcard[] = [];

    courseNotes.forEach((note) => {
      if (note.cues && note.cues.length > 0) {
        note.cues.forEach((c) => {
          extractedCards.push({
            id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            courseId: selectedCourseId,
            front: c.cue,
            back: note.title,
            strength: "new",
            lastReviewed: new Date().toISOString().split("T")[0]
          });
        });
      }
    });

    if (extractedCards.length === 0) {
      extractedCards.push(
        {
          id: `f-${Date.now()}-1`,
          courseId: selectedCourseId,
          front: `Core Topic - ${activeCourse?.name || "Subject"}`,
          back: "Key definition and main principles derived from your notes.",
          strength: "new",
          lastReviewed: new Date().toISOString().split("T")[0]
        },
        {
          id: `f-${Date.now()}-2`,
          courseId: selectedCourseId,
          front: "Key Concept & Formula",
          back: "Mathematical expression or theoretical summary.",
          strength: "learning",
          lastReviewed: new Date().toISOString().split("T")[0]
        }
      );
    }

    onAddFlashcards(extractedCards);
    setActiveCardIndex(0);
    setIsFlipped(false);
  };

  // Add Manual Flashcard
  const handleAddManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim()) return;

    const newCard: Flashcard = {
      id: `f-${Date.now()}`,
      courseId: selectedCourseId,
      front: newCardFront,
      back: newCardBack,
      strength: "new",
      lastReviewed: new Date().toISOString().split("T")[0]
    };

    onAddFlashcards([newCard]);
    setNewCardFront("");
    setNewCardBack("");
    setShowAddCardModal(false);
  };

  // 2. Build Practice Quiz from Notes
  const handleBuildQuizFromNotes = () => {
    const questions: QuizQuestion[] = [];

    courseNotes.forEach((note, idx) => {
      if (note.cues && note.cues.length > 0) {
        note.cues.slice(0, 3).forEach((c, qIdx) => {
          questions.push({
            id: `q-${idx}-${qIdx}`,
            question: `In ${note.title}: What is meant by "${c.cue}"?`,
            options: [
              "Primary concept definition from lecture notes",
              "Alternative unverified hypothesis",
              "Secondary experimental variable",
              "Irrelevant course statement"
            ],
            answer: 0,
            explanation: `Derived directly from Cornell note cue: "${c.cue}".`
          });
        });
      }
    });

    if (questions.length === 0) {
      questions.push({
        id: "q-default-1",
        question: `Sample Quiz Question for ${activeCourse?.name || "Subject"}`,
        options: ["Correct Option A", "Incorrect Option B", "Incorrect Option C", "Incorrect Option D"],
        answer: 0,
        explanation: "This is the correct answer based on course guidelines."
      });
    }

    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      courseId: selectedCourseId,
      title: `${activeCourse?.name || "Course"} Notes Practice Test`,
      questions
    };

    setGeneratedQuiz(newQuiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setQuizScore(0);
    setQuizComplete(false);
  };

  // 3. Build Study Guide from Notes
  const handleBuildGuideFromNotes = () => {
    const summaryList = courseNotes.map((n) => n.summary).filter(Boolean);
    const extractedTerms = courseNotes.flatMap((n) =>
      n.cues ? n.cues.map((c) => ({ term: c.cue, definition: `Key term from note: ${n.title}` })) : []
    );

    const guide: StudyGuide = {
      id: `guide-${Date.now()}`,
      courseId: selectedCourseId,
      title: `${activeCourse?.name || "Course"} Study Guide`,
      content: courseNotes.map((n) => `### ${n.title}\n${n.content}`).join("\n\n"),
      keyTerms: extractedTerms.length > 0 ? extractedTerms : [{ term: "Core Principle", definition: "Main conceptual framework for the subject." }],
      summaryPoints: summaryList.length > 0 ? (summaryList as string[]) : ["Review key formulas, lecture definitions, and Cornell note cues."],
      dateGenerated: new Date().toISOString().split("T")[0]
    };

    setGeneratedGuide(guide);
  };

  // 4. Build/Manage Curriculum
  const activeCurriculum: Curriculum = generatedCurriculums[selectedCourseId] || {
    id: `curr-${selectedCourseId}`,
    courseId: selectedCourseId,
    curriculumTitle: `${activeCourse?.name || "Course"} Syllabus Curriculum`,
    curriculumOverview: "Structured learning roadmap and topic outline.",
    lessons: courseNotes.map((n, i) => ({
      id: `les-${i}`,
      title: n.title,
      duration: "30 mins",
      explanation: n.summary || "Topic overview extracted from course notes."
    }))
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    const newLesson: CurriculumLesson = {
      id: `les-${Date.now()}`,
      title: newLessonTitle,
      duration: "30 mins",
      explanation: newLessonExplanation || "Custom lesson topic"
    };

    const updatedLessons = [...(activeCurriculum.lessons || []), newLesson];
    const updatedCurr = { ...activeCurriculum, lessons: updatedLessons };

    setGeneratedCurriculums((prev) => ({
      ...prev,
      [selectedCourseId]: updatedCurr
    }));

    setNewLessonTitle("");
    setNewLessonExplanation("");
    setShowAddLessonModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-bento-card border border-bento-secondary/20 p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bento-secondary/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-bento-primary" />
              <h2 className="text-xl font-black text-white">Academic Study Suite & Practice Deck</h2>
            </div>
            <p className="text-xs text-bento-text-muted">
              Organize syllabus curriculums, review active recall flashcards, take practice quizzes, and build study guides
            </p>
          </div>

          {/* Course Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-bento-secondary font-bold uppercase">Course:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-bento-bg border border-bento-secondary/30 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-bento-primary"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workspace Nav Tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: "curriculum", label: "Syllabus Curriculum", icon: BookOpen },
            { id: "flashcards", label: `Flashcards (${courseFlashcards.length})`, icon: Layers },
            { id: "quiz", label: "Practice Quizzes", icon: Award },
            { id: "guide", label: "Study Guides", icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeMode === tab.id
                    ? "bg-bento-primary text-bento-bg shadow-sm"
                    : "bg-bento-bg text-bento-text-muted hover:text-white border border-bento-secondary/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CURRICULUM WORKSPACE */}
      {activeMode === "curriculum" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-bento-primary" />
              <span>{activeCourse?.name} Syllabus Roadmap</span>
            </h3>
            <button
              onClick={() => setShowAddLessonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bento-primary text-bento-bg rounded-xl text-xs font-bold hover:bg-bento-primary/90 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lesson Topic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lesson Topic Directory */}
            <div className="lg:col-span-5 bg-bento-card border border-bento-secondary/15 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-bento-secondary uppercase tracking-wider block">
                Topics & Modules ({activeCurriculum.lessons?.length || 0})
              </span>

              {(!activeCurriculum.lessons || activeCurriculum.lessons.length === 0) ? (
                <div className="text-center py-8 text-xs text-bento-text-muted">
                  No lesson topics defined yet. Click "Add Lesson Topic" to create one.
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {activeCurriculum.lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id || idx}
                      onClick={() => setActiveLessonIndex(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        activeLessonIndex === idx
                          ? "bg-bento-primary/15 border-bento-primary text-white"
                          : "bg-bento-bg border-bento-secondary/15 text-bento-text-muted hover:text-white"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{lesson.title}</span>
                        <span className="text-[10px] text-bento-secondary block">{lesson.duration || "30 mins"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lesson Detail Pane */}
            <div className="lg:col-span-7 bg-bento-card border border-bento-secondary/15 rounded-2xl p-5 space-y-4">
              {activeCurriculum.lessons && activeCurriculum.lessons[activeLessonIndex] ? (
                <>
                  <div className="border-b border-bento-secondary/15 pb-3">
                    <h4 className="text-base font-extrabold text-white">
                      {activeCurriculum.lessons[activeLessonIndex].title}
                    </h4>
                    <p className="text-xs text-bento-text-muted mt-2 leading-relaxed">
                      {activeCurriculum.lessons[activeLessonIndex].explanation || "Module overview and subject details."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-xs text-bento-text-muted">
                  Select a topic module from the directory to view details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. FLASHCARDS WORKSPACE */}
      {activeMode === "flashcards" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-bento-primary" />
              <span>Active Recall Flashcard Deck ({courseFlashcards.length})</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateFlashcardsFromNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bento-bg hover:bg-bento-card border border-bento-secondary/20 text-xs font-bold text-white rounded-xl transition cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-bento-primary" />
                <span>Extract Cards from Notes</span>
              </button>
              <button
                onClick={() => setShowAddCardModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bento-primary text-bento-bg rounded-xl text-xs font-bold hover:bg-bento-primary/90 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Flashcard</span>
              </button>
            </div>
          </div>

          {courseFlashcards.length === 0 ? (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center space-y-4">
              <Layers className="w-12 h-12 text-bento-secondary mx-auto opacity-50" />
              <div>
                <h4 className="text-sm font-bold text-white">No Flashcards in Deck</h4>
                <p className="text-xs text-bento-text-muted mt-1">
                  Click "Extract Cards from Notes" to build flashcards from your Cornell cues or create custom ones manually.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Flip Card Stage */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="bg-bento-card border border-bento-secondary/20 hover:border-bento-primary/40 rounded-3xl p-8 min-h-[220px] flex flex-col justify-between text-center cursor-pointer transition shadow-lg relative overflow-hidden"
              >
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-bento-secondary">
                  <span>Card {activeCardIndex + 1} of {courseFlashcards.length}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    courseFlashcards[activeCardIndex]?.strength === "mastered"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {courseFlashcards[activeCardIndex]?.strength || "new"}
                  </span>
                </div>

                <div className="my-6">
                  <span className="text-[10px] text-bento-primary uppercase tracking-widest font-bold block mb-2">
                    {isFlipped ? "ANSWER / EXPLANATION" : "QUESTION / PROMPT (Click to Flip)"}
                  </span>
                  <p className="text-base md:text-lg font-bold text-white leading-relaxed">
                    {isFlipped
                      ? courseFlashcards[activeCardIndex]?.back
                      : courseFlashcards[activeCardIndex]?.front}
                  </p>
                </div>

                <div className="text-[11px] text-bento-text-muted">
                  Click card to flip • Use controls below to mark recall strength
                </div>
              </div>

              {/* Navigation & Strength Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeCardIndex === 0}
                    onClick={() => { setActiveCardIndex((prev) => Math.max(0, prev - 1)); setIsFlipped(false); }}
                    className="px-3.5 py-2 bg-bento-card border border-bento-secondary/20 rounded-xl text-xs font-bold text-white disabled:opacity-30 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={activeCardIndex === courseFlashcards.length - 1}
                    onClick={() => { setActiveCardIndex((prev) => Math.min(courseFlashcards.length - 1, prev + 1)); setIsFlipped(false); }}
                    className="px-3.5 py-2 bg-bento-card border border-bento-secondary/20 rounded-xl text-xs font-bold text-white disabled:opacity-30 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-bento-secondary font-bold">Mark Recall:</span>
                  <button
                    onClick={() => onUpdateFlashcardStrength(courseFlashcards[activeCardIndex].id, "learning")}
                    className="px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Still Learning
                  </button>
                  <button
                    onClick={() => onUpdateFlashcardStrength(courseFlashcards[activeCardIndex].id, "mastered")}
                    className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Mastered ✓
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PRACTICE QUIZZES WORKSPACE */}
      {activeMode === "quiz" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-bento-primary" />
              <span>Practice Quiz Studio</span>
            </h3>
            <button
              onClick={handleBuildQuizFromNotes}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-bento-primary text-bento-bg rounded-xl text-xs font-bold hover:bg-bento-primary/90 transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Generate Quiz Deck from Notes</span>
            </button>
          </div>

          {!generatedQuiz ? (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center space-y-4">
              <Award className="w-12 h-12 text-bento-secondary mx-auto opacity-50" />
              <div>
                <h4 className="text-sm font-bold text-white">No Active Quiz Deck</h4>
                <p className="text-xs text-bento-text-muted mt-1">
                  Click "Generate Quiz Deck from Notes" to test your knowledge with interactive multiple-choice questions.
                </p>
              </div>
            </div>
          ) : quizComplete ? (
            <div className="bg-bento-card border border-bento-secondary/20 rounded-3xl p-8 text-center space-y-4">
              <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Quiz Complete!</h4>
                <p className="text-sm text-bento-text-muted mt-1">
                  Final Score: <span className="text-bento-primary font-bold">{quizScore} / {generatedQuiz.questions.length}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedAnswerIndex(null);
                  setQuizScore(0);
                  setQuizComplete(false);
                }}
                className="px-6 py-2.5 bg-bento-primary text-bento-bg font-bold rounded-xl text-xs hover:bg-bento-primary/90 transition cursor-pointer"
              >
                Retry Quiz
              </button>
            </div>
          ) : (
            <div className="bg-bento-card border border-bento-secondary/20 rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center text-xs font-bold text-bento-secondary border-b border-bento-secondary/15 pb-3">
                <span>Question {currentQuestionIndex + 1} of {generatedQuiz.questions.length}</span>
                <span>Score: {quizScore}</span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white leading-snug">
                  {generatedQuiz.questions[currentQuestionIndex]?.question}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {generatedQuiz.questions[currentQuestionIndex]?.options.map((option, oIdx) => {
                    const isSelected = selectedAnswerIndex === oIdx;
                    const isCorrect = generatedQuiz.questions[currentQuestionIndex]?.answer === oIdx;

                    return (
                      <button
                        key={oIdx}
                        disabled={selectedAnswerIndex !== null}
                        onClick={() => {
                          setSelectedAnswerIndex(oIdx);
                          if (isCorrect) setQuizScore((prev) => prev + 1);
                        }}
                        className={`p-4 rounded-2xl border text-left text-xs font-semibold transition cursor-pointer ${
                          selectedAnswerIndex === null
                            ? "bg-bento-bg border-bento-secondary/20 text-white hover:border-bento-primary"
                            : isCorrect
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                            : isSelected
                            ? "bg-rose-500/20 border-rose-500 text-rose-300"
                            : "bg-bento-bg border-bento-secondary/15 text-bento-text-muted opacity-50"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedAnswerIndex !== null && (
                <div className="p-4 bg-bento-bg border border-bento-secondary/20 rounded-2xl space-y-2">
                  <p className="text-xs text-bento-text-muted">
                    <strong className="text-bento-primary">Explanation:</strong>{" "}
                    {generatedQuiz.questions[currentQuestionIndex]?.explanation}
                  </p>
                  <button
                    onClick={() => {
                      if (currentQuestionIndex + 1 < generatedQuiz.questions.length) {
                        setCurrentQuestionIndex((prev) => prev + 1);
                        setSelectedAnswerIndex(null);
                      } else {
                        setQuizComplete(true);
                      }
                    }}
                    className="px-4 py-2 bg-bento-primary text-bento-bg font-bold rounded-xl text-xs hover:bg-bento-primary/90 transition cursor-pointer"
                  >
                    {currentQuestionIndex + 1 < generatedQuiz.questions.length ? "Next Question →" : "Finish Quiz ✓"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. STUDY GUIDES WORKSPACE */}
      {activeMode === "guide" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-bento-primary" />
              <span>Comprehensive Study Guides</span>
            </h3>
            <button
              onClick={handleBuildGuideFromNotes}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-bento-primary text-bento-bg rounded-xl text-xs font-bold hover:bg-bento-primary/90 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Compile Study Guide from Notes</span>
            </button>
          </div>

          {!generatedGuide ? (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center space-y-4">
              <FileText className="w-12 h-12 text-bento-secondary mx-auto opacity-50" />
              <div>
                <h4 className="text-sm font-bold text-white">No Compiled Study Guide</h4>
                <p className="text-xs text-bento-text-muted mt-1">
                  Click "Compile Study Guide from Notes" to aggregate all Cornell notes, summaries, and key definitions into a printable study reference.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-bento-card border border-bento-secondary/20 rounded-3xl p-6 space-y-6">
              <div className="border-b border-bento-secondary/15 pb-4">
                <h3 className="text-lg font-black text-white">{generatedGuide.title}</h3>
                <span className="text-[10px] text-bento-secondary">Generated on {generatedGuide.dateGenerated}</span>
              </div>

              {generatedGuide.keyTerms && generatedGuide.keyTerms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-bento-secondary uppercase">Key Term Glossary & Cues</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {generatedGuide.keyTerms.map((kt, i) => (
                      <div key={i} className="p-3 bg-bento-bg border border-bento-secondary/15 rounded-xl">
                        <span className="text-xs font-bold text-bento-primary block">{kt.term}</span>
                        <span className="text-xs text-bento-text-muted block mt-1">{kt.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedGuide.summaryPoints && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-bento-secondary uppercase">Core Summaries</h4>
                  <div className="space-y-2">
                    {generatedGuide.summaryPoints.map((sp, i) => (
                      <p key={i} className="p-3 bg-bento-bg border border-bento-secondary/15 rounded-xl text-xs text-white leading-relaxed">
                        {sp}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Manual Flashcard */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bento-card border border-bento-secondary/30 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h4 className="text-sm font-bold text-white">Add New Flashcard</h4>
            <form onSubmit={handleAddManualCard} className="space-y-3">
              <div>
                <label className="text-xs text-bento-secondary block mb-1">Front (Question / Term)</label>
                <input
                  type="text"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  className="w-full bg-bento-bg border border-bento-secondary/20 rounded-xl p-2.5 text-xs text-white"
                  placeholder="e.g. What is the derivative of sin(x)?"
                />
              </div>
              <div>
                <label className="text-xs text-bento-secondary block mb-1">Back (Answer / Definition)</label>
                <textarea
                  rows={3}
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  className="w-full bg-bento-bg border border-bento-secondary/20 rounded-xl p-2.5 text-xs text-white resize-none"
                  placeholder="e.g. cos(x)"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 bg-bento-bg text-bento-text-muted rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary text-bento-bg font-bold rounded-xl text-xs cursor-pointer"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Lesson Topic */}
      {showAddLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bento-card border border-bento-secondary/30 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h4 className="text-sm font-bold text-white">Add Lesson Topic Module</h4>
            <form onSubmit={handleAddLesson} className="space-y-3">
              <div>
                <label className="text-xs text-bento-secondary block mb-1">Lesson Title</label>
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="w-full bg-bento-bg border border-bento-secondary/20 rounded-xl p-2.5 text-xs text-white"
                  placeholder="e.g. Unit 3: Linear Algebra Transformations"
                />
              </div>
              <div>
                <label className="text-xs text-bento-secondary block mb-1">Overview Summary</label>
                <textarea
                  rows={3}
                  value={newLessonExplanation}
                  onChange={(e) => setNewLessonExplanation(e.target.value)}
                  className="w-full bg-bento-bg border border-bento-secondary/20 rounded-xl p-2.5 text-xs text-white resize-none"
                  placeholder="e.g. Matrix transformations, eigenvalues, and vectors."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-4 py-2 bg-bento-bg text-bento-text-muted rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary text-bento-bg font-bold rounded-xl text-xs cursor-pointer"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
