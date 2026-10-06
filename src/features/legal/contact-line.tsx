import Link from "next/link";

import { getContactEmail } from "./contact";

/** "How to reach us" sentence used inside legal documents. */
export function ContactLine() {
  const email = getContactEmail();
  return email ? (
    <p>
      Questions about this document can be sent to <a href={`mailto:${email}`}>{email}</a>.
    </p>
  ) : (
    <p>
      Questions about this document can be sent using the details on our{" "}
      <Link href="/contact">Contact page</Link>.
    </p>
  );
}
