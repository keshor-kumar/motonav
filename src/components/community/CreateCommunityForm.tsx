import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { createCommunity } from "@/services/communityService";
import { recallRiderName, saveCommunitySession } from "@/hooks/useCommunitySession";

export default function CreateCommunityForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [riderName, setRiderName] = useState(recallRiderName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await createCommunity({ name: name.trim(), description: description.trim(), riderName: riderName.trim() });
      saveCommunitySession(session);
      navigate(`/community/${session.community.code}`, { state: { justCreated: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the community.");
      setBusy(false);
    }
  }

  return (
    <form className="card cm-form" onSubmit={onSubmit} noValidate>
      <h2 className="cm-form__title">Create a community</h2>
      <p className="cm-form__lede">A chat space for your riding crew — text and voice messages, joined with a link.</p>
      <label className="field">
        <span className="field-label">Community name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Chennai Weekend Riders" autoComplete="off" required />
      </label>
      <label className="field">
        <span className="field-label">Description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="What's this crew about?" autoComplete="off" />
      </label>
      <label className="field">
        <span className="field-label">Your rider name</span>
        <input value={riderName} onChange={(e) => setRiderName(e.target.value)} maxLength={40} placeholder="How riders will see you" autoComplete="nickname" required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={busy || name.trim().length < 2 || !riderName.trim()}>
        {busy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />} Create community
      </button>
    </form>
  );
}
