import { useCallback, useState } from "react";
import type { CommunitySessionData } from "@/services/communityService";

// One saved member session per community code, in localStorage (no accounts). The server token is what
// actually authorises requests; this just remembers it across refreshes. Wrapped in try/catch because
// storage can be unavailable (private mode).

const KEY = "motonav.communities.v1";
const NAME_KEY = "motonav.riderName";

export interface SavedCommunity {
  code: string;
  name: string;
  token: string;
  memberId: string;
  riderName: string;
  lastOpened: number;
}

type Store = Record<string, SavedCommunity>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — session just won't survive a refresh */
  }
}

export function getSavedCommunity(code: string): SavedCommunity | null {
  return read()[code.toUpperCase()] ?? null;
}

export function saveCommunitySession(s: CommunitySessionData) {
  const store = read();
  store[s.community.code] = {
    code: s.community.code,
    name: s.community.name,
    token: s.token,
    memberId: s.me.id,
    riderName: s.me.name,
    lastOpened: Date.now(),
  };
  write(store);
  rememberRiderName(s.me.name);
}

export function forgetCommunity(code: string) {
  const store = read();
  delete store[code.toUpperCase()];
  write(store);
}

export function rememberRiderName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
export function recallRiderName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The list of communities this browser has joined, newest first. */
export function useSavedCommunities() {
  const [list, setList] = useState<SavedCommunity[]>(() => Object.values(read()).sort((a, b) => b.lastOpened - a.lastOpened));
  const refresh = useCallback(() => setList(Object.values(read()).sort((a, b) => b.lastOpened - a.lastOpened)), []);
  const remove = useCallback(
    (code: string) => {
      forgetCommunity(code);
      refresh();
    },
    [refresh]
  );
  return { list, refresh, remove };
}
