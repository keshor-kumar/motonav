import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { getPublicRideInfo } from "@/services/groupRideService";
import { useGroupRide } from "@/context/GroupRideContext";
import type { PublicRideInfo } from "@/types";

interface JoinRideFormProps {
  /** Pre-fills and auto-looks-up the code when arriving via /join/:code. */
  initialCode?: string;
}

/**
 * Real Join Ride flow, backed by the MotoNav server: look up the ride by
 * code (case-insensitive, whitespace-trimmed — "mn7k42", "MN7K42", and
 * " MN7K42 " all work identically), show its name/destination, then join
 * with a rider name. Errors (ride not found, ride ended, name taken) come
 * straight from the backend and are shown as-is, never silently swallowed.
 */
export default function JoinRideForm({ initialCode }: JoinRideFormProps) {
  const navigate = useNavigate();
  const { joinRide } = useGroupRide();
  const [code, setCode] = useState(initialCode ?? "");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [rideInfo, setRideInfo] = useState<PublicRideInfo | null>(null);

  const [riderName, setRiderName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function lookup(rawCode: string) {
    const trimmed = rawCode.trim();
    if (!trimmed) return;
    setLookingUp(true);
    setLookupError(null);
    setRideInfo(null);
    try {
      const info = await getPublicRideInfo(trimmed);
      if (info.status === "ended") {
        setLookupError("This ride has ended.");
        return;
      }
      setRideInfo(info);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Ride not found. Check the ride code.");
    } finally {
      setLookingUp(false);
    }
  }

  // Arrived via /join/:code — look it up immediately, no extra tap needed.
  useEffect(() => {
    if (initialCode) void lookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault();
    void lookup(code);
  }

  async function handleJoinSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rideInfo) return;
    setJoinError(null);
    setJoining(true);
    try {
      await joinRide(rideInfo.rideCode, riderName);
      navigate("/dashboard");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't join the ride. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  if (rideInfo) {
    return (
      <Card className="ride-preview" elevated>
        <span className="ride-result__eyebrow ride-result__eyebrow--success">
          <CheckCircle2 size={14} /> Ride found
        </span>
        <h3>{rideInfo.rideName}</h3>
        <div className="ride-result__grid">
          <div>
            <span className="field-label">Destination</span>
            <span>{rideInfo.destination}</span>
          </div>
          <div>
            <span className="field-label">Riders so far</span>
            <span>{rideInfo.memberCount}</span>
          </div>
        </div>

        <form className="ride-form" onSubmit={handleJoinSubmit}>
          <label className="field">
            <span className="field-label">Your name</span>
            <input
              required
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Rahul"
              autoFocus
            />
          </label>

          {joinError && (
            <div className="form-error">
              <AlertTriangle size={16} /> {joinError}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={joining}
            icon={joining ? <Loader2 className="spin" size={18} /> : undefined}
          >
            {joining ? "Joining ride…" : "Join ride"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <form className="ride-form" onSubmit={handleLookupSubmit}>
      <label className="field">
        <span className="field-label">Ride code</span>
        <input
          required
          className="mono"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MN7K42"
          autoCapitalize="characters"
        />
      </label>

      {lookupError && (
        <div className="form-error">
          <AlertTriangle size={16} /> {lookupError}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={lookingUp}
        icon={lookingUp ? <Loader2 className="spin" size={18} /> : undefined}
      >
        {lookingUp ? "Looking up ride…" : "Find ride"}
      </Button>
    </form>
  );
}
