import React, { useState } from "react";
import { Plus, Trash2, CheckSquare, Target, Trophy, Award, Calendar, Circle, CheckCircle2 } from "lucide-react";
import { Goal, GoalMilestone } from "../types";

interface GoalRoadmapViewProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (goal: Goal) => void;
  onRemoveGoal: (id: string) => void;
}

export default function GoalRoadmapView({ goals, onAddGoal, onUpdateGoal, onRemoveGoal }: GoalRoadmapViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Add Goal Form States
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState<"academic" | "personal" | "career">("academic");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [milestonesText, setMilestonesText] = useState("");

  const filteredGoals = goals.filter((g) => {
    if (filterCategory !== "all" && g.category !== filterCategory) return false;
    return true;
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle) return;

    // Parse milestone lines
    const msLines = milestonesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const msArray: GoalMilestone[] = msLines.map((line, idx) => ({
      id: `ms-${Date.now()}-${idx}`,
      title: line,
      completed: false
    }));

    const newG: Goal = {
      id: `g-${Date.now()}`,
      title: goalTitle,
      category: goalCategory,
      status: "not_started",
      dueDate: goalDueDate || new Date().toISOString().split("T")[0],
      milestones: msArray,
      progress: 0
    };

    onAddGoal(newG);

    // Reset Form
    setGoalTitle("");
    setGoalDueDate("");
    setMilestonesText("");
    setShowAddGoal(false);
  };

  const handleToggleMilestone = (goalId: string, msId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((ms) =>
      ms.id === msId ? { ...ms, completed: !ms.completed } : ms
    );

    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;

    let status = goal.status;
    if (progress === 100) status = "completed";
    else if (progress > 0) status = "in_progress";
    else status = "not_started";

    onUpdateGoal({
      ...goal,
      milestones: updatedMilestones,
      progress,
      status
    });
  };

  const handleRemoveGoalDirect = (id: string) => {
    if (confirm("Are you sure you want to delete this academic roadmap goal?")) {
      onRemoveGoal(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bento-card border border-bento-secondary/15 p-6 rounded-3xl shadow-md">
        <div className="flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-bento-secondary/10 pb-4 md:pb-0">
          <div className="p-3 bg-bento-primary/10 text-bento-primary rounded-xl shrink-0">
            <Target className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary uppercase tracking-wider block">Total Roadmaps</span>
            <span className="text-xl font-extrabold text-white leading-tight block mt-0.5">{goals.length} Goals Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-bento-secondary/10 py-4 md:py-0">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
            <Trophy className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-bento-secondary uppercase tracking-wider block">Syllabus Achievements</span>
            <span className="text-xl font-extrabold text-white leading-tight block mt-0.5">
              {goals.filter((g) => g.status === "completed").length} Completed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 py-4 md:py-0">
          <button
            onClick={() => setShowAddGoal(true)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(102,252,241,0.2)] border border-bento-primary/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Set New Goal Milestone</span>
          </button>
        </div>
      </div>

      {/* Main Roadmap Timelines split */}
      <div className="space-y-4">
        {/* Category Filters Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-bento-secondary/10 pb-2">
          <h3 className="text-xs font-bold text-bento-secondary uppercase tracking-wider">Goal Timeline Cards</h3>
          <div className="flex gap-1.5 bg-bento-bg p-1 rounded-xl text-xs font-semibold border border-bento-secondary/10">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterCategory === "all" ? "bg-bento-card text-bento-primary border border-bento-secondary/15" : "text-bento-text-muted hover:text-bento-primary"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory("academic")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterCategory === "academic" ? "bg-bento-card text-bento-primary border border-bento-secondary/15" : "text-bento-text-muted hover:text-bento-primary"
              }`}
            >
              Academic
            </button>
            <button
              onClick={() => setFilterCategory("career")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterCategory === "career" ? "bg-bento-card text-bento-primary border border-bento-secondary/15" : "text-bento-text-muted hover:text-bento-primary"
              }`}
            >
              Career
            </button>
            <button
              onClick={() => setFilterCategory("personal")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterCategory === "personal" ? "bg-bento-card text-bento-primary border border-bento-secondary/15" : "text-bento-text-muted hover:text-bento-primary"
              }`}
            >
              Personal
            </button>
          </div>
        </div>

        {/* Goals timeline grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-bento-card border border-bento-secondary/15 rounded-3xl text-bento-text-muted shadow-sm">
              <Target className="w-10 h-10 text-bento-secondary/30 mx-auto mb-2" />
              <p className="text-sm">No roadmap targets match this filter.</p>
            </div>
          ) : (
            filteredGoals.map((goal) => {
              let categoryTagColor = "bg-bento-bg text-bento-text-muted border border-bento-secondary/10";
              if (goal.category === "academic") categoryTagColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
              if (goal.category === "career") categoryTagColor = "bg-bento-primary/10 text-bento-primary border border-bento-primary/20";
              if (goal.category === "personal") categoryTagColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

              return (
                <div key={goal.id} className="bg-bento-card border border-bento-secondary/15 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${categoryTagColor}`}>
                          {goal.category}
                        </span>
                        <h4 className="text-sm font-black text-white leading-snug pt-1">{goal.title}</h4>
                      </div>

                      <button
                        onClick={() => handleRemoveGoalDirect(goal.id)}
                        className="p-1.5 text-bento-secondary hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress details */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-bento-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Target: {goal.dueDate}</span>
                        </span>
                        <span className="font-extrabold text-bento-primary">{goal.progress}% Completed</span>
                      </div>

                      {/* Progress Bar slider */}
                      <div className="w-full bg-bento-bg h-2 rounded-full overflow-hidden border border-bento-secondary/10">
                        <div
                          className="bg-bento-primary h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(102,252,241,0.5)]"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Milestone Checkboxes */}
                    {goal.milestones.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-bento-secondary/10 space-y-2.5">
                        <span className="text-[10px] font-bold text-bento-secondary uppercase tracking-widest block mb-1">Timeline Milestones</span>
                        <div className="space-y-2">
                          {goal.milestones.map((ms) => (
                            <div
                              key={ms.id}
                              onClick={() => handleToggleMilestone(goal.id, ms.id)}
                              className="flex items-center gap-2.5 text-xs text-bento-text-muted cursor-pointer hover:bg-bento-bg/40 p-1.5 rounded-xl transition select-none"
                            >
                              {ms.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950/40 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-bento-secondary/40 shrink-0" />
                              )}
                              <span className={ms.completed ? "line-through text-bento-text-muted/40 font-semibold" : "font-semibold text-white/90"}>
                                {ms.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Add Goal Form */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bento-card rounded-3xl border border-bento-secondary/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Set Academic Goal Roadmap</h3>
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="text-bento-text-muted hover:text-white text-xl cursor-pointer font-bold outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Goal Target Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepare Artificial Intelligence Research Paper"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Target Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none text-sm cursor-pointer"
                  >
                    <option value="academic" className="bg-bento-bg text-white">Academic Deliverable</option>
                    <option value="career" className="bg-bento-bg text-white">Professional Career</option>
                    <option value="personal" className="bg-bento-bg text-white">Personal Development</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Target End Date</label>
                  <input
                    type="date"
                    value={goalDueDate}
                    onChange={(e) => setGoalDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-sm text-bento-text-muted"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bento-secondary uppercase tracking-wider block mb-1.5">Milestones checklist (one per line)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g.&#10;Outline thesis topics&#10;Draft introductory paragraphs&#10;Generate proof computations"
                  value={milestonesText}
                  onChange={(e) => setMilestonesText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-bento-secondary/20 bg-bento-bg text-white focus:border-bento-primary/60 focus:outline-none placeholder-bento-text-muted/30 text-xs resize-none font-semibold leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-bento-secondary/10">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 border border-bento-secondary/20 text-bento-text-muted rounded-xl text-xs font-bold hover:bg-bento-bg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-bento-primary hover:bg-bento-primary/95 text-bento-bg rounded-xl text-xs font-bold shadow-sm cursor-pointer transition"
                >
                  Publish Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
