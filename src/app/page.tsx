import { siteConfig } from "@/config/site";

/** Phase 0 placeholder. The real landing page is out of scope until Phase 1. */
export default function HomePage() {
  return (
    <main>
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.description}</p>
    </main>
  );
}
