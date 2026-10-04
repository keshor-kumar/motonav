import TopBar from "@/components/layout/TopBar";
import CreateRideForm from "@/components/ride/CreateRideForm";

export default function CreateRidePage() {
  return (
    <div className="form-page">
      <TopBar title="Create ride" showBack />
      <main className="form-page__content">
        <p className="form-page__lede">Set up the route, pick a date, and share the invite with your group.</p>
        <CreateRideForm />
      </main>
    </div>
  );
}
