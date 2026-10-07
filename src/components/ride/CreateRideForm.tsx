import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, PartyPopper } from "lucide-react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ShareRideCard from "@/components/ride/ShareRideCard";
import { useGroupRide } from "@/context/GroupRideContext";
import { searchPlaces } from "@/services/geocodingService";
import type { GroupRide } from "@/types";

/**
 * Real Create Ride flow: resolves the typed destination to real coordinates
 * via Geoapify, then creates the ride on the MotoNav backend (the ride code
 * is generated and stored there — never invented client-side). Each rider
 * navigates from their own current GPS, so there's no "starting location"
 * field here, unlike the Stage 1 mock.
 */
export default function CreateRideForm() {
  const navigate = useNavigate();
  const { createRide } = useGroupRide();
  const [rideName, setRideName] = useState("");
  const [riderName, setRiderName] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRide, setCreatedRide] = useState<GroupRide | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const results = await searchPlaces(destination);
      if (results.length === 0) {
        throw new Error(`Couldn't find "${destination}". Try a more specific search.`);
      }
      const place = results[0];
      const ride = await createRide({
        rideName,
        riderName,
        destination: place.label,
        destinationLatitude: place.coords.lat,
        destinationLongitude: place.coords.lng,
      });
      setCreatedRide(ride);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't create the ride. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdRide) {
    return (
      <Card className="ride-result" elevated>
        <span className="ride-result__eyebrow ride-result__eyebrow--success">
          <PartyPopper size={14} /> Ride created successfully
        </span>
        <h2 className="ride-result__id">{createdRide.rideCode}</h2>
        <p className="ride-result__name">{createdRide.rideName}</p>

        <div className="ride-result__grid">
          <div>
            <span className="field-label">Destination</span>
            <span>{createdRide.destination}</span>
          </div>
        </div>

        <ShareRideCard rideCode={createdRide.rideCode} rideName={createdRide.rideName} />

        <Button fullWidth size="lg" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <form className="ride-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Ride name</span>
        <input
          required
          value={rideName}
          onChange={(e) => setRideName(e.target.value)}
          placeholder="e.g. Chennai → Ooty Weekend Ride"
        />
      </label>

      <label className="field">
        <span className="field-label">Your name</span>
        <input required value={riderName} onChange={(e) => setRiderName(e.target.value)} placeholder="e.g. Sathagan" />
      </label>

      <label className="field">
        <span className="field-label">Destination</span>
        <input
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Ooty"
        />
      </label>

      {errorMessage && (
        <div className="form-error">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={submitting}
        icon={submitting ? <Loader2 className="spin" size={18} /> : undefined}
      >
        {submitting ? "Creating ride…" : "Create ride"}
      </Button>
    </form>
  );
}
