import { useParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import JoinRideForm from "@/components/ride/JoinRideForm";

/** Handles both /join-ride (manual code entry) and /join/:code (public shareable link/QR). */
export default function JoinRidePage() {
  const { code } = useParams<{ code?: string }>();

  return (
    <div className="form-page">
      <TopBar title="Join ride" showBack />
      <main className="form-page__content">
        <p className="form-page__lede">
          {code
            ? "Confirm the ride below and enter your name to join."
            : "Enter the ride code your friend shared to see the ride and hop in."}
        </p>
        <JoinRideForm initialCode={code} />
      </main>
    </div>
  );
}
