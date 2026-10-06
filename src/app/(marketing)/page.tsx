import {
  Capabilities,
  FeatureGrid,
  FinalCta,
  Hero,
  HowItWorks,
  InterviewPreview,
  Principles,
} from "@/features/marketing";

/** Landing page. Fully static: no request-time data, no session reads. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Capabilities />
      <HowItWorks />
      <InterviewPreview />
      <FeatureGrid />
      <Principles />
      <FinalCta />
    </>
  );
}
