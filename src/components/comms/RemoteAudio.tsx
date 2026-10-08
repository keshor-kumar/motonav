import { useEffect, useRef } from "react";

interface RemoteAudioProps {
  id: string;
  stream: MediaStream;
  muted: boolean;
  register: (id: string, el: HTMLAudioElement | null) => void;
  onBlocked: () => void;
  onPlaying: () => void;
}

/** Plays one rider's incoming voice. Invisible; created per remote stream, removed on cleanup. */
export default function RemoteAudio({ id, stream, muted, register, onBlocked, onPlaying }: RemoteAudioProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    register(id, el);
    void el.play().then(onPlaying).catch(onBlocked); // browsers may block autoplay until the rider taps
    return () => {
      register(id, null);
      el.srcObject = null;
    };
  }, [id, stream, register, onBlocked, onPlaying]);
  return <audio ref={ref} autoPlay muted={muted} />;
}
