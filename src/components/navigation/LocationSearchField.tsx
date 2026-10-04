import { FormEvent, useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin, AlertCircle } from "lucide-react";
import { searchPlaces } from "@/services/geocodingService";
import type { SearchResult } from "@/types";

interface LocationSearchFieldProps {
  label: string;
  placeholder: string;
  initialValue?: string;
  onSelect: (result: SearchResult) => void;
}

const DEBOUNCE_MS = 450;
const MIN_QUERY_LENGTH = 3;

/**
 * Geoapify-backed search field: debounced-as-you-type (never on every
 * keystroke — waits for a pause) once the query is long enough to be
 * useful, plus an explicit search button/Enter for an immediate lookup.
 * Works for any place Geoapify can geocode — no hardcoded location list.
 */
export default function LocationSearchField({ label, placeholder, initialValue, onSelect }: LocationSearchFieldProps) {
  const [query, setQuery] = useState(initialValue ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0); // guards against a slow, stale response overwriting a newer one
  const justPickedRef = useRef(false); // suppresses a re-search right after selecting a result

  async function runSearch(text: string) {
    const thisRequestId = ++requestIdRef.current;
    setStatus("searching");
    setErrorMessage(null);
    try {
      const found = await searchPlaces(text);
      if (requestIdRef.current !== thisRequestId) return; // superseded by a newer search
      setResults(found);
      setStatus("done");
    } catch (err) {
      if (requestIdRef.current !== thisRequestId) return;
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Search failed. Please try again.");
    }
  }

  // Debounced auto-search as the user types.
  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      return;
    }
    debounceRef.current = setTimeout(() => void runSearch(trimmed), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) return;
    void runSearch(trimmed);
  }

  function handlePick(result: SearchResult) {
    onSelect(result);
    justPickedRef.current = true;
    setQuery(result.label);
    setResults([]);
    setStatus("idle");
  }

  return (
    <div className="loc-search">
      <span className="field-label">{label}</span>
      <form className="loc-search__row" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
        />
        <button type="submit" className="loc-search__btn" aria-label={`Search ${label.toLowerCase()}`} disabled={status === "searching"}>
          {status === "searching" ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
        </button>
      </form>

      {status === "searching" && <p className="loc-search__hint">Searching for {query}…</p>}

      {status === "error" && (
        <p className="loc-search__hint loc-search__hint--error">
          <AlertCircle size={13} /> {errorMessage}
        </p>
      )}

      {status === "done" && results.length === 0 && (
        <p className="loc-search__hint">No results for "{query}". Try a different search.</p>
      )}

      {results.length > 0 && (
        <ul className="loc-search__results">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => handlePick(result)}>
                <MapPin size={14} />
                <span>{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
