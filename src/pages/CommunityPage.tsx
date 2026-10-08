import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Loader2, LogIn, RefreshCw, Users } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import ChatView from "@/components/community/ChatView";
import {
  forgetCommunity,
  getSavedCommunity,
  recallRiderName,
  saveCommunitySession,
} from "@/hooks/useCommunitySession";
import { getCommunityInfo, getCommunitySession, joinCommunity, type CommunityInfo, type CommunitySessionData } from "@/services/communityService";

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "join"; info: CommunityInfo }
  | { kind: "chat"; session: CommunitySessionData };

const normalize = (raw: string | undefined) => (raw ?? "").trim().toUpperCase();

export default function CommunityPage() {
  const params = useParams<{ code: string }>();
  const code = normalize(params.code);
  const location = useLocation();
  const navigate = useNavigate();
  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const resolve = useCallback(async () => {
    setPhase({ kind: "loading" });
    const saved = getSavedCommunity(code);
    if (saved) {
      try {
        const session = await getCommunitySession(code, saved.token);
        saveCommunitySession(session);
        setPhase({ kind: "chat", session });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        // Network / server trouble must NOT discard a perfectly good saved session.
        if (/unable to connect|temporarily unavailable|something went wrong|backend url/i.test(msg)) {
          setPhase({ kind: "error", message: msg, notFound: false });
          return;
        }
        forgetCommunity(code); // token rejected (not a member any more) -> fall through to the join page
      }
    }
    try {
      setPhase({ kind: "join", info: await getCommunityInfo(code) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load this community.";
      setPhase({ kind: "error", message, notFound: /couldn't find|doesn't look valid/i.test(message) });
    }
  }, [code]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  const onAccessLost = useCallback(() => {
    forgetCommunity(code);
    navigate(`/community/${code}`, { replace: true });
    void resolve();
  }, [code, navigate, resolve]);

  if (phase.kind === "chat") {
    const s = phase.session;
    return (
      <ChatView
        key={s.community.id}
        code={s.community.code}
        name={s.community.name}
        token={s.token}
        myId={s.me.id}
        initialMemberCount={s.community.memberCount}
        openShareInitially={justCreated}
        onAccessLost={onAccessLost}
      />
    );
  }

  return (
    <PageShell>
      {phase.kind === "loading" && (
        <div className="state-card" aria-busy="true">
          <Loader2 size={28} className="spin" aria-hidden="true" />
          <h2>Opening community…</h2>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="state-card" role="alert">
          <AlertTriangle size={28} aria-hidden="true" />
          <h2>{phase.notFound ? "Community not found" : "Couldn't open this community"}</h2>
          <p>{phase.message}</p>
          <div className="state-card__actions">
            {!phase.notFound && (
              <button type="button" className="btn btn--primary btn--md" onClick={() => void resolve()}>
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
            )}
            <Link to="/community" className="btn btn--secondary btn--md">All communities</Link>
          </div>
        </div>
      )}

      {phase.kind === "join" && (
        <JoinCard
          info={phase.info}
          onJoined={(session) => {
            saveCommunitySession(session);
            setPhase({ kind: "chat", session });
          }}
        />
      )}
    </PageShell>
  );
}

function JoinCard({ info, onJoined }: { info: CommunityInfo; onJoined: (s: CommunitySessionData) => void }) {
  const [riderName, setRiderName] = useState(recallRiderName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !riderName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onJoined(await joinCommunity(info.code, riderName.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the community.");
      setBusy(false);
    }
  }

  return (
    <form className="card cm-join" onSubmit={submit} noValidate>
      <p className="cm-join__eyebrow">You're invited to</p>
      <h1 className="cm-join__name">{info.name}</h1>
      {info.description && <p className="cm-join__desc">{info.description}</p>}
      <p className="cm-join__meta">
        <Users size={15} aria-hidden="true" /> {info.memberCount} {info.memberCount === 1 ? "rider" : "riders"} · code <span className="mono">{info.code}</span>
      </p>
      <label className="field">
        <span className="field-label">Your rider name</span>
        <input value={riderName} onChange={(e) => setRiderName(e.target.value)} maxLength={40} placeholder="How riders will see you" autoComplete="nickname" autoFocus />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={busy || !riderName.trim()}>
        {busy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />} Join Community
      </button>
    </form>
  );
}
