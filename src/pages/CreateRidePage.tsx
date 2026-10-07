import FormPageShell from "@/components/layout/FormPageShell";
import CreateRideForm from "@/components/ride/CreateRideForm";

export default function CreateRidePage() {
  return (
    <FormPageShell
      title="Start a ride"
      lede="Name it, pick a destination, and share the link. Your crew shows up live on the map the moment they join."
      image="/images/group-ride.webp"
    >
      <CreateRideForm />
    </FormPageShell>
  );
}
