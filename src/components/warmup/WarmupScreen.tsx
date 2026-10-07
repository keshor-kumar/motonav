import { useEffect, useState } from "react";
import { X, Play, Pause, ChevronLeft, ChevronRight, SkipForward, CheckCircle2 } from "lucide-react";
import WarmupIllustration from "@/components/warmup/WarmupIllustration";
import { WARMUP_EXERCISES } from "@/data/warmupExercises";

interface WarmupScreenProps {
  onClose: () => void;
  onContinueToRide?: () => void;
}

/**
 * Full-screen pre-ride warm-up: 6 simple stretches with a timer, prev/next/
 * skip, and a progress indicator. General warm-up only — not medical advice
 * (disclaimer shown throughout and again on completion).
 */
export default function WarmupScreen({ onClose, onContinueToRide }: WarmupScreenProps) {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(WARMUP_EXERCISES[0].durationSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const exercise = WARMUP_EXERCISES[index];
  const isLast = index === WARMUP_EXERCISES.length - 1;

  useEffect(() => {
    setSecondsLeft(exercise.durationSeconds);
    setRunning(false);
  }, [index, exercise.durationSeconds]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      if (isLast) setDone(true);
      else setIndex((i) => i + 1);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft, isLast]);

  function goNext() {
    if (isLast) setDone(true);
    else setIndex((i) => i + 1);
  }
  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  if (done) {
    return (
      <div className="warmup-screen">
        <button className="icon-btn warmup-screen__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div className="warmup-screen__done">
          <CheckCircle2 size={56} color="var(--accent-teal)" />
          <h2>Warm-up completed</h2>
          <p className="warmup-screen__disclaimer">
            Stop if you feel pain or dizziness. This is a general warm-up, not medical advice.
          </p>
          <button className="btn btn--primary btn--lg btn--full" onClick={onContinueToRide ?? onClose}>
            Continue to ride
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="warmup-screen">
      <header className="warmup-screen__header">
        <button className="icon-btn" onClick={onClose} aria-label="Close warm-up">
          <X size={20} />
        </button>
        <span className="warmup-screen__progress-label">
          {index + 1} / {WARMUP_EXERCISES.length}
        </span>
      </header>

      <div className="warmup-screen__progress-dots">
        {WARMUP_EXERCISES.map((e, i) => (
          <span key={e.id} className={`warmup-screen__dot ${i <= index ? "warmup-screen__dot--active" : ""}`} />
        ))}
      </div>

      <div className="warmup-screen__illustration">
        <WarmupIllustration exerciseId={exercise.id} />
      </div>

      <h2 className="warmup-screen__name">{exercise.name}</h2>
      <p className="warmup-screen__instructions">{exercise.instructions}</p>

      <div className="warmup-screen__timer">{secondsLeft}s</div>

      <div className="warmup-screen__controls">
        <button className="icon-btn icon-btn--lg" onClick={goPrev} disabled={index === 0} aria-label="Previous exercise">
          <ChevronLeft size={20} />
        </button>
        <button className="warmup-screen__play" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause" : "Start"}>
          {running ? <Pause size={26} /> : <Play size={26} />}
        </button>
        <button className="icon-btn icon-btn--lg" onClick={goNext} aria-label={isLast ? "Finish" : "Next exercise"}>
          <ChevronRight size={20} />
        </button>
      </div>

      <button className="btn btn--ghost btn--md warmup-screen__skip" onClick={goNext}>
        <SkipForward size={15} /> Skip
      </button>

      <p className="warmup-screen__disclaimer">
        Stop if you feel pain or dizziness. This is a general warm-up, not medical advice.
      </p>
    </div>
  );
}
