import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CAPremiumSections } from "@/components/landing/CAPremiumSections";
import { WhatsAppPopup } from "@/components/landing/WhatsAppPopup";
import {
  WhyChooseUs,
  LiveStats,
  Testimonials,
  TopRankers,
  AppPromo,
  FAQ,
  FinalCta,
  Footer,
  BackToTop,
} from "@/components/landing/LandingSections";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <Hero />
      <CAPremiumSections />
      <Features />
      <WhyChooseUs />
      <LiveStats />
      <Testimonials />
      <TopRankers />
      <AppPromo />
      <FAQ />
      <FinalCta />
      <Footer />
      <BackToTop />
      <WhatsAppPopup />
    </main>
  );
}
