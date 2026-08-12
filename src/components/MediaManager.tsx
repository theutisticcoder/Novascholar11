import React, { useState, useRef } from "react";
import { Upload, Mic, Square, Trash2, AlertCircle, Loader2, FileText, Image as ImageIcon, Headphones, Copy, Check, Maximize2, X, Edit2 } from "lucide-react";
import Tesseract from "tesseract.js";
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
  const [loadingMessage, setLoadingMessage] = useState<string>("Processing file...");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [expandedIds, setExpandedIds] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalTranscript, setModalTranscript] = useState<{ name: string; text: string } | null>(null);
  const [liveSpeechText, setLiveSpeechText] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyTranscript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  // Handle file uploads with Tesseract open OCR and client processing
  const handleUploadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      let type: "image" | "audio" | "document" = "document";
      let transcription = "";

      if (file.type.startsWith("image/")) {
        type = "image";
        setLoadingMessage("Running Tesseract Open OCR engine on image...");
        const result = await Tesseract.recognize(file, "eng");
        transcription = result.data.text ? result.data.text.trim() : "No text detected in image by Tesseract OCR.";
      } else if (file.type.startsWith("audio/")) {
        type = "audio";
        transcription = liveSpeechText.trim() || `Audio file attached: ${file.name}`;
      } else if (file.type === "application/pdf" || file.type.startsWith("text/")) {
        type = "document";
        setLoadingMessage("Reading document text...");
        if (file.type === "text/plain") {
          transcription = await file.text();
        } else {
          transcription = `Document attachment: ${file.name}`;
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
      setLiveSpeechText("");
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

  // Voice Dictation with Web Speech API
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setLiveSpeechText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `lecture-recording-${Date.now()}.webm`, { type: "audio/webm" });
        await handleUploadFile(audioFile);

        stream.getTracks().forEach((track) => track.stop());
      };

      // Try browser Web Speech API for real-time dictation
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + " ";
          }
          setLiveSpeechText(text);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

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
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

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
          accept="image/*,audio/*,text/plain,application/pdf"
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
            Images (Tesseract Open OCR), Audio recordings, PDF Docs, or Text (.txt)
          </p>
        </div>
      </div>

      {/* Voice Recorder Block with Web Speech Dictation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isRecording ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500"}`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Record Voice / Speech Dictation</h4>
            <p className="text-xs text-slate-500">
              {isRecording ? `Dictating live: ${formatTime(recordingTime)}` : "Record speech using browser Web Speech dictation"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer self-start md:self-auto ${
            isRecording
              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Dictation</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start Dictation</span>
            </>
          )}
        </button>
      </div>

      {/* Live dictation preview */}
      {isRecording && liveSpeechText && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
          <span className="font-bold text-indigo-600 block mb-1">Live Dictation Transcript:</span>
          <p className="italic leading-relaxed">{liveSpeechText}</p>
        </div>
      )}

      {/* Processing State */}
      {loading && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <div className="flex-1">
            <span className="font-semibold text-indigo-800">{loadingMessage}</span>
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
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded Attachments ({media.length})</h4>
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

                {/* OCR/Transcript Section */}
                {item.transcription && (
                  <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-500" />
                        <span>{item.type === "image" ? "Tesseract Open OCR" : "Text Record"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleCopyTranscript(item.id, item.transcription!)}
                          className="p-1 hover:text-indigo-600 rounded transition cursor-pointer flex items-center gap-0.5"
                          title="Copy Text"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalTranscript({ name: item.name, text: item.transcription! })}
                          className="p-1 hover:text-indigo-600 rounded transition cursor-pointer"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className={`text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-wrap overflow-y-auto ${expandedIds[item.id] ? "max-h-96" : "max-h-36"}`}>
                      {item.transcription}
                    </div>
                    {item.transcription.length > 150 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer block pt-1"
                      >
                        {expandedIds[item.id] ? "Show Less" : "Show Full Text ↓"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal View for Fullscreen Transcripts */}
      {modalTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>{modalTranscript.name} - Extracted Text</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(modalTranscript.text);
                    alert("Text copied to clipboard!");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTranscript(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-sans text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
              {modalTranscript.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
