import {
  Features,
  Footer,
  Header,
  Hero,
  HowItWorks,
  Pricing,
} from "@/components/marketing";

export default function MarketingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
