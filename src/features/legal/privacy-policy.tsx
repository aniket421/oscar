import Link from "next/link";

import { ContactLine } from "./contact-line";
import { LegalDocument, type LegalSection } from "./legal-document";

/**
 * Privacy Policy content. Written to match what the product does today.
 * Review with legal counsel before public launch, and update whenever a
 * feature changes what information is collected (see docs/architecture.md).
 */
export const privacyLastUpdated = "2026-10-06";

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect today",
    content: (
      <>
        <p>Oscar currently collects only what is needed to provide an account:</p>
        <ul>
          <li>
            <strong>Account information.</strong> Your name, email address, and the password you
            choose when you create an account.
          </li>
          <li>
            <strong>Sign-in session.</strong> Cookies that keep you signed in after you log in.
          </li>
          <li>
            <strong>Technical request data.</strong> Like any website, the infrastructure that
            serves Oscar processes standard request information, such as IP address, browser type,
            and the time of a request, to deliver and protect the service.
          </li>
        </ul>
        <p>
          Oscar does not yet collect resumes, interview recordings, or interview answers, because
          those features are not available yet. This policy will be updated before any feature that
          collects them is released.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    content: (
      <ul>
        <li>To create your account, sign you in, and keep your account secure.</li>
        <li>To send messages about your account, such as email address confirmation.</li>
        <li>To operate, maintain, and protect the service, including preventing abuse.</li>
        <li>To meet legal obligations.</li>
      </ul>
    ),
  },
  {
    id: "passwords",
    title: "Passwords and sign-in",
    content: (
      <p>
        Passwords are handled by a dedicated authentication provider and stored only in hashed form.
        Oscar&apos;s own application code never stores your password. Sign-in cookies are set so
        that scripts running in the page cannot read them.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        Oscar uses only cookies that are strictly necessary to keep you signed in. Oscar does not
        currently use advertising or analytics cookies. If that changes, this policy will be updated
        first.
      </p>
    ),
  },
  {
    id: "service-providers",
    title: "Service providers",
    content: (
      <p>
        Oscar relies on third-party providers to run the service, including an authentication
        provider that stores account credentials and infrastructure providers that host the website.
        They process information on Oscar&apos;s behalf, only to provide those services.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Sharing",
    content: (
      <p>
        Oscar does not sell your personal information and does not share it for advertising.
        Information may be disclosed when required by law or to protect the rights and safety of
        users and the service.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Retention and deletion",
    content: (
      <p>
        Account information is kept while your account exists. To delete your account and its
        information, contact us using the details in the last section of this policy.
      </p>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    content: (
      <p>
        You can ask to access, correct, or delete the personal information associated with your
        account. Depending on where you live, you may have additional rights under local law.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        Oscar is intended for people preparing for job interviews and is not directed to children.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        Oscar is in active development. When a change affects what information is collected or how
        it is used, this policy and the date at the top of the page will be updated before the
        change takes effect. See also the <Link href="/terms">Terms &amp; Conditions</Link>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: <ContactLine />,
  },
];

export function PrivacyPolicy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated={privacyLastUpdated}
      intro={
        <p>
          Oscar is an interview preparation and coaching platform. This policy explains what
          information Oscar collects, why, and the choices you have. It describes the service as it
          exists today.
        </p>
      }
      sections={sections}
    />
  );
}
