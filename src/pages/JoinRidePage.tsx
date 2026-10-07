import { useParams } from "react-router-dom";
import FormPageShell from "@/components/layout/FormPageShell";
import JoinRideForm from "@/components/ride/JoinRideForm";

/** Handles both /join-ride (manual code entry) and /join/:code (public shareable link / QR). */
export default function JoinRidePage() {
  const { code } = useParams<{ code?: string }>();
  return (
    <FormPageShell
      title="Join a ride"
      lede={code ? "Confirm the ride below and enter your name to join your crew." : "Enter the ride code your crew shared to hop in."}
      image="/images/fog-rider.webp"
    >
      <JoinRideForm initialCode={code} />
    </FormPageShell>
  );
}
