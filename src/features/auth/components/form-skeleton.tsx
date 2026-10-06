import { Skeleton } from "@/components/ui";

import styles from "./auth-form.module.css";

/** Placeholder while the form's request-time data (query parameters) resolves. */
export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className="visually-hidden">Loading form</span>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className={styles.skeletonField}>
          <Skeleton width="30%" />
          <Skeleton height="var(--control-height-md)" shape="block" />
        </div>
      ))}
      <Skeleton height="var(--control-height-lg)" shape="block" />
    </div>
  );
}
