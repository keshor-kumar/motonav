import type { GroupSocket } from "@/services/socketService";
import type { PeerLinkState } from "@/utils/voiceState";

// ============================================================
// Full-mesh WebRTC audio for a small riding group. Audio flows directly
// rider-to-rider (never through Socket.IO); the existing ride socket only
// carries signalling (offer / answer / ICE). For each pair, the rider with
// the lower id is always the offerer, so two riders can never send
// colliding offers.
//
// Modular on purpose: the rest of the app only sees syncRoster / handle*
// / setTransmitting, so a future SFU can replace this class without
// touching the UI. Mesh cost grows with group size — the server caps
// voice at 8 riders for that reason.
// ============================================================

export interface MeshOptions {
  socket: GroupSocket;
  selfId: string;
  iceServers: RTCIceServer[];
  localStream: MediaStream;
  onRemoteStream: (peerId: string, stream: MediaStream | null) => void;
  onLinkState: (peerId: string, state: PeerLinkState | null) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  hasRemote: boolean;
  restarts: number;
  restartTimer: number | undefined;
}

const MAX_ICE_RESTARTS = 3;
const RESTART_DELAY_MS = 2500;

export class VoiceMesh {
  private readonly peers = new Map<string, PeerEntry>();
  private closed = false;

  constructor(private readonly opts: MeshOptions) {}

  /** Am I the one who creates the offer towards this peer? */
  private isOfferer(peerId: string): boolean {
    return this.opts.selfId < peerId;
  }

  peerIds(): string[] {
    return [...this.peers.keys()];
  }

  /** Make the set of connections match the voice roster (everyone except me). */
  syncRoster(riderIds: readonly string[]): void {
    if (this.closed) return;
    const wanted = new Set(riderIds.filter((id) => id !== this.opts.selfId));
    for (const id of this.peerIds()) if (!wanted.has(id)) this.removePeer(id);
    for (const id of wanted) {
      if (this.peers.has(id)) continue;
      const entry = this.createPeer(id);
      if (this.isOfferer(id)) void this.sendOffer(id, entry, false);
    }
  }

  async handleOffer(from: string, sdp: string): Promise<void> {
    if (this.closed || this.isOfferer(from)) return; // glare guard: I'm the offerer for this pair
    const entry = this.peers.get(from) ?? this.createPeer(from);
    try {
      await entry.pc.setRemoteDescription({ type: "offer", sdp });
      entry.hasRemote = true;
      await this.flushIce(entry);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      const out = entry.pc.localDescription?.sdp ?? answer.sdp;
      if (out) this.opts.socket.emit("rtc:answer", { to: from, sdp: out }, () => undefined);
    } catch {
      this.opts.onLinkState(from, "failed");
    }
  }

  async handleAnswer(from: string, sdp: string): Promise<void> {
    const entry = this.peers.get(from);
    if (this.closed || !entry) return;
    try {
      await entry.pc.setRemoteDescription({ type: "answer", sdp });
      entry.hasRemote = true;
      await this.flushIce(entry);
    } catch {
      this.opts.onLinkState(from, "failed");
    }
  }

  async handleIce(from: string, candidate: RTCIceCandidateInit): Promise<void> {
    const entry = this.peers.get(from);
    if (this.closed || !entry) return;
    if (!entry.hasRemote) {
      entry.pendingIce.push(candidate); // remote description not applied yet
      return;
    }
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      /* a stale candidate after a restart is harmless */
    }
  }

  /** The peer re-joined (new socket / network): drop the old link; the next roster rebuilds it. */
  resetPeer(peerId: string): void {
    this.removePeer(peerId);
  }

  /** Push-to-talk: the one local track is shared by every peer connection. */
  setTransmitting(on: boolean): void {
    for (const track of this.opts.localStream.getAudioTracks()) track.enabled = on;
  }

  /** Average round-trip time (ms) across live connections, when the browser reports it. */
  async getRoundTripMs(): Promise<number | null> {
    const samples: number[] = [];
    for (const { pc } of this.peers.values()) {
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          const r = report as { type?: string; state?: string; nominated?: boolean; currentRoundTripTime?: number };
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.nominated && typeof r.currentRoundTripTime === "number") {
            samples.push(r.currentRoundTripTime * 1000);
          }
        });
      } catch {
        /* connection closed mid-sample */
      }
    }
    return samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  }

  closePeers(): void {
    for (const id of this.peerIds()) this.removePeer(id);
  }

  close(): void {
    this.closed = true;
    this.closePeers();
  }

  // ---------- internals ----------

  private createPeer(peerId: string): PeerEntry {
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    const entry: PeerEntry = { pc, pendingIce: [], hasRemote: false, restarts: 0, restartTimer: undefined };

    for (const track of this.opts.localStream.getAudioTracks()) pc.addTrack(track, this.opts.localStream);

    pc.onicecandidate = (event) => {
      const c = event.candidate;
      if (!c) return;
      this.opts.socket.emit("rtc:ice", {
        to: peerId,
        candidate: { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment },
      });
    };
    pc.ontrack = (event) => {
      this.opts.onRemoteStream(peerId, event.streams[0] ?? new MediaStream([event.track]));
    };
    pc.onconnectionstatechange = () => this.onConnectionState(peerId, entry);

    this.peers.set(peerId, entry);
    this.opts.onLinkState(peerId, "connecting");
    return entry;
  }

  private onConnectionState(peerId: string, entry: PeerEntry): void {
    if (this.closed || this.peers.get(peerId) !== entry) return;
    switch (entry.pc.connectionState) {
      case "connected":
        entry.restarts = 0;
        window.clearTimeout(entry.restartTimer);
        entry.restartTimer = undefined;
        this.opts.onLinkState(peerId, "connected");
        break;
      case "disconnected":
      case "failed":
        this.opts.onLinkState(peerId, "reconnecting");
        this.scheduleRestart(peerId, entry);
        break;
      default:
        break;
    }
  }

  /** Only the offerer restarts ICE; the other side simply answers the new offer. */
  private scheduleRestart(peerId: string, entry: PeerEntry): void {
    if (!this.isOfferer(peerId) || entry.restartTimer !== undefined) return;
    if (entry.restarts >= MAX_ICE_RESTARTS) {
      this.opts.onLinkState(peerId, "failed");
      return;
    }
    entry.restartTimer = window.setTimeout(() => {
      entry.restartTimer = undefined;
      if (this.closed || this.peers.get(peerId) !== entry) return;
      entry.restarts += 1;
      void this.sendOffer(peerId, entry, true);
    }, RESTART_DELAY_MS);
  }

  private async sendOffer(peerId: string, entry: PeerEntry, iceRestart: boolean): Promise<void> {
    try {
      const offer = await entry.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await entry.pc.setLocalDescription(offer);
      const sdp = entry.pc.localDescription?.sdp ?? offer.sdp;
      if (!sdp) return;
      this.opts.socket.emit("rtc:offer", { to: peerId, sdp }, (ack) => {
        if (!ack.ok) this.scheduleRestart(peerId, entry); // peer not reachable yet — retry
      });
    } catch {
      this.opts.onLinkState(peerId, "failed");
    }
  }

  private async flushIce(entry: PeerEntry): Promise<void> {
    const queued = entry.pendingIce.splice(0);
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch {
        /* ignore stale candidates */
      }
    }
  }

  private removePeer(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    window.clearTimeout(entry.restartTimer);
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onconnectionstatechange = null;
    entry.pc.close();
    this.peers.delete(peerId);
    this.opts.onRemoteStream(peerId, null);
    this.opts.onLinkState(peerId, null);
  }
}
