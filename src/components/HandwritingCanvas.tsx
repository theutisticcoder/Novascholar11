import React, { useRef, useState, useEffect } from "react";
import { Undo, Trash2, Edit2, ShieldAlert, Check, Save } from "lucide-react";

interface HandwritingCanvasProps {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
}

export default function HandwritingCanvas({ initialDataUrl, onSave }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#1e293b"); // slate-800
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Colors mapping
  const colors = [
    { name: "Slate", hex: "#1e293b" },
    { name: "Blue", hex: "#2563eb" },
    { name: "Red", hex: "#dc2626" },
    { name: "Green", hex: "#16a34a" },
    { name: "Purple", hex: "#7c3aed" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high-dpi canvas sizes
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(2, 2);
    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;

    // Load initial drawing if any
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
        // Save initial state to history
        setHistory([canvas.toDataURL()]);
      };
      img.src = initialDataUrl;
    } else {
      // White canvas background
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      setHistory([canvas.toDataURL()]);
    }
  }, []);

  // Update stroke styling
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = isEraser ? "#ffffff" : color;
    contextRef.current.lineWidth = brushSize;
  }, [color, brushSize, isEraser]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);

    // Save state to history
    const dataUrl = canvasRef.current.toDataURL();
    setHistory((prev) => [...prev, dataUrl]);
    onSave(dataUrl);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || history.length <= 1) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const previousStateUrl = newHistory[newHistory.length - 1];
    const rect = canvas.getBoundingClientRect();

    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, rect.width, rect.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      context.drawImage(img, 0, 0, rect.width, rect.height);
      onSave(previousStateUrl);
    };
    img.src = previousStateUrl;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);

    const dataUrl = canvas.toDataURL();
    setHistory((prev) => [...prev, dataUrl]);
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      {/* Tool Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 mr-1">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setColor(c.hex);
                  setIsEraser(false);
                }}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all border ${
                  color === c.hex && !isEraser
                    ? "ring-2 ring-indigo-500 scale-110 border-white shadow-sm"
                    : "border-slate-300"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          {/* Erase toggle */}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`p-1.5 rounded-lg border transition ${
              isEraser
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Erase Mode"
          >
            <ShieldAlert className="w-4 h-4 rotate-180" />
          </button>

          {/* Brush sizes */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
            <span className="text-xs text-slate-500 font-medium select-none">Size</span>
            <input
              type="range"
              min="1"
              max="15"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-semibold text-slate-700 w-4 text-center">{brushSize}px</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition cursor-pointer"
            title="Undo stroke"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="Clear all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-[300px] overflow-hidden relative bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block cursor-crosshair touch-none bg-white"
        />
      </div>
    </div>
  );
}
