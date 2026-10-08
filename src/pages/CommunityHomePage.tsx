import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Hash, MessageCircle, Trash2 } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import CreateCommunityForm from "@/components/community/CreateCommunityForm";
import { useSavedCommunities } from "@/hooks/useCommunitySession";

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const { list, remove } = useSavedCommunities();
  const [code, setCode] = useState("");

  function onJoin(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) navigate(`/community/${clean}`);
  }

  return (
    <PageShell title="Moto Community" lede="Chat with your riding crew — text and voice messages, joined with a code or a link. No accounts needed.">
      {list.length > 0 && (
        <section className="cm-section" aria-labelledby="my-communities">
          <h2 id="my-communities" className="cm-section__title">Your communities</h2>
          <ul className="cm-list">
            {list.map((c) => (
              <li key={c.code} className="cm-list__item">
                <Link to={`/community/${c.code}`} className="cm-list__open">
                  <MessageCircle size={20} aria-hidden="true" />
                  <span className="cm-list__text">
                    <strong>{c.name}</strong>
                    <small>
                      <span className="mono">{c.code}</span> · you are {c.riderName}
                    </small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <button type="button" className="icon-btn" onClick={() => remove(c.code)} aria-label={`Remove ${c.name} from this device`} title="Remove from this device">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="cm-grid">
        <CreateCommunityForm />

        <form className="card cm-form" onSubmit={onJoin}>
          <h2 className="cm-form__title">Join with a code</h2>
          <p className="cm-form__lede">Got a code like <span className="mono">MNCHENNAI82</span> or a link? Enter the code to join.</p>
          <label className="field">
            <span className="field-label">Community code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MNCHENNAI82"
              maxLength={20}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="mono"
            />
          </label>
          <button type="submit" className="btn btn--secondary btn--lg btn--full" disabled={code.trim().length < 5}>
            <Hash size={18} aria-hidden="true" /> Find community
          </button>
        </form>
      </div>
    </PageShell>
  );
}
