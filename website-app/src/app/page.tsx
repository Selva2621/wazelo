import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SiteBackdrop } from "@/components/site-backdrop";
import { Hero } from "@/components/home/hero";
import { Integrations } from "@/components/home/integrations";
import { Setup } from "@/components/home/setup";
import { Freelancers } from "@/components/home/freelancers";
import { Teams } from "@/components/home/teams";
import { Automate } from "@/components/home/automate";
import { Pricing } from "@/components/home/pricing";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";

// Story order: connect (hero, setup), then the two ways people use Wazelo
// (freelancers, teams), then what runs on its own, then plans.
export default function LandingPage() {
  return (
    <div className="relative isolate min-h-dvh bg-surface font-sans text-on-surface">
      <SiteBackdrop />
      <Navbar />
      <main>
        <Hero />
        <Integrations />
        <Setup />
        <Freelancers />
        <Teams />
        <Automate />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
