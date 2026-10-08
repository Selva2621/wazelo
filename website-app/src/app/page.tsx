import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SiteBackdrop } from "@/components/site-backdrop";
import { Hero } from "@/components/home/hero";
import { Integrations } from "@/components/home/integrations";
import { StorySection } from "@/components/home/story-section";
import { Freelancers } from "@/components/home/freelancers";
import { Teams } from "@/components/home/teams";
import { FeatureIndex } from "@/components/home/feature-index";
import { Pricing } from "@/components/home/pricing";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-dvh bg-surface font-sans text-on-surface">
      <SiteBackdrop />
      <Navbar />
      <main>
        <Hero />
        <Integrations />
        <StorySection />
        <Freelancers />
        <Teams />
        <FeatureIndex />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
