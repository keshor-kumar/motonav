import { memo } from "react";
import AudioMessage from "@/components/community/AudioMessage";
import type { CommunityMessage } from "@/services/communityService";
import { formatMessageTime } from "@/utils/format";

interface MessageBubbleProps {
  message: CommunityMessage;
  mine: boolean;
  /** Show the sender's name (first message of a run from someone else). */
  showName: boolean;
  onAudioUnavailable: () => void;
  fetchAudioUrl?: (messageId: string) => Promise<string>;
}

// React renders `text` as a text node — it is escaped, never interpreted as HTML.
function MessageBubble({ message, mine, showName, onAudioUnavailable, fetchAudioUrl }: MessageBubbleProps) {
  return (
    <div className={`msg ${mine ? "msg--mine" : "msg--theirs"}`}>
      <div className="msg__bubble">
        {!mine && showName && <span className="msg__name">{message.senderName}</span>}
        {message.type === "audio" ? (
          <AudioMessage url={message.audioUrl} durationMs={message.audioDurationMs ?? 0} onUnavailable={onAudioUnavailable} fetchFresh={fetchAudioUrl ? () => fetchAudioUrl(message.id) : undefined} />
        ) : (
          <p className="msg__text">{message.text}</p>
        )}
        <time className="msg__time" dateTime={message.createdAt}>
          {formatMessageTime(message.createdAt)}
        </time>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
