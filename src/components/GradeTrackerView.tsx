import React, { useState } from "react";
import { Plus, Trash2, Edit2, Calendar, Award, Percent, BookOpen, AlertCircle, CheckCircle, Database, Upload, Download } from "lucide-react";
import { Course, Assignment } from "../types";

interface GradeTrackerViewProps {
  courses: Course[];
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onRemoveCourse: (id: string) => void;
  gpa: number;
}

export const LETTER_GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

export const GPA_SCALE: Record<string, number> = {
  "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0
};

export default function GradeTrackerView({
  courses,
  onAddCourse,
  onUpdateCourse,
  onRemoveCourse,
  gpa
}: GradeTrackerViewProps) {
  // Navigation active selected course
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    courses.length > 0 ? courses[0].id : null
  );

  // Forms states
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseInstructor, setNewCourseInstructor] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseTarget, setNewCourseTarget] = useState("A");

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [newAssName, setNewAssName] = useState("");
  const [newAssScore, setNewAssScore] = useState(0);
  const [newAssMax, setNewAssMax] = useState(100);
  const [newAssWeight, setNewAssWeight] = useState(10);
  const [newAssDueDate, setNewAssDueDate] = useState("");

  // Edit Course states
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editCourseId, setEditCourseId] = useState("");
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseCode, setEditCourseCode] = useState("");
  const [editCourseInstructor, setEditCourseInstructor] = useState("");
  const [editCourseCredits, setEditCourseCredits] = useState(3);
  const [editCourseTarget, setEditCourseTarget] = useState("A");

  // JSON Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  // Calculate course grade based on assignments
  const calculateCourseGrade = (course: Course) => {
    const completed = course.assignments.filter((a) => a.completed);
    if (completed.length === 0) return { percent: 100, letter: course.grade || "A" };

    let totalWeight = 0;
    let earnedWeight = 0;

    completed.forEach((a) => {
      totalWeight += a.weight;
      earnedWeight += (a.score / a.maxScore) * a.weight;
    });

    if (totalWeight === 0) return { percent: 100, letter: "A" };

    const percent = (earnedWeight / totalWeight) * 100;
    let letter = "F";
    if (percent >= 93) letter = "A";
    else if (percent >= 90) letter = "A-";
    else if (percent >= 87) letter = "B+";
    else if (percent >= 83) letter = "B";
    else if (percent >= 80) letter = "B-";
    else if (percent >= 77) letter = "C+";
    else if (percent >= 73) letter = "C";
    else if (percent >= 70) letter = "C-";
    else if (percent >= 60) letter = "D";

    return { percent, letter };
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !newCourseCode) return;

    const newC: Course = {
      id: `c-${Date.now()}`,
      name: newCourseName,
      code: newCourseCode.toUpperCase(),
      instructor: newCourseInstructor,
      semester: "Fall 2026",
      creditHours: Number(newCourseCredits) || 3,
      targetGrade: newCourseTarget,
      assignments: []
    };

    onAddCourse(newC);
    setSelectedCourseId(newC.id);

    // Reset forms
    setNewCourseName("");
    setNewCourseCode("");
    setNewCourseInstructor("");
    setShowAddCourse(false);
  };

  const handleSaveCourseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourseName || !editCourseCode) return;
    const original = courses.find((c) => c.id === editCourseId);
    if (!original) return;

    const updatedC: Course = {
      ...original,
      name: editCourseName,
      code: editCourseCode.toUpperCase(),
      instructor: editCourseInstructor,
      creditHours: Number(editCourseCredits) || 3,
      targetGrade: editCourseTarget
    };

    onUpdateCourse(updatedC);
    setShowEditCourse(false);
  };

  const handleExportClassesJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(courses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "novascholar_classes.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportClasses = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const item of list) {
        if (!item.name || !item.code) {
          throw new Error("Invalid course structure. Each course must have at least a 'name' and 'code' field.");
        }
        if (!item.id) {
          item.id = `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        }
        if (!item.assignments) {
          item.assignments = [];
        }
      }

      list.forEach(c => onAddCourse(c));
      setImportJsonText("");
      setShowImportModal(false);
      setImportError(null);
    } catch (e: any) {
      setImportError(e.message || "Invalid JSON syntax.");
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !newAssName) return;

    const newA: Assignment = {
      id: `a-${Date.now()}`,
      name: newAssName,
      score: Number(newAssScore) || 0,
      maxScore: Number(newAssMax) || 100,
      weight: Number(newAssWeight) || 10,
      dueDate: newAssDueDate || new Date().toISOString().split("T")[0],
      completed: true // default completed when adding historical ones
    };

    const updatedCourse = {
      ...activeCourse,
      assignments: [...activeCourse.assignments, newA]
    };

    // Calculate new overall letter grade based on this update
    const { letter } = calculateCourseGrade(updatedCourse);
    updatedCourse.grade = letter;

    onUpdateCourse(updatedCourse);

    // Reset Form
    setNewAssName("");
    setNewAssScore(0);
    setNewAssMax(100);
    setNewAssWeight(10);
    setNewAssDueDate("");
    setShowAddAssignment(false);
  };

  const toggleAssignmentCompleted = (assId: string) => {
    if (!activeCourse) return;
    const updatedAssignments = activeCourse.assignments.map((a) =>
      a.id === assId ? { ...a, completed: !a.completed } : a
    );

    const updatedCourse = {
      ...activeCourse,
      assignments: updatedAssignments
    };

    const { letter } = calculateCourseGrade(updatedCourse);
    updatedCourse.grade = letter;

    onUpdateCourse(updatedCourse);
  };

  const handleRemoveAssignment = (assId: string) => {
    if (!activeCourse) return;
    const updatedAssignments = activeCourse.assignments.filter((a) => a.id !== assId);

    const updatedCourse = {
      ...activeCourse,
      assignments: updatedAssignments
    };

    const { letter } = calculateCourseGrade(updatedCourse);
    updatedCourse.grade = letter;

    onUpdateCourse(updatedCourse);
  };

  const handleRemoveCourseDirect = (cId: string) => {
    if (confirm("Are you sure you want to delete this course and all its grades?")) {
      onRemoveCourse(cId);
      // Select another course if available
      const remaining = courses.filter((c) => c.id !== cId);
      if (remaining.length > 0) {
        setSelectedCourseId(remaining[0].id);
      } else {
        setSelectedCourseId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top GPA Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bento-card border border-bento-secondary/15 p-6 rounded-3xl shadow-md">
        <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-bento-secondary/10 pb-4 md:pb-0">
          <div className="p-3.5 bg-bento-primary/10 rounded-xl text-bento-primary shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Cumulative GPA</span>
            <span className="text-3xl font-extrabold text-white leading-none block my-1">{gpa.toFixed(2)}</span>
            <span className="text-[11px] text-bento-text-muted/60 block">4.0 Academic Scale</span>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-bento-secondary/10 py-4 md:py-0">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary block uppercase tracking-wider">Total Credits Enrolled</span>
            <span className="text-3xl font-extrabold text-white leading-none block my-1">
              {courses.reduce((acc, c) => acc + c.creditHours, 0)} Credits
            </span>
            <span className="text-[11px] text-bento-text-muted/60 block">Semester Fall 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-4 py-4 md:py-0">
          <button
            onClick={() => setShowAddCourse(true)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl font-bold shadow-[0_0_15px_rgba(102,252,241,0.2)] text-sm transition cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Enroll New Course</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Courses side columns vs Course detailed assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Course Inventory Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-bento-secondary uppercase tracking-wider">Course Catalogue</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportClassesJson}
                className="text-[10px] bg-bento-secondary/10 border border-bento-secondary/25 hover:border-bento-primary/45 text-bento-text-muted hover:text-white px-2 py-0.5 rounded-md font-bold cursor-pointer transition flex items-center gap-1"
                title="Export Classes JSON"
              >
                <Download className="w-2.5 h-2.5" />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  setImportJsonText("");
                  setImportError(null);
                  setShowImportModal(true);
                }}
                className="text-[10px] bg-bento-primary/10 border border-bento-primary/25 text-bento-primary px-2 py-0.5 rounded-md font-black cursor-pointer transition flex items-center gap-1"
                title="Import Classes JSON"
              >
                <Upload className="w-2.5 h-2.5" />
                <span>Import</span>
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            {courses.length === 0 ? (
              <div className="text-center p-8 bg-bento-bg/40 rounded-2xl border border-dashed border-bento-secondary/20 text-bento-text-muted">
                <p className="text-sm">No courses enrolled yet.</p>
              </div>
            ) : (
              courses.map((course) => {
                const isSelected = selectedCourseId === course.id;
                const { percent, letter } = calculateCourseGrade(course);
                const isMeetingTarget = GPA_SCALE[letter] >= GPA_SCALE[course.targetGrade || "A"];

                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-bento-card border-bento-primary/50 shadow-[0_0_15px_rgba(102,252,241,0.1)]"
                        : "bg-bento-card/40 border-bento-secondary/15 hover:border-bento-secondary/35 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bento-bg border border-bento-secondary/20 text-bento-primary uppercase tracking-wider">
                            {course.code}
                          </span>
                          <span className="text-xs text-bento-text-muted/60">{course.creditHours} Credits</span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate leading-tight">
                          {course.name}
                        </h4>
                        <span className="text-xs text-bento-text-muted/50 mt-1 block">Instructor: {course.instructor}</span>
                      </div>

                      {/* Display Grades */}
                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-white block">
                          {letter}
                        </span>
                        <span className="text-[9px] font-bold text-bento-secondary block mt-0.5">
                          Goal: {course.targetGrade || "A"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-bento-secondary/10 flex items-center justify-between text-xs font-semibold">
                      <span className="text-bento-text-muted/70">Grade: {percent.toFixed(1)}%</span>
                      {isMeetingTarget ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>On Track</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Behind Target</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Assignment Breakdown for Active Course */}
        <div className="lg:col-span-8 space-y-4">
          {activeCourse ? (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Active Course Info Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-bento-secondary/10 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-black text-white">{activeCourse.name}</h2>
                    <span className="text-[10px] font-bold bg-bento-primary/10 text-bento-primary px-2 py-0.5 rounded border border-bento-primary/20 uppercase">
                      {activeCourse.code}
                    </span>
                  </div>
                  <p className="text-xs text-bento-text-muted/70 mt-1.5">
                    Guided by {activeCourse.instructor || "Unknown Professor"} • {activeCourse.semester}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAddAssignment(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Score</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditCourseId(activeCourse.id);
                      setEditCourseName(activeCourse.name);
                      setEditCourseCode(activeCourse.code);
                      setEditCourseInstructor(activeCourse.instructor || "");
                      setEditCourseCredits(activeCourse.creditHours || 3);
                      setEditCourseTarget(activeCourse.targetGrade || "A");
                      setShowEditCourse(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-bento-bg hover:bg-bento-bg/80 border border-bento-secondary/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Edit Course Parameters"
                  >
                    <Edit2 className="w-3 h-3 text-bento-primary" />
                    <span>Edit Class</span>
                  </button>
                  <button
                    onClick={() => handleRemoveCourseDirect(activeCourse.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Delete course"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Assignment list table */}
              <div>
                <h3 className="text-xs font-bold text-bento-secondary uppercase tracking-wider mb-4">Grades & Assignments Breakdown</h3>

                {activeCourse.assignments.length === 0 ? (
                  <div className="text-center py-12 bg-bento-bg/40 rounded-2xl border border-bento-secondary/10 text-bento-text-muted">
                    <p className="text-sm">No assignments recorded for this course.</p>
                    <p className="text-xs text-bento-secondary mt-1">Add assignments or tests to calculate live grades.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-bento-secondary/10 text-xs font-bold text-bento-secondary uppercase tracking-wider">
                          <th className="py-3 px-2">Task</th>
                          <th className="py-3 px-2">Completed</th>
                          <th className="py-3 px-2 text-right">Score</th>
                          <th className="py-3 px-2 text-right">Weight</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bento-secondary/10">
                        {activeCourse.assignments.map((ass) => {
                          const scorePct = ass.maxScore > 0 ? (ass.score / ass.maxScore) * 100 : 0;
                          return (
                            <tr key={ass.id} className={`hover:bg-bento-bg/30 transition ${!ass.completed ? "opacity-40" : ""}`}>
                              <td className="py-3.5 px-2 font-semibold text-white">
                                <div className="flex flex-col">
                                  <span>{ass.name}</span>
                                  {ass.dueDate && (
                                    <span className="text-[9px] text-bento-secondary font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Due: {ass.dueDate}</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-2">
                                <input
                                  type="checkbox"
                                  checked={ass.completed}
                                  onChange={() => toggleAssignmentCompleted(ass.id)}
                                  className="w-4 h-4 accent-bento-primary cursor-pointer rounded"
                                />
                              </td>
                              <td className="py-3.5 px-2 text-right font-bold text-bento-text-muted">
                                {ass.completed ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-white">{ass.score} / {ass.maxScore}</span>
                                    <span className="text-[10px] text-bento-primary font-bold">({scorePct.toFixed(0)}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-bento-text-muted/40 text-xs italic font-medium">Not Graded</span>
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-right font-bold text-bento-text-muted/90">
                                {ass.weight}%
                              </td>
                              <td className="py-3.5 px-2 text-right">
                                <button
                                  onClick={() => handleRemoveAssignment(ass.id)}
                                  className="p-1.5 text-bento-secondary hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-8 text-center text-bento-text-muted shadow-sm">
              <BookOpen className="w-12 h-12 text-bento-secondary/30 mx-auto mb-3" />
              <p className="text-sm">Select a course to view assignment parameters and calculate targets.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Course Form */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Enroll New Course</h3>
              <button
                type="button"
                onClick={() => setShowAddCourse(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-301"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Credit Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Instructor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vance"
                  value={newCourseInstructor}
                  onChange={(e) => setNewCourseInstructor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Target Grade Letter</label>
                <select
                  value={newCourseTarget}
                  onChange={(e) => setNewCourseTarget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                >
                  {LETTER_GRADES.map((lg) => (
                    <option key={lg} value={lg} className="bg-bento-bg text-white">{lg}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Confirm Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Assignment Form */}
      {showAddAssignment && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Add Assignment Score</h3>
              <button
                type="button"
                onClick={() => setShowAddAssignment(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Assignment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Lab Report"
                  value={newAssName}
                  onChange={(e) => setNewAssName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Earned Score</label>
                  <input
                    type="number"
                    min="0"
                    value={newAssScore}
                    onChange={(e) => setNewAssScore(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Max Potential</label>
                  <input
                    type="number"
                    min="1"
                    value={newAssMax}
                    onChange={(e) => setNewAssMax(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Weight Value (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newAssWeight}
                    onChange={(e) => setNewAssWeight(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={newAssDueDate}
                    onChange={(e) => setNewAssDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm text-bento-text-muted"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowAddAssignment(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Record Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Course */}
      {showEditCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Modify Class parameters</h3>
              <button
                type="button"
                onClick={() => setShowEditCourse(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCourseEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Class/Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Organic Chemistry"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEM-302"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Credit Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={editCourseCredits}
                    onChange={(e) => setEditCourseCredits(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Instructor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vance"
                  value={editCourseInstructor}
                  onChange={(e) => setEditCourseInstructor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Target Grade Letter</label>
                <select
                  value={editCourseTarget}
                  onChange={(e) => setEditCourseTarget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                >
                  {LETTER_GRADES.map((lg) => (
                    <option key={lg} value={lg} className="bg-bento-bg text-white">{lg}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowEditCourse(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Classes */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Import Class JSON</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-bento-text-muted leading-relaxed">
                Paste a course JSON structure (object or array) to merge it into your active semester courses catalog.
              </p>

              {importError && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/25 rounded-xl text-[11px] text-rose-300 font-bold">
                  ⚠️ {importError}
                </div>
              )}

              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='e.g.&#10;{&#10;  "name": "Advanced Biochemistry",&#10;  "code": "BIOC-401",&#10;  "instructor": "Dr. Miller",&#10;  "creditHours": 4,&#10;  "targetGrade": "A"&#10;}'
                className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-xs font-mono leading-relaxed"
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportClasses}
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Merge Classes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
