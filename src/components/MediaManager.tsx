import React, { useState, useRef } from "react";
import { Upload, Mic, Square, Trash2, CheckCircle2, AlertCircle, Loader2, Sparkles, FileText, Image as ImageIcon, Headphones } from "lucide-react";
import { MediaItem } from "../types";

interface MediaManagerProps {
  media: MediaItem[];
  onAddMedia: (item: MediaItem) => void;
  onRemoveMedia: (id: string) => void;
}

export default function MediaManager({ media, onAddMedia, onRemoveMedia }: MediaManagerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger file selection
  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip out the data URL prefix for the API
        resolve(base64String.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file uploads
  const handleUploadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      let type: "image" | "audio" | "document" = "document";
      let endpoint = "";
      let payloadKey = "";

      if (file.type.startsWith("image/")) {
        type = "image";
        endpoint = "/api/gemini/ocr";
        payloadKey = "imageBase64";
      } else if (file.type.startsWith("audio/")) {
        type = "audio";
        endpoint = "/api/gemini/transcribe";
        payloadKey = "audioBase64";
      }

      let transcription = "";

      // Call server OCR/Transcription if applicable
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [payloadKey]: base64,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Server processing failed.");
        }

        const data = await response.json();
        transcription = data.result || "";
      } else {
        // Plain text documents
        if (file.type === "text/plain") {
          const text = await file.text();
          transcription = text;
        }
      }

      const newItem: MediaItem = {
        id: `m-${Date.now()}`,
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        transcription: transcription || undefined,
        dateAdded: new Date().toISOString().split("T")[0],
      };

      onAddMedia(newItem);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process media file.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Audio Recording (Microphone)
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        await handleUploadFile(audioFile);

        // Turn off mic stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError("Microphone permission denied or unsupported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Formatting seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition ${
          dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,text/plain"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-500">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-sm">
            <button
              type="button"
              onClick={handlePickFile}
              className="text-indigo-600 font-semibold hover:underline outline-none cursor-pointer"
            >
              Click to upload
            </button>{" "}
            or drag and drop
          </div>
          <p className="text-xs text-slate-500">
            Images (OCR / Math equations), Audio (Speech Transcripts), or Text (.txt)
          </p>
        </div>
      </div>

      {/* Voice Recorder Block */}
      <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isRecording ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500"}`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Record Lecture Audio</h4>
            <p className="text-xs text-slate-500">
              {isRecording ? `Recording active: ${formatTime(recordingTime)}` : "Record direct from microphone for speech-to-text"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
            isRecording
              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Record</span>
            </>
          )}
        </button>
      </div>

      {/* Processing State */}
      {loading && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <div className="flex-1">
            <span className="font-semibold text-indigo-800">AI Processing Media...</span>
            <span className="text-xs block text-indigo-600">Running advanced OCR math formulas or transcribing dictation via Gemini 3.6 Flash</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
        </div>
      )}

      {/* Uploaded Media Inventory */}
      {media.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded Media ({media.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {media.map((item) => (
              <div key={item.id} className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 shrink-0">
                      {item.type === "image" && <ImageIcon className="w-4 h-4 text-blue-600" />}
                      {item.type === "audio" && <Headphones className="w-4 h-4 text-emerald-600" />}
                      {item.type === "document" && <FileText className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-800 truncate block max-w-[180px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400 block">{item.dateAdded}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMedia(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* OCR/Transcript Preview */}
                {item.transcription && (
                  <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-lg p-2 max-h-24 overflow-y-auto">
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                      <Sparkles className="w-3 h-3" />
                      <span>Gemini AI Insights</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {item.transcription}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
