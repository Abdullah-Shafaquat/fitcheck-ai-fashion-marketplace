"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FiVideo,
  FiVideoOff,
  FiCamera,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

interface LiveCameraRecorderProps {
  onRecorded: (result: { path: string; duration: number; blob: Blob }) => void;
  maxDurationSeconds?: number;
}

type RecorderError =
  | "permission"
  | "unavailable"
  | "unsupported"
  | "network"
  | "unknown"
  | null;

export default function LiveCameraRecorder({
  onRecorded,
  maxDurationSeconds = 60,
}: LiveCameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [startedAt, setStartedAt] = useState(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<RecorderError>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCamera = async () => {
    setRecordingError(null);
    setUploadError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError("unsupported");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setRecordingError("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraOn(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setRecordingError("permission");
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setRecordingError("unavailable");
      } else {
        setRecordingError("unknown");
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startRecording = () => {
    if (!streamRef.current || !cameraOn) return;
    chunksRef.current = [];
    setPreviewUrl(null);
    setUploadError("");
    setRecordingError(null);
    const stream = streamRef.current;
    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      setStartedAt(0);
      finishBlob(blob);
    };
    const start = Date.now();
    recorder.start(1000);
    setStartedAt(start);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      setElapsed(sec);
      if (sec >= maxDurationSeconds && recorder.state === "recording") {
        recorder.stop();
      }
    }, 500);
  };

  const stopRecording = () => {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const pickMime = (): string | undefined => {
    const candidates = ["video/webm;codecs=vp9", "video/webm", "video/mp4", "video/quicktime"];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  };

  const finishBlob = async (blob: Blob) => {
    if (blob.size < 1000) {
      setRecordingError("unknown");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // Live-camera recording: the blob is uploaded to the private
      // verification endpoint — NOT a normal file upload.
      const fd = new FormData();
      fd.append("file", blob, "live-verification.webm");
      fd.append("kind", "video");
      const res = await fetch("/api/seller/verification/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed.");
        return;
      }
      const duration = Math.floor(elapsed);
      setPreviewUrl(URL.createObjectURL(blob));
      onRecorded({ path: data.path, duration, blob });
    } catch {
      setUploadError("Network error uploading your recording. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const clearAndRestart = () => {
    setPreviewUrl(null);
    setUploadError("");
    stopCamera();
    setRecordingError(null);
  };

  const errorMessage = (err: RecorderError) => {
    switch (err) {
      case "permission":
        return "Camera/microphone permission was denied. Please allow access in your browser and try again.";
      case "unavailable":
        return "No camera or microphone was detected on this device.";
      case "unsupported":
        return "Live video recording is not supported by your browser. Please use a recent Chrome, Edge, or Firefox.";
      default:
        return "We could not start recording. Please try again.";
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-black aspect-video relative">
        {!cameraOn && !previewUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-gray-900">
            <FiVideoOff size={32} className="text-gray-500 mb-3" />
            <p className="text-sm text-gray-300 mb-4">
              Start your camera and record a short live video to verify your identity.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl px-5 py-2.5 hover:bg-[#e05a2b] transition-colors"
            >
              <FiVideo size={16} /> Start Camera
            </button>
          </div>
        )}

        {!cameraOn && previewUrl && (
          <video
            src={previewUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {cameraOn && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {recording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-semibold">
              REC {Math.min(elapsed, maxDurationSeconds)}s
            </span>
          </div>
        )}
      </div>

      {recordingError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5">
          <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
          <span>{errorMessage(recordingError)}</span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5">
          <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!cameraOn && !recording && !previewUrl && (
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            <FiCamera size={15} /> Enable Camera
          </button>
        )}

        {cameraOn && !recording && !uploading && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 bg-red-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-red-600 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white" /> Start Recording
          </button>
        )}

        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-red-700 transition-colors"
          >
            <FiVideoOff size={15} /> Stop &amp; Upload
          </button>
        )}

        {uploading && (
          <button
            type="button"
            disabled
            className="flex items-center gap-2 bg-gray-100 text-gray-500 text-sm font-semibold rounded-xl px-4 py-2.5 cursor-wait"
          >
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Uploading…
          </button>
        )}

        {(cameraOn || previewUrl) && !recording && !uploading && (
          <button
            type="button"
            onClick={clearAndRestart}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw size={15} /> Reset
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
          <FiCheckCircle size={14} />
          Recording saved ({Math.min(elapsed, maxDurationSeconds)}s). You can re-record if needed.
        </div>
      )}
    </div>
  );
}
