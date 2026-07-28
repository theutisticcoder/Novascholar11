import React, { useState } from "react";
import { Sparkles, Loader2, Play, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowRight, HelpCircle, Check, BookOpen, Layers } from "lucide-react";
import { Course, Note, Quiz, QuizQuestion, Flashcard, StudyGuide } from "../types";
import LatexRenderer from "./LatexRenderer";

interface AiCompanionViewProps {
  courses: Course[];
  notes: Note[];
  flashcards: Flashcard[];
  onAddFlashcards: (cards: Flashcard[]) => void;
  onUpdateFlashcardStrength: (id: string, strength: "new" | "learning" | "mastered") => void;
}

export default function AiCompanionView({
  courses,
  notes,
  flashcards,
  onAddFlashcards,
  onUpdateFlashcardStrength
}: AiCompanionViewProps) {
  // Config selection states
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "");
  const [activeMode, setActiveMode] = useState<"guide" | "quiz" | "flashcards">("guide");
  const [itemCount, setItemCount] = useState<number>(5);

  // Loading & State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated outputs
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

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeCourseNotes = notes.filter((n) => n.courseId === selectedCourseId);

  // Combine note texts for context
  const getNotesContextText = () => {
    if (activeCourseNotes.length === 0) return "";
    return activeCourseNotes.map((n) => `Note Title: ${n.title}\nContent:\n${n.content}\n${n.summary ? `Summary:\n${n.summary}` : ""}`).join("\n\n");
  };

  const handleGenerateStudyGuide = async () => {
    if (!activeCourse) return;
    setLoading(true);
    setError(null);
    setGeneratedGuide(null);

    try {
      const response = await fetch("/api/gemini/study-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeCourse.name,
          notesContent: getNotesContextText()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate study guide.");
      }

      const data = await response.json();
      const guide: StudyGuide = {
        id: `g-${Date.now()}`,
        title: data.title || `Comprehensive Guide: ${activeCourse.name}`,
        courseId: selectedCourseId,
        content: data.content || "",
        summaryPoints: data.summaryPoints || [],
        keyTerms: data.keyTerms || [],
        dateGenerated: new Date().toISOString().split("T")[0]
      };

      setGeneratedGuide(guide);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred with Mistral AI study guide generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeCourse) return;
    setLoading(true);
    setError(null);
    setGeneratedQuiz(null);
    setQuizComplete(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setQuizScore(0);

    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeCourse.name,
          notesContent: getNotesContextText(),
          count: itemCount
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate quiz questions.");
      }

      const data = await response.json();
      const quiz: Quiz = {
        id: `q-${Date.now()}`,
        title: data.title || `AI Assessment: ${activeCourse.name}`,
        courseId: selectedCourseId,
        questions: data.questions || []
      };

      setGeneratedQuiz(quiz);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred with Mistral AI quiz generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!activeCourse) return;
    setLoading(true);
    setError(null);
    setActiveCardIndex(0);
    setIsFlipped(false);

    try {
      const response = await fetch("/api/gemini/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeCourse.name,
          notesContent: getNotesContextText(),
          count: itemCount
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate flashcards.");
      }

      const data = await response.json();
      const cards: Flashcard[] = (data.flashcards || []).map((c: any, index: number) => ({
        id: `fc-${Date.now()}-${index}`,
        front: c.front,
        back: c.back,
        courseId: selectedCourseId,
        strength: "new"
      }));

      onAddFlashcards(cards);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred with Mistral AI flashcards generation.");
    } finally {
      setLoading(false);
    }
  };

  // Quiz interactive runner operations
  const handleSelectOption = (optIndex: number) => {
    if (selectedAnswerIndex !== null) return; // already answered
    setSelectedAnswerIndex(optIndex);

    const question = generatedQuiz?.questions[currentQuestionIndex];
    if (question && optIndex === question.answer) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (!generatedQuiz) return;
    if (currentQuestionIndex + 1 < generatedQuiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswerIndex(null);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizComplete(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setQuizScore(0);
  };

  // Flashcards deck navigation
  const courseCards = flashcards.filter((fc) => fc.courseId === selectedCourseId);

  const handleSetCardStrength = (strength: "new" | "learning" | "mastered") => {
    const card = courseCards[activeCardIndex];
    if (!card) return;
    onUpdateCardStrength(card.id, strength);

    // Proceed to next card if available
    setIsFlipped(false);
    setTimeout(() => {
      if (activeCardIndex + 1 < courseCards.length) {
        setActiveCardIndex((prev) => prev + 1);
      } else {
        setActiveCardIndex(0); // wrap around
      }
    }, 200);
  };

  const onUpdateCardStrength = (id: string, strength: "new" | "learning" | "mastered") => {
    onUpdateFlashcardStrength(id, strength);
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Panel */}
      <div className="bg-bento-card border border-bento-secondary/15 p-5 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-bento-primary">
            <Sparkles className="w-5 h-5 text-bento-primary" />
            <span className="font-bold text-sm">Study Engine:</span>
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white text-xs focus:border-bento-primary/60 focus:outline-none cursor-pointer font-bold"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-bento-bg text-white">{c.code} - {c.name}</option>
            ))}
          </select>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-bento-bg border border-bento-secondary/10 p-1 rounded-xl text-xs">
            <button
              onClick={() => {
                setActiveMode("guide");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeMode === "guide" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:text-white"
              }`}
            >
              Study Guide
            </button>
            <button
              onClick={() => {
                setActiveMode("quiz");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeMode === "quiz" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:text-white"
              }`}
            >
              Interactive Quiz
            </button>
            <button
              onClick={() => {
                setActiveMode("flashcards");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeMode === "flashcards" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:text-white"
              }`}
            >
              Active Flashcards
            </button>
          </div>

          {/* Item count select (only for Quiz & Flashcards) */}
          {activeMode !== "guide" && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-bento-text-muted font-bold">Count:</span>
              <select
                value={itemCount}
                onChange={(e) => setItemCount(Number(e.target.value))}
                className="border border-bento-secondary/20 bg-bento-bg rounded-lg px-2 py-1 text-white cursor-pointer font-bold focus:outline-none focus:border-bento-primary/55"
              >
                <option value={4} className="bg-bento-bg text-white">4 items</option>
                <option value={5} className="bg-bento-bg text-white">5 items</option>
                <option value={8} className="bg-bento-bg text-white">8 items</option>
                <option value={12} className="bg-bento-bg text-white">12 items</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={
              activeMode === "guide"
                ? handleGenerateStudyGuide
                : activeMode === "quiz"
                ? handleGenerateQuiz
                : handleGenerateFlashcards
            }
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl text-xs font-bold transition cursor-pointer shadow-[0_0_15px_rgba(102,252,241,0.25)] border border-bento-primary/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-bento-bg" />
                <span>Generating AI deck...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-bento-bg fill-bento-bg/20" />
                <span>
                  {activeMode === "guide"
                    ? "Generate Guide"
                    : activeMode === "quiz"
                    ? "Generate Live Quiz"
                    : "Generate Flashcards"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Loading Block Screen */}
      {loading && (
        <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center shadow-md space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-bento-primary mx-auto" />
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-white">Compiling Course Syllabi and Lectures...</h3>
            <p className="text-xs text-bento-text-muted/80 mt-1.5 leading-relaxed">
              We are utilizing Mistral AI (mistral-small-2506) to parse through your {activeCourseNotes.length} active notes, extracting key definitions, compiling LaTeX equations, and structuring active-recall questions. Please wait.
            </p>
          </div>
        </div>
      )}

      {/* MODE 1: STUDY GUIDE DISPLAY VIEW */}
      {!loading && activeMode === "guide" && generatedGuide && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* Main Study Guide content (Left 8 cols) */}
          <div className="lg:col-span-8 bg-bento-card border border-bento-secondary/15 p-6 rounded-3xl shadow-md space-y-4">
            <h2 className="text-xl font-extrabold text-white border-b border-bento-secondary/10 pb-3">
              {generatedGuide.title}
            </h2>
            <div className="prose prose-sm max-w-none">
              <LatexRenderer text={generatedGuide.content} className="text-sm text-bento-text-muted leading-relaxed font-sans" />
            </div>
          </div>

          {/* Summary & Glossary Sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Key Takeaways */}
            <div className="bg-bento-bg border border-bento-secondary/20 text-white rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-bento-primary uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-bento-primary" />
                <span>Key Learning Outcomes</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-bento-text-muted">
                {generatedGuide.summaryPoints.map((pt, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-bento-primary font-bold">0{i+1}.</span>
                    <span className="leading-relaxed font-medium">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Glossary definitions */}
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-bento-primary uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-bento-primary" />
                <span>Technical Glossary</span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 divide-y divide-bento-secondary/10">
                {generatedGuide.keyTerms.map((term, i) => (
                  <div key={i} className="pt-2.5 first:pt-0">
                    <span className="text-xs font-bold text-white block">{term.term}</span>
                    <p className="text-[11px] text-bento-text-muted mt-0.5 leading-relaxed font-medium">{term.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: INTERACTIVE QUIZ PRACTICE VIEW */}
      {!loading && activeMode === "quiz" && generatedQuiz && (
        <div className="max-w-2xl mx-auto bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-md animate-fade-in">
          {!quizComplete ? (
            <div>
              {/* Quiz active header progress */}
              <div className="flex items-center justify-between pb-3 border-b border-bento-secondary/10 mb-6 text-xs text-bento-secondary font-bold">
                <span>QUESTION {currentQuestionIndex + 1} OF {generatedQuiz.questions.length}</span>
                <span className="bg-bento-primary/10 border border-bento-primary/25 text-bento-primary px-3 py-1 rounded-xl">SCORE: {quizScore}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-bento-bg h-1.5 rounded-full mb-6 overflow-hidden">
                <div
                  className="bg-bento-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / generatedQuiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Quiz question card */}
              <div className="space-y-6">
                <div className="flex gap-3">
                  <HelpCircle className="w-6 h-6 text-bento-primary shrink-0 mt-0.5" />
                  <LatexRenderer text={generatedQuiz.questions[currentQuestionIndex].question} className="text-base font-extrabold text-white" />
                </div>

                {/* Multiple choice selections */}
                <div className="space-y-2">
                  {generatedQuiz.questions[currentQuestionIndex].options.map((opt, oIndex) => {
                    const isAnswered = selectedAnswerIndex !== null;
                    const isCorrectOption = oIndex === generatedQuiz.questions[currentQuestionIndex].answer;
                    const isSelectedOption = oIndex === selectedAnswerIndex;

                    let optionStyle = "border-bento-secondary/20 hover:border-bento-primary/45 bg-bento-bg hover:bg-bento-bg/75 text-white";
                    let iconNode = null;

                    if (isAnswered) {
                      if (isCorrectOption) {
                        optionStyle = "border-emerald-500 bg-emerald-950/20 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.1)]";
                        iconNode = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                      } else if (isSelectedOption) {
                        optionStyle = "border-rose-500 bg-rose-950/20 text-rose-300 font-bold shadow-[0_0_12px_rgba(244,63,94,0.1)]";
                        iconNode = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
                      } else {
                        optionStyle = "border-bento-secondary/5 bg-bento-bg/25 opacity-40";
                      }
                    }

                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleSelectOption(oIndex)}
                        disabled={isAnswered}
                        className={`w-full text-left p-3.5 border rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 transition cursor-pointer ${optionStyle}`}
                      >
                        <LatexRenderer text={opt} inline={true} className="leading-tight flex-1" />
                        {iconNode}
                      </button>
                    );
                  })}
                </div>

                {/* Educational Explanation Reveal */}
                {selectedAnswerIndex !== null && (
                  <div className="p-4 bg-bento-bg border border-bento-secondary/15 rounded-2xl text-xs leading-relaxed animate-fade-in space-y-2">
                    <span className="font-bold text-bento-primary block">AI Rationale Explanation:</span>
                    <LatexRenderer text={generatedQuiz.questions[currentQuestionIndex].explanation} className="text-bento-text-muted leading-relaxed font-sans" />
                  </div>
                )}

                {/* Next controller */}
                {selectedAnswerIndex !== null && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleNextQuizQuestion}
                      className="flex items-center gap-1 px-5 py-2.5 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-extrabold transition border border-bento-primary/20 cursor-pointer shadow-[0_0_12px_rgba(102,252,241,0.2)]"
                    >
                      <span>
                        {currentQuestionIndex + 1 === generatedQuiz.questions.length ? "Finish Quiz" : "Next Question"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed Scorecard Summary */
            <div className="text-center space-y-6 py-6 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-lg font-extrabold text-white">Quiz Assessment Completed!</h3>
                <p className="text-xs text-bento-text-muted mt-1.5">Practice and recall improves semantic memory consolidation.</p>
              </div>

              {/* Score visual metric */}
              <div className="bg-bento-bg border border-bento-secondary/10 p-6 rounded-3xl max-w-sm mx-auto">
                <span className="text-xs font-bold text-bento-secondary block uppercase tracking-wider">Final Grade Score</span>
                <span className="text-4xl font-black text-white block mt-1">
                  {((quizScore / generatedQuiz.questions.length) * 100).toFixed(0)}%
                </span>
                <span className="text-xs font-bold text-bento-primary mt-1.5 block">
                  {quizScore} of {generatedQuiz.questions.length} Correct Answers
                </span>
              </div>

              <div className="flex justify-center gap-2 pt-4">
                <button
                  onClick={handleRestartQuiz}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-bento-card hover:bg-bento-card/85 border border-bento-secondary/20 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-bento-secondary" />
                  <span>Retake Quiz</span>
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  className="flex items-center gap-1 px-4.5 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg text-xs font-bold rounded-xl transition cursor-pointer border border-bento-primary/20 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate New Quiz</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: ACTIVE FLASHCARDS DECK VIEW */}
      {!loading && activeMode === "flashcards" && (
        <div className="max-w-md mx-auto space-y-6">
          {courseCards.length === 0 ? (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-10 text-center text-bento-text-muted shadow-sm space-y-2">
              <Layers className="w-10 h-10 text-bento-secondary/35 mx-auto" />
              <p className="text-sm font-semibold">No flashcards loaded for this subject.</p>
              <p className="text-xs text-bento-text-muted/80">Click Generate Flashcards above to compile active recall keys.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Progress and card tracker header */}
              <div className="flex items-center justify-between text-xs text-bento-secondary font-bold">
                <span>CARD {activeCardIndex + 1} OF {courseCards.length}</span>
                <span className="uppercase bg-bento-bg border border-bento-secondary/25 text-bento-primary px-3 py-1 rounded-xl text-[9px] tracking-wide font-extrabold">
                  Strength: {courseCards[activeCardIndex].strength}
                </span>
              </div>

              {/* CARD FLIPCONTAINER WITH CSS 3D TRANSFORMS */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="h-64 cursor-pointer relative select-none w-full perspective"
              >
                <div
                  className="w-full h-full duration-500 preserve-3d absolute rounded-3xl"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                  }}
                >
                  {/* Front Face Card */}
                  <div className="backface-hidden absolute inset-0 bg-bento-card border border-bento-secondary/15 shadow-md p-6 rounded-3xl flex flex-col justify-between items-center text-center">
                    <span className="text-[10px] uppercase font-bold text-bento-primary tracking-wider">Active Recall Trigger</span>
                    <LatexRenderer text={courseCards[activeCardIndex].front} className="text-base font-extrabold text-white leading-snug max-w-xs" />
                    <span className="text-[10px] text-bento-secondary font-bold uppercase tracking-wider">Click card to Flip</span>
                  </div>

                  {/* Back Face Card */}
                  <div
                    className="backface-hidden absolute inset-0 bg-bento-bg text-white border border-bento-primary/30 shadow-[0_0_15px_rgba(102,252,241,0.06)] p-6 rounded-3xl flex flex-col justify-between items-center text-center"
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <span className="text-[10px] uppercase font-bold text-bento-primary tracking-wider">AI Definitions Explanation</span>
                    <LatexRenderer text={courseCards[activeCardIndex].back} className="text-sm text-bento-text-muted leading-relaxed max-w-xs font-sans" />
                    <span className="text-[10px] text-bento-secondary font-bold uppercase tracking-wider">Click card to Flip</span>
                  </div>
                </div>
              </div>

              {/* Recall Strength Mastery Update Controls */}
              {isFlipped && (
                <div className="space-y-2 animate-fade-in text-center">
                  <span className="text-[10px] font-semibold text-bento-text-muted/80 block uppercase tracking-wider">Rate recall ease to update spaced repetition strengths:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleSetCardStrength("new")}
                      className="px-3 py-2 border border-rose-500/20 bg-rose-950/20 text-rose-300 hover:bg-rose-950/45 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Hard / New
                    </button>
                    <button
                      onClick={() => handleSetCardStrength("learning")}
                      className="px-3 py-2 border border-amber-500/20 bg-amber-950/20 text-amber-300 hover:bg-amber-950/45 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Medium / Learning
                    </button>
                    <button
                      onClick={() => handleSetCardStrength("mastered")}
                      className="px-3 py-2 border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/45 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Easy / Mastered
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Placeholder Welcome */}
      {!loading && !generatedGuide && !generatedQuiz && courseCards.length === 0 && (
        <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center text-bento-text-muted shadow-sm max-w-xl mx-auto space-y-3">
          <Sparkles className="w-12 h-12 text-bento-primary mx-auto" />
          <h3 className="text-base font-extrabold text-white">Trigger AI Companion Tools</h3>
          <p className="text-xs text-bento-text-muted/85 mt-1.5 leading-relaxed font-medium">
            Choose a subject above and hit generate to prompt our Mistral AI study engine! It parses through notes to formulate dynamic Math LaTeX worksheets, multi-choice question arrays, and 3D flipped decks completely custom tailored to your study scope.
          </p>
        </div>
      )}
    </div>
  );
}
