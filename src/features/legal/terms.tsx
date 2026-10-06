import Link from "next/link";

import { ContactLine } from "./contact-line";
import { LegalDocument, type LegalSection } from "./legal-document";

/**
 * Terms & Conditions content. A plain-language baseline; review with legal
 * counsel (including governing law and the operating entity) before launch.
 */
export const termsLastUpdated = "2026-10-06";

const sections: LegalSection[] = [
  {
    id: "the-service",
    title: "The service",
    content: (
      <p>
        Oscar is an interview preparation and coaching platform. It is designed to help you practice
        for job interviews and improve through feedback. These Terms apply whenever you use Oscar,
        including its website and your account.
      </p>
    ),
  },
  {
    id: "in-development",
    title: "A service in development",
    content: (
      <p>
        Oscar is in active development. Features may be added, changed, or removed, and some
        described on the website are not yet available. Features that are not yet available are
        labelled as such.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    content: (
      <ul>
        <li>Provide accurate information when you create an account.</li>
        <li>Keep your password confidential and tell us if you suspect unauthorized use.</li>
        <li>You are responsible for activity that happens under your account.</li>
      </ul>
    ),
  },
  {
    id: "no-guarantee",
    title: "Coaching, not a guarantee",
    content: (
      <p>
        Oscar provides practice and feedback to help you prepare. It does not guarantee interview
        outcomes, job offers, or employment. Feedback, including feedback produced by automated
        systems, may be incomplete or inaccurate. Use your own judgment when acting on it.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>When using Oscar, you agree not to:</p>
        <ul>
          <li>Break the law or infringe anyone else&apos;s rights.</li>
          <li>Access, or try to access, another person&apos;s account or data.</li>
          <li>Interfere with, overload, or try to bypass the security of the service.</li>
          <li>Submit content you do not have the right to share.</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    content: (
      <p>
        You keep ownership of the information and content you submit. You allow Oscar to process it
        only as needed to provide and improve your coaching, as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending your use",
    content: (
      <p>
        You can stop using Oscar at any time and ask for your account to be deleted. Oscar may
        suspend or close accounts that break these Terms.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    content: (
      <p>
        To the extent permitted by law, Oscar is provided as is and as available, without warranties
        of any kind, and Oscar is not liable for indirect or consequential losses arising from your
        use of the service. Nothing in these Terms limits rights you have under laws that cannot be
        limited by contract.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    content: (
      <p>
        These Terms may be updated as Oscar develops. The date at the top of this page shows the
        latest version. If a change is significant, you will be notified before it takes effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: <ContactLine />,
  },
];

export function Terms() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      lastUpdated={termsLastUpdated}
      intro={
        <p>
          These Terms explain the rules for using Oscar, an interview preparation and coaching
          platform. Please read them together with the Privacy Policy.
        </p>
      }
      sections={sections}
    />
  );
}
