import React, { useState } from "react";
import { Plus, Trash2, FileText, Sparkles, BookOpen, Layers, Edit3, Image as ImageIcon, CheckSquare, ChevronRight, Eye, ListPlus, CornerDownRight, Calculator } from "lucide-react";
import { Note, NoteType, Course, CornellCue, OutlineItem, MediaItem } from "../types";
import HandwritingCanvas from "./HandwritingCanvas";
import MediaManager from "./MediaManager";
import LatexRenderer from "./LatexRenderer";
import LatexEditorView from "./LatexEditorView";

interface NotesEditorViewProps {
  notes: Note[];
  courses: Course[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onRemoveNote: (id: string) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
}

export default function NotesEditorView({
  notes,
  courses,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  selectedNoteId,
  setSelectedNoteId
}: NotesEditorViewProps) {
  // Navigation active selected note
  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  // Active sub-section tab inside the active note editor
  const [activeTab, setActiveTab] = useState<"edit" | "latex" | "canvas" | "media" | "preview">("edit");

  // New Note modal states
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("cornell");
  const [newNoteCourseId, setNewNoteCourseId] = useState(courses[0]?.id || "");

  // Local Cornell Cue Form
  const [newCueText, setNewCueText] = useState("");
  const [selectedLineForCue, setSelectedLineForCue] = useState(0);

  // Local Outline Bullet Form
  const [newOutlineText, setNewOutlineText] = useState("");

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle) return;

    const newN: Note = {
      id: `note-${Date.now()}`,
      title: newNoteTitle,
      courseId: newNoteCourseId,
      type: newNoteType,
      date: new Date().toISOString().split("T")[0],
      content: newNoteType === "cornell"
        ? "### Main Concepts\nType your structured academic details here.\nEquations can be written as $x^2 + y^2 = z^2$ or in blocks like:\n$$f(x) = \\int_{-\\infty}^{\\infty} g(t)e^{-2\\pi i f t} dt$$"
        : "# Core Subject Matter\n- First topic of course syllabus\n- Main details regarding genes",
      cues: newNoteType === "cornell" ? [] : undefined,
      summary: newNoteType === "cornell" ? "Brief summary of the Cornell notes goes here." : undefined,
      outlineItems: newNoteType === "outline" ? [
        { id: `out-1`, text: "First main core topic node", level: 0, completed: false }
      ] : undefined,
      media: []
    };

    onAddNote(newN);
    setSelectedNoteId(newN.id);
    setActiveTab("edit");

