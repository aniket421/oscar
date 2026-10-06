import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { getContactEmail } from "@/features/legal";

import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the Oscar team.",
};

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <Container width="narrow" className={styles.page}>
      <div className={styles.content}>
        <h1 className="text-h1">Contact</h1>
        {email ? (
          <>
            <p className="text-lead">
              Questions about your account, privacy, or Oscar in general? Email the team and we will
              get back to you.
            </p>
            <p>
              <a href={`mailto:${email}`} className={styles.email}>
                {email}
              </a>
            </p>
          </>
        ) : (
          <p className="text-lead">
            A contact address has not been published yet. It will appear on this page before Oscar
            opens to the public.
          </p>
        )}
        <p className="text-small text-muted">
          For how your information is handled, see the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </Container>
  );
}
