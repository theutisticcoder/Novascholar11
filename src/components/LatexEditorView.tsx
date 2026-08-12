import React, { useState } from "react";
import { Sparkles, Copy, Check, Plus, Code, Eye, RefreshCw, Wand2, Calculator, BookOpen, ChevronDown } from "lucide-react";
import LatexRenderer from "./LatexRenderer";

interface LatexEditorViewProps {
  initialContent?: string;
  onInsertIntoNote?: (latexBlock: string) => void;
}

export default function LatexEditorView({ initialContent = "", onInsertIntoNote }: LatexEditorViewProps) {
  const [latexCode, setLatexCode] = useState<string>(
    initialContent ||
    `$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n\n$$\\mathbf{A} \\vec{x} = \\lambda \\vec{x}$$\n\n$$f(x) = \\begin{cases} x^2 & \\text{if } x \\ge 0 \\\\ -x & \\text{if } x < 0 \\end{cases}$$`
  );
  
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  
  const [filterQuery, setFilterQuery] = useState("");

  const popularFormulaPresets = [
    { name: "Quadratic Formula", code: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { name: "Euler's Identity", code: "e^{i\\pi} + 1 = 0" },
    { name: "Gaussian Integral", code: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}" },
    { name: "Fourier Transform", code: "\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx" },
    { name: "Standard Deviation", code: "\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2}" },
    { name: "Bayes' Theorem", code: "P(A|B) = \\frac{P(B|A) P(A)}{P(B)}" },
    { name: "Matrix Multiplication", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} e & f \\\\ g & h \\end{pmatrix} = \\begin{pmatrix} ae+bg & af+bh \\\\ ce+dg & cf+dh \\end{pmatrix}" }
  ];

  const filteredPresets = popularFormulaPresets.filter(
    (p) => p.name.toLowerCase().includes(filterQuery.toLowerCase()) || p.code.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Active Category for Snippets Palette
  const [activeSnippetCategory, setActiveSnippetCategory] = useState<"basic" | "calculus" | "matrix" | "greek" | "logic">("basic");

  const snippetCategories = {
    basic: [
      { label: "Fraction", code: "\\frac{a}{b}" },
      { label: "Power", code: "x^{2}" },
      { label: "Subscript", code: "x_{i}" },
      { label: "Square Root", code: "\\sqrt{x}" },
      { label: "N-th Root", code: "\\sqrt[n]{x}" },
      { label: "Plus/Minus", code: "\\pm" },
      { label: "Multiply", code: "\\times" },
      { label: "Divide", code: "\\div" },
      { label: "Not Equal", code: "\\neq" },
      { label: "Approx", code: "\\approx" },
    ],
    calculus: [
      { label: "Definite Integral", code: "\\int_{a}^{b} f(x) dx" },
      { label: "Double Integral", code: "\\iint_D f(x,y) dA" },
      { label: "Derivative", code: "\\frac{d}{dx} f(x)" },
      { label: "Partial Derivative", code: "\\frac{\\partial f}{\\partial x}" },
      { label: "Limit", code: "\\lim_{x \\to 0} f(x)" },
      { label: "Summation", code: "\\sum_{i=1}^{n} a_i" },
      { label: "Product", code: "\\prod_{i=1}^{n} x_i" },
      { label: "Infinity", code: "\\infty" },
      { label: "Vector", code: "\\vec{v}" },
      { label: "Gradient", code: "\\nabla f" },
    ],
    matrix: [
      { label: "2x2 Parentheses Matrix", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { label: "2x2 Brackets Matrix", code: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
      { label: "Determinant 2x2", code: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}" },
      { label: "3x3 Identity Matrix", code: "\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}" },
      { label: "Piecewise Function", code: "f(x) = \\begin{cases} a & \\text{if } x > 0 \\\\ b & \\text{if } x \\le 0 \\end{cases}" },
      { label: "Aligned Equations", code: "\\begin{align} f(x) &= (x+1)^2 \\\\ &= x^2 + 2x + 1 \\end{align}" },
    ],
    greek: [
      { label: "Alpha α", code: "\\alpha" },
      { label: "Beta β", code: "\\beta" },
      { label: "Gamma γ", code: "\\gamma" },
      { label: "Delta δ", code: "\\delta" },
      { label: "Epsilon ε", code: "\\epsilon" },
      { label: "Theta θ", code: "\\theta" },
      { label: "Lambda λ", code: "\\lambda" },
      { label: "Mu μ", code: "\\mu" },
      { label: "Pi π", code: "\\pi" },
      { label: "Sigma σ", code: "\\sigma" },
      { label: "Phi φ", code: "\\phi" },
      { label: "Omega ω", code: "\\omega" },
      { label: "Cap Delta Δ", code: "\\Delta" },
      { label: "Cap Sigma Σ", code: "\\Sigma" },
      { label: "Cap Omega Ω", code: "\\Omega" },
    ],
    logic: [
      { label: "For All ∀", code: "\\forall" },
      { label: "Exists ∃", code: "\\exists" },
      { label: "Element In ∈", code: "\\in" },
      { label: "Not In ∉", code: "\\notin" },
      { label: "Subset ⊂", code: "\\subset" },
      { label: "Union ∪", code: "\\cup" },
      { label: "Intersection ∩", code: "\\cap" },
      { label: "Implies ⇒", code: "\\implies" },
      { label: "Iff ⇔", code: "\\iff" },
      { label: "Real Numbers ℝ", code: "\\mathbb{R}" },
      { label: "Naturals ℕ", code: "\\mathbb{N}" },
      { label: "Complex ℂ", code: "\\mathbb{C}" },
    ],
  };

  const handleInsertSnippet = (snippetCode: string) => {
    // Wrap in $$ if it looks like a block or append smoothly
    const formatted = snippetCode.includes("\\begin") || snippetCode.includes("\\int") || snippetCode.includes("\\sum")
      ? `\n\n$$${snippetCode}$$\n\n`
      : ` $${snippetCode}$ `;
    setLatexCode((prev) => prev + formatted);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertToNote = () => {
    if (onInsertIntoNote) {
      onInsertIntoNote(latexCode);
      setInserted(true);
      setTimeout(() => setInserted(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Math Presets */}
      <div className="bg-bento-card border border-bento-secondary/20 p-5 rounded-3xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bento-secondary/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-bento-primary/10 rounded-xl border border-bento-primary/20 text-bento-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Interactive LaTeX Math Studio</h3>
              <p className="text-[11px] text-bento-text-muted">Compose, preview, and typeset formulas using the LaTeX symbol palette and math rendering engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-bento-bg hover:bg-bento-bg/80 border border-bento-secondary/20 text-xs font-bold text-white rounded-xl transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-bento-secondary" />}
              <span>{copied ? "Copied!" : "Copy LaTeX"}</span>
            </button>

            {onInsertIntoNote && (
              <button
                onClick={handleInsertToNote}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-bento-primary hover:bg-bento-primary/90 text-bento-bg text-xs font-bold rounded-xl transition shadow-[0_0_12px_rgba(102,252,241,0.2)] cursor-pointer"
              >
                {inserted ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{inserted ? "Inserted into Note!" : "Insert into Note"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Formula Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search formula presets e.g. 'Quadratic', 'Fourier', 'Bayes', 'Integral'..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-3 pr-3 py-2 bg-bento-bg border border-bento-secondary/20 rounded-xl text-xs text-white placeholder-bento-text-muted/40 focus:outline-none focus:border-bento-primary/65"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {filteredPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setLatexCode((prev) => prev + `\n\n% ${preset.name}\n$$${preset.code}$$`)}
                className="px-2.5 py-1 bg-bento-bg hover:bg-bento-primary/10 border border-bento-secondary/20 hover:border-bento-primary/40 text-bento-primary text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snippet Symbols Toolbar Palette */}
      <div className="bg-bento-card border border-bento-secondary/15 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-bento-secondary/10 pb-2.5">
          <span className="text-xs font-bold text-bento-secondary uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-bento-primary" />
            <span>LaTeX Symbols & Preset Formula Palette</span>
          </span>

          <div className="flex items-center gap-1 text-xs">
            {(["basic", "calculus", "matrix", "greek", "logic"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveSnippetCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                  activeSnippetCategory === cat
                    ? "bg-bento-primary/15 text-bento-primary border border-bento-primary/30"
                    : "text-bento-text-muted hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet Buttons */}
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
          {snippetCategories[activeSnippetCategory].map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleInsertSnippet(s.code)}
              className="px-2.5 py-1.5 bg-bento-bg hover:bg-bento-primary/10 border border-bento-secondary/20 hover:border-bento-primary/40 text-white hover:text-bento-primary text-xs font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5"
              title={`Insert: ${s.code}`}
            >
              <span>{s.label}</span>
              <code className="text-[10px] text-bento-primary/80 font-mono">({s.code})</code>
            </button>
          ))}
        </div>
      </div>

      {/* Split Pane Workbench: Left Input Code, Right Live Math Typesetting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Raw LaTeX Editor */}
        <div className="lg:col-span-6 bg-bento-card border border-bento-secondary/15 p-4 rounded-3xl space-y-2 flex flex-col">
          <div className="flex items-center justify-between text-xs text-bento-secondary font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Code className="w-4 h-4 text-bento-primary" />
              <span>LaTeX Code Input</span>
            </span>
            <span className="text-[10px] text-bento-text-muted/60">{latexCode.length} characters</span>
          </div>

          <textarea
            rows={14}
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            placeholder="Type LaTeX here... Use $...$ for inline math and $$...$$ for block math equations."
            className="w-full flex-1 p-4 bg-bento-bg border border-bento-secondary/20 text-white rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:border-bento-primary/60 resize-none"
          />

          <div className="flex items-center justify-between text-[11px] text-bento-text-muted/70 pt-1">
            <span>Tip: Wrap block equations in <code>$$ ... $$</code></span>
            <button
              onClick={() => setLatexCode("")}
              className="text-bento-secondary hover:text-rose-400 transition font-bold cursor-pointer"
            >
              Clear Editor
            </button>
          </div>
        </div>

        {/* Right Column: Live Math Typeset Output */}
        <div className="lg:col-span-6 bg-bento-card border border-bento-secondary/15 p-5 rounded-3xl flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between text-xs text-bento-primary font-bold uppercase tracking-wider border-b border-bento-secondary/10 pb-3 mb-4">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-bento-primary" />
              <span>Live Typeset Math Preview</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-md">MathJax Active</span>
          </div>

          <div className="flex-1 bg-bento-bg/50 border border-bento-secondary/10 rounded-2xl p-6 overflow-y-auto min-h-[300px]">
            {latexCode.trim() ? (
              <LatexRenderer text={latexCode} className="text-sm text-bento-text-muted leading-relaxed font-sans" />
            ) : (
              <div className="text-center py-12 text-bento-text-muted/50 text-xs">
                Live rendered math formulas will appear here as you type.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