    // Reset Form
    setNewNoteTitle("");
    setShowAddNote(false);
  };

  const handleUpdateContent = (text: string) => {
    if (!activeNote) return;
    onUpdateNote({
      ...activeNote,
      content: text
    });
  };

  const handleUpdateSummary = (text: string) => {
    if (!activeNote || activeNote.type !== "cornell") return;
    onUpdateNote({
      ...activeNote,
      summary: text
    });
  };

  const handleAddCornellCue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !newCueText || activeNote.type !== "cornell") return;

    const newCue: CornellCue = {
      id: `cue-${Date.now()}`,
      cue: newCueText,
      noteLineIndex: Number(selectedLineForCue) || 0
    };

    onUpdateNote({
      ...activeNote,
      cues: [...(activeNote.cues || []), newCue]
    });

    setNewCueText("");
  };

  const handleRemoveCornellCue = (cueId: string) => {
    if (!activeNote || activeNote.type !== "cornell") return;
    onUpdateNote({
      ...activeNote,
      cues: (activeNote.cues || []).filter((c) => c.id !== cueId)
    });
  };

  // Outline lists operations
  const handleAddOutlineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !newOutlineText || activeNote.type !== "outline") return;

    const newItem: OutlineItem = {
      id: `out-${Date.now()}`,
      text: newOutlineText,
      level: 0,
      completed: false
    };

    onUpdateNote({
      ...activeNote,
      outlineItems: [...(activeNote.outlineItems || []), newItem]
    });

    setNewOutlineText("");
  };

  const handleIndentOutlineItem = (itemId: string, direction: "left" | "right") => {
    if (!activeNote || activeNote.type !== "outline") return;

    const updated = (activeNote.outlineItems || []).map((item) => {
      if (item.id === itemId) {
        const currentLevel = item.level;
        const newLevel = direction === "right" ? Math.min(currentLevel + 1, 3) : Math.max(currentLevel - 1, 0);
        return { ...item, level: newLevel };
      }
      return item;
    });

    onUpdateNote({
      ...activeNote,
      outlineItems: updated
    });
  };

  const handleToggleOutlineCompleted = (itemId: string) => {
    if (!activeNote || activeNote.type !== "outline") return;

    const updated = (activeNote.outlineItems || []).map((item) => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    onUpdateNote({
      ...activeNote,
      outlineItems: updated
    });
  };

  const handleRemoveOutlineItem = (itemId: string) => {
    if (!activeNote || activeNote.type !== "outline") return;

    onUpdateNote({
      ...activeNote,
      outlineItems: (activeNote.outlineItems || []).filter((item) => item.id !== itemId)
    });
  };

  // Whiteboard sketch saves
  const handleSaveSketch = (dataUrl: string) => {
    if (!activeNote) return;
    onUpdateNote({
      ...activeNote,
      sketchDataUrl: dataUrl
    });
  };

  // Add multimedia items
  const handleAddMediaItem = (item: MediaItem) => {
    if (!activeNote) return;

    // Optional: Append OCR transcripts directly to notes if requested
    let updatedContent = activeNote.content;
    if (item.transcription) {
      updatedContent += `\n\n### [Imported Media Transcript: ${item.name}]\n${item.transcription}`;
    }

    onUpdateNote({
      ...activeNote,
      media: [...activeNote.media, item],
      content: updatedContent
    });
  };

  const handleRemoveMediaItem = (mediaId: string) => {
    if (!activeNote) return;
    onUpdateNote({
      ...activeNote,
      media: activeNote.media.filter((m) => m.id !== mediaId)
    });
  };

  const handleRemoveNoteDirect = (id: string) => {
    if (confirm("Are you sure you want to delete this study note?")) {
      onRemoveNote(id);
      setSelectedNoteId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Sidebar - Note inventories (Left 3 Columns) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-bento-secondary uppercase tracking-wider">Academic Notes</h3>
          <button
            onClick={() => setShowAddNote(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl text-xs font-bold transition shadow-[0_0_12px_rgba(102,252,241,0.2)] border border-bento-primary/15 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center p-6 bg-bento-card border border-bento-secondary/15 text-bento-text-muted rounded-2xl">
              <p className="text-xs">No notes recorded.</p>
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const c = courses.find((course) => course.id === note.courseId);

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-bento-card border-bento-primary/60 shadow-[0_0_12px_rgba(102,252,241,0.12)] ring-1 ring-bento-primary/10"
                      : "bg-bento-card/30 border-bento-secondary/10 hover:bg-bento-card/50"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bento-bg border border-bento-secondary/20 text-bento-secondary uppercase tracking-wider mr-1.5 inline-block">
                      {c ? c.code : "GEN"}
                    </span>
                    <span className={`text-xs font-bold block truncate mt-1.5 ${isSelected ? "text-bento-primary" : "text-white"}`}>
                      {note.title}
                    </span>
                    <span className="text-[10px] text-bento-text-muted/60 block mt-1">{note.type.toUpperCase()} • {note.date}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? "text-bento-primary translate-x-0.5" : "text-bento-secondary/30"}`} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Frame - Cornell vs Outline Editors (Right 9 Columns) */}
      <div className="lg:col-span-9">
        {activeNote ? (
          <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl shadow-md overflow-hidden flex flex-col min-h-[600px]">
            {/* Header section with note meta */}
            <div className="p-4 bg-bento-bg border-b border-bento-secondary/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-bento-primary" />
                  <span>{activeNote.title}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-bento-text-muted">
                  <span className="px-1.5 py-0.5 rounded bg-bento-primary/10 border border-bento-primary/20 text-bento-primary font-bold uppercase tracking-wider text-[9px]">
                    {activeNote.type} Method
                  </span>
                  <span>•</span>
                  <span>{activeNote.date}</span>
                  <span>•</span>
                  <select
                    value={activeNote.courseId}
                    onChange={(e) => onUpdateNote({ ...activeNote, courseId: e.target.value })}
                    className="border-0 bg-transparent py-0 pl-0 pr-6 text-xs text-bento-secondary font-bold focus:ring-0 cursor-pointer outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-bento-bg text-white">{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation Tabs for note panels */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "edit" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:bg-bento-bg/80"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  onClick={() => setActiveTab("latex")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "latex" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:bg-bento-bg/80"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>LaTeX Studio</span>
                </button>
                <button
                  onClick={() => setActiveTab("canvas")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "canvas" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:bg-bento-bg/80"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sketchpad</span>
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "media" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:bg-bento-bg/80"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Media</span>
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "preview" ? "bg-bento-primary text-bento-bg shadow-[0_0_12px_rgba(102,252,241,0.2)]" : "text-bento-secondary hover:bg-bento-bg/80"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Math Render</span>
                </button>
                <button
                  onClick={() => handleRemoveNoteDirect(activeNote.id)}
                  className="p-1.5 rounded-lg text-bento-secondary hover:text-rose-400 hover:bg-rose-950/20 transition ml-2 cursor-pointer"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main panels body */}
            <div className="flex-1 p-5 overflow-y-auto">
              {/* Tab 1: Editor View */}
              {activeTab === "edit" && (
                <div className="space-y-4">
                  {/* CORNELL NOTES EDITING INTERFACE */}
                  {activeNote.type === "cornell" ? (
                    <div className="space-y-5">
                      {/* Grid for Cues (Left) and Content notes (Right) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Cornell Cues column (Left 4 cols) */}
                        <div className="md:col-span-4 bg-bento-bg/60 border border-bento-secondary/15 p-4 rounded-2xl space-y-4">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-bento-primary" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cornell Cues & Questions</h4>
                          </div>

                          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                            {(!activeNote.cues || activeNote.cues.length === 0) ? (
                              <p className="text-[11px] text-bento-text-muted italic leading-relaxed">No triggers added. Formulate cues, questions, or recall keys.</p>
                            ) : (
                              activeNote.cues.map((cue) => (
                                <div key={cue.id} className="flex justify-between items-start gap-1 p-2.5 bg-bento-card border border-bento-secondary/10 rounded-xl hover:border-bento-primary/30 transition">
                                  <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-bento-primary block leading-tight">{cue.cue}</span>
                                    <span className="text-[9px] text-bento-text-muted/65 font-medium">Mapped to Section {cue.noteLineIndex}</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveCornellCue(cue.id)}
                                    className="text-[11px] text-bento-secondary hover:text-rose-400 font-bold px-1 cursor-pointer transition"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Quick cue creation form */}
                          <form onSubmit={handleAddCornellCue} className="space-y-2.5 pt-2.5 border-t border-bento-secondary/10">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Formula of search?"
                              value={newCueText}
                              onChange={(e) => setNewCueText(e.target.value)}
                              className="w-full px-3 py-2 bg-bento-card border border-bento-secondary/20 rounded-xl text-xs focus:outline-none focus:border-bento-primary/65 text-white placeholder-bento-text-muted/40"
                            />
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-[10px] text-bento-text-muted">Map to row:</span>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={selectedLineForCue}
                                onChange={(e) => setSelectedLineForCue(Number(e.target.value))}
                                className="w-12 px-1.5 py-0.5 border border-bento-secondary/20 rounded-lg text-xs text-center bg-bento-card text-white focus:outline-none"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-bento-primary text-bento-bg rounded-lg text-[11px] font-bold hover:bg-bento-primary/90 cursor-pointer transition"
                            >
                              Add Cue Question
                            </button>
                          </form>
                        </div>

                        {/* Cornell Content notes column (Right 8 cols) */}
                        <div className="md:col-span-8 space-y-2">
                          <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block">Main Notes content</label>
                          <textarea
                            rows={15}
                            value={activeNote.content}
                            onChange={(e) => handleUpdateContent(e.target.value)}
                            placeholder="Take complete study lecture notes. Wrap LaTeX math in $...$ for inline and $$...$$ for blocks."
                            className="w-full p-4 border border-bento-secondary/20 bg-bento-bg text-white rounded-2xl text-sm leading-relaxed focus:outline-none focus:border-bento-primary/60 font-mono"
                          />
                        </div>
                      </div>

                      {/* Bottom Cornell Summary */}
                      <div className="bg-bento-bg/40 border border-bento-secondary/15 p-4 rounded-2xl space-y-2">
                        <label className="text-xs font-bold text-bento-primary uppercase tracking-wider block">Cornell Summary Panel</label>
                        <textarea
                          rows={3}
                          value={activeNote.summary || ""}
                          onChange={(e) => handleUpdateSummary(e.target.value)}
                          placeholder="Summarize the core takeaways of these study notes on the bottom. Focus on high-level active recall insights."
                          className="w-full p-3 border border-bento-secondary/20 bg-bento-card text-white rounded-xl text-xs leading-relaxed focus:outline-none focus:border-bento-primary/60 font-medium placeholder-bento-text-muted/40"
                        />
                      </div>
                    </div>
                  ) : (
                    /* INTERACTIVE OUTLINE NOTES INTERFACE */
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      {/* Outline Visual Bullets (Left 6 cols) */}
                      <div className="md:col-span-7 bg-bento-bg/60 border border-bento-secondary/15 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-bento-primary" />
                            <span>Interactive Bullet Outline Hierarchy</span>
                          </h4>
                        </div>

                        {(!activeNote.outlineItems || activeNote.outlineItems.length === 0) ? (
                          <p className="text-xs text-bento-text-muted italic text-center py-4">No outline bullet points added.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {activeNote.outlineItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 p-1.5 hover:bg-bento-card/40 rounded transition"
                                style={{ paddingLeft: `${item.level * 20 + 6}px` }}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {item.level > 0 && <CornerDownRight className="w-3.5 h-3.5 text-bento-secondary/50 shrink-0" />}
                                  <input
                                    type="checkbox"
                                    checked={item.completed || false}
                                    onChange={() => handleToggleOutlineCompleted(item.id)}
                                    className="w-3.5 h-3.5 text-bento-primary border-bento-secondary/35 bg-bento-bg rounded focus:ring-bento-primary/50 cursor-pointer shrink-0"
                                  />
                                  <span className={`text-xs ${item.completed ? "text-bento-text-muted/40 line-through font-medium" : "text-white font-semibold"}`}>
                                    {item.text}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleIndentOutlineItem(item.id, "left")}
                                    className="px-1.5 py-0.5 bg-bento-card border border-bento-secondary/20 rounded text-[9px] font-bold text-bento-secondary hover:bg-bento-bg cursor-pointer transition disabled:opacity-30"
                                    title="Decrease indentation"
                                    disabled={item.level === 0}
                                  >
                                    ←
                                  </button>
                                  <button
                                    onClick={() => handleIndentOutlineItem(item.id, "right")}
                                    className="px-1.5 py-0.5 bg-bento-card border border-bento-secondary/20 rounded text-[9px] font-bold text-bento-secondary hover:bg-bento-bg cursor-pointer transition disabled:opacity-30"
                                    title="Increase indentation"
                                    disabled={item.level === 3}
                                  >
                                    →
                                  </button>
                                  <button
                                    onClick={() => handleRemoveOutlineItem(item.id)}
                                    className="p-1 text-bento-secondary hover:text-rose-400 cursor-pointer transition"
                                    title="Delete bullet"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Bullet outline form */}
                        <form onSubmit={handleAddOutlineItem} className="flex gap-1.5 pt-2.5 border-t border-bento-secondary/10">
                          <input
                            type="text"
                            required
                            placeholder="Add study bullet checklist item..."
                            value={newOutlineText}
                            onChange={(e) => setNewOutlineText(e.target.value)}
                            className="flex-1 px-3 py-2 bg-bento-card border border-bento-secondary/20 rounded-xl text-xs focus:outline-none focus:border-bento-primary/65 text-white placeholder-bento-text-muted/40"
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 bg-bento-primary text-bento-bg rounded-xl text-xs font-bold hover:bg-bento-primary/90 cursor-pointer flex items-center gap-1 transition"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </form>
                      </div>

                      {/* Raw outline details content (Right 5 cols) */}
                      <div className="md:col-span-5 space-y-2">
                        <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block">Raw Notes Reference (Markdown)</label>
                        <textarea
                          rows={14}
                          value={activeNote.content}
                          onChange={(e) => handleUpdateContent(e.target.value)}
                          placeholder="Type comprehensive syllabus details..."
                          className="w-full p-3.5 border border-bento-secondary/20 bg-bento-bg text-white rounded-2xl text-xs leading-relaxed focus:outline-none focus:border-bento-primary/60 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Dedicated Interactive LaTeX Studio */}
              {activeTab === "latex" && (
                <LatexEditorView
                  initialContent={activeNote.content}
                  onInsertIntoNote={(insertedLatex) => {
                    handleUpdateContent(activeNote.content + "\n\n" + insertedLatex);
                  }}
                />
              )}

              {/* Tab 2: Whiteboard / Canvas Drawing View */}
              {activeTab === "canvas" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-bento-primary/10 border border-bento-primary/20 text-bento-primary rounded-xl text-xs leading-relaxed">
                    <strong>Visual Whiteboard:</strong> Draw and sketch diagram associations, brain maps, or handwritings relative to these syllabus items. Drawing content compiles and auto-snapshots onto your notes securely.
                  </div>
                  <div className="h-[450px]">
                    <HandwritingCanvas
                      initialDataUrl={activeNote.sketchDataUrl}
                      onSave={handleSaveSketch}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Multimedia File Uploader & OCR/Transcriber */}
              {activeTab === "media" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-bento-primary/10 border border-bento-primary/20 text-bento-primary rounded-xl text-xs leading-relaxed">
                    <strong>Multi-modal Studio:</strong> Upload pictures for instant math OCR extraction or record lectures using the live microphone. Text/speech content is automatically processed server-side using Gemini and appended.
                  </div>
                  <MediaManager
                    media={activeNote.media}
                    onAddMedia={handleAddMediaItem}
                    onRemoveMedia={handleRemoveMediaItem}
                  />
                </div>
              )}

              {/* Tab 4: LaTeX typeset Render Preview View */}
              {activeTab === "preview" && (
                <div className="space-y-6">
                  {/* Note overview math rendering */}
                  <div className="prose max-w-none bg-bento-bg/40 border border-bento-secondary/15 rounded-2xl p-6 shadow-xs space-y-4 min-h-[350px]">
                    <h2 className="text-xl font-bold text-white border-b border-bento-secondary/10 pb-2">{activeNote.title}</h2>
                    <LatexRenderer text={activeNote.content} className="text-sm text-bento-text-muted leading-relaxed font-sans" />

                    {/* Renders Cornell summary */}
                    {activeNote.type === "cornell" && activeNote.summary && (
                      <div className="mt-6 pt-5 border-t border-bento-secondary/10 bg-bento-card p-4 rounded-xl border border-bento-secondary/5">
                        <h4 className="text-xs font-bold text-bento-primary uppercase tracking-widest mb-1.5">Cornell Notes Summary</h4>
                        <LatexRenderer text={activeNote.summary} className="text-xs text-bento-text-muted/80 leading-relaxed italic" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-12 text-center text-bento-text-muted shadow-sm space-y-3">
            <FileText className="w-12 h-12 text-bento-secondary/35 mx-auto" />
            <p className="text-sm text-bento-text-muted/85 font-semibold">Select a course study note or create a new one to begin taking structured Cornell or Outline files.</p>
          </div>
        )}
      </div>

      {/* Modal Add Note Form */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_35px_rgba(0,0,0,0.65)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Create Study Note</h3>
              <button
                type="button"
                onClick={() => setShowAddNote(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Note Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heuristic Functions and optimality"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Academic Course</label>
                  <select
                    value={newNoteCourseId}
                    onChange={(e) => setNewNoteCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-bento-bg text-white">{c.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Study Method</label>
                  <select
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                  >
                    <option value="cornell" className="bg-bento-bg text-white">Cornell Notes Method</option>
                    <option value="outline" className="bg-bento-bg text-white">Outline Checklist Method</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
