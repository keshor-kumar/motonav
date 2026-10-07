import LandingNavbar from "@/components/landing/LandingNavbar";
import Hero from "@/components/landing/Hero";
import GroupSection from "@/components/landing/GroupSection";
import NavigationSection from "@/components/landing/NavigationSection";
import DiscoverSection from "@/components/landing/DiscoverSection";
import ConditionsSection from "@/components/landing/ConditionsSection";
import SafetySection from "@/components/landing/SafetySection";
import PreRideSection from "@/components/landing/PreRideSection";
import ExperienceSection from "@/components/landing/ExperienceSection";
import FinalCta from "@/components/landing/FinalCta";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="lp">
      <LandingNavbar />
      <Hero />
      <GroupSection />
      <NavigationSection />
      <DiscoverSection />
      <ConditionsSection />
      <SafetySection />
      <PreRideSection />
      <ExperienceSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
