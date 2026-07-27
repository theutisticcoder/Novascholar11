export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  semester: string;
  creditHours: number;
  grade?: string; // e.g. A, B+, C
  targetGrade?: string;
  assignments: Assignment[];
}

export interface Assignment {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number; // e.g. 15 for 15%
  dueDate: string;
  completed: boolean;
}

export type NoteType = 'cornell' | 'outline';

export interface CornellCue {
  id: string;
  cue: string;
  noteLineIndex: number; // associated index of outline/content
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'document';
  url: string; // Blob URL or base64
  transcription?: string; // OCR text or audio transcript
  dateAdded: string;
}

export interface Note {
  id: string;
  title: string;
  courseId: string;
  type: NoteType;
  date: string;
  // Cornell Specific
  cues?: CornellCue[];
  summary?: string;
  // Content (for Cornell it is the main notes section; for Outline it is the hierarchy)
  content: string; // Markdown / Plain text list
  outlineItems?: OutlineItem[]; // used for structured hierarchical outline
  sketchDataUrl?: string; // handwriting/drawing overlay or attachment
  media: MediaItem[];
}

export interface OutlineItem {
  id: string;
  text: string;
  level: number; // 0 for H1/main bullet, 1 for sub, etc.
  completed?: boolean; // can act as study checklist
}

export type EventType = 'class' | 'exam' | 'study' | 'assignment' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO DateTime
  end: string; // ISO DateTime
  courseId: string;
  type: EventType;
  description: string;
  location?: string;
  isRecurring?: boolean;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: 'academic' | 'personal' | 'career';
  status: 'not_started' | 'in_progress' | 'completed';
  dueDate: string;
  milestones: GoalMilestone[];
  progress: number; // 0 - 100 calculated from milestones or manual
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  courseId: string;
  strength: 'new' | 'learning' | 'mastered';
  lastReviewed?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  questions: QuizQuestion[];
  score?: number;
  dateTaken?: string;
}

export interface StudyGuide {
  id: string;
  title: string;
  courseId: string;
  content: string; // Markdown study guide
  summaryPoints: string[];
  keyTerms: { term: string; definition: string }[];
  dateGenerated: string;
}
