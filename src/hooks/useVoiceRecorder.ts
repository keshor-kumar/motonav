import { useCallback, useEffect, useRef, useState } from "react";
import { COMMUNITY_LIMITS } from "@/services/communityService";

export type RecorderState = "idle" | "requesting" | "recording";

export interface Recording {
  blob: Blob;
  durationMs: number;
}

/** First container/codec this browser's MediaRecorder can actually produce (Chrome/Firefox: webm/ogg; Safari: mp4). */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/mpeg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function isVoiceRecordingSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found on this device.";
  if (name === "NotReadableError" || name === "AbortError") return "The microphone is busy or unavailable. Close other apps using it and try again.";
  return "Couldn't start the microphone.";
}

interface Options {
  /** Called with the finished recording when it is sent (release / Send / auto-stop at the limit). */
  onRecorded: (rec: Recording) => void;
}

/**
 * MediaRecorder wrapper for hold-to-record voice messages. Handles: permission denial, unsupported
 * browsers, a release that happens before the microphone is ready (e.g. while the permission prompt is
 * showing), minimum/maximum length, cancel, and always releases the microphone (stops every track).
 */
export function useVoiceRecorder({ onRecorded }: Options) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const wantedRef = useRef(false); // is the user still pressing / session still wanted?
  const sendOnStopRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finish = useCallback((send: boolean) => {
    wantedRef.current = false;
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      releaseMic();
      setState("idle");
      return;
    }
    sendOnStopRef.current = send;
    try {
      rec.stop(); // the "stop" handler does the rest
    } catch {
      releaseMic();
      setState("idle");
    }
  }, [releaseMic]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);
    setNotice(null);
    if (!isVoiceRecordingSupported()) {
      setError("Voice messages aren't supported in this browser.");
      return;
    }
    wantedRef.current = true;
    setState("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      wantedRef.current = false;
      setState("idle");
      setError(describeMicError(err));
      return;
    }
    if (!wantedRef.current) {
      // Released (or cancelled) before the mic was ready — typically the first-time permission prompt.
      stream.getTracks().forEach((t) => t.stop());
      setState("idle");
      setNotice("Microphone enabled. Press and hold the mic to record.");
      return;
    }

    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      wantedRef.current = false;
      setState("idle");
      setError("This browser can't record audio in a supported format.");
      return;
    }
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      sendOnStopRef.current = false;
      setError("Recording failed. Please try again.");
      releaseMic();
      setState("idle");
    };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      releaseMic();
      recorderRef.current = null;
      setState("idle");
      setElapsedMs(0);
      if (!sendOnStopRef.current) return;
      if (durationMs < COMMUNITY_LIMITS.audioMinMs || blob.size === 0) {
        setNotice("Too short — press and hold the mic while you speak.");
        return;
      }
      onRecordedRef.current({ blob, durationMs: Math.min(durationMs, COMMUNITY_LIMITS.audioMaxMs) });
    };

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    recorder.start();
    setState("recording");
    timerRef.current = window.setInterval(() => {
      const ms = Date.now() - startedAtRef.current;
      setElapsedMs(ms);
      if (ms >= COMMUNITY_LIMITS.audioMaxMs) finish(true); // auto-send at the limit
    }, 100);
  }, [state, finish, releaseMic]);

  const stopAndSend = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => {
    wantedRef.current = false;
    finish(false);
  }, [finish]);

  const dismissMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  // Never leave the microphone on if the component unmounts mid-recording.
  useEffect(
    () => () => {
      wantedRef.current = false;
      sendOnStopRef.current = false;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    []
  );

  return { state, elapsedMs, error, notice, start, stopAndSend, cancel, dismissMessages, supported: isVoiceRecordingSupported() };
}
