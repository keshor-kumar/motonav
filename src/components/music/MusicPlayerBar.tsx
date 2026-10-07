import { Play, Pause, SkipBack, SkipForward, Volume2, Users2, Music2 } from "lucide-react";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { formatClock } from "@/utils/format";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";

// Stage 1: mock player only. Nothing here streams real audio — play/pause,
// skip, seek, and volume all just drive local UI state on fake tracks.
export default function MusicPlayerBar() {
  const { state, togglePlay, setVolume, seek, skipNext, skipPrevious } = useMusicPlayer();
  const { currentTrack, isPlaying, progressSec, volume, isGroupSynced, syncedListenerCount } = state;
  const progressPct = Math.min(100, (progressSec / currentTrack.durationSec) * 100);

  return (
    <Card className="music-player">
      <div className="panel-header">
        <div className="panel-header__title">
          <Music2 size={18} />
          <h3>Music</h3>
        </div>
        <Badge tone="muted">Mock player — Stage 1</Badge>
      </div>

      <div className="music-player__top">
        <div
          className="music-player__art"
          style={{ background: `linear-gradient(135deg, ${currentTrack.artColor}, #12151b)` }}
          aria-hidden="true"
        />
        <div className="music-player__meta">
          <span className="music-player__title">{currentTrack.title}</span>
          <span className="music-player__artist">{currentTrack.artist}</span>
        </div>
        {isGroupSynced && (
          <span className="music-player__synced" title="Mock group sync — Stage 1 preview only">
            <Users2 size={13} /> {syncedListenerCount}
          </span>
        )}
      </div>

      <div className="music-player__progress">
        <span className="mono music-player__time">{formatClock(progressSec)}</span>
        <input
          type="range"
          min={0}
          max={currentTrack.durationSec}
          value={progressSec}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          style={{ ["--fill" as string]: `${progressPct}%` }}
        />
        <span className="mono music-player__time">{formatClock(currentTrack.durationSec)}</span>
      </div>

      <div className="music-player__controls">
        <button className="icon-btn" aria-label="Previous track" onClick={skipPrevious}>
          <SkipBack size={19} />
        </button>
        <button className="music-player__play" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button className="icon-btn" aria-label="Next track" onClick={skipNext}>
          <SkipForward size={19} />
        </button>
        <div className="music-player__volume">
          <Volume2 size={16} />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ ["--fill" as string]: `${volume}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
