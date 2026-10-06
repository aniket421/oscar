import { Skeleton } from "@/components/ui";

import styles from "./skeletons.module.css";

/** Announces the loading region once; the skeleton shapes are decorative. */
function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.region} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      {children}
    </div>
  );
}

function HeaderBlock() {
  return (
    <div className={styles.header}>
      <Skeleton width="6rem" height="0.75rem" />
      <Skeleton width="min(22rem, 80%)" height="2.25rem" />
      <Skeleton width="min(32rem, 95%)" />
    </div>
  );
}

function RowList({ rows }: { rows: number }) {
  return (
    <div className={styles.rows}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton shape="circle" className={styles.marker} />
          <div className={styles.rowText}>
            <Skeleton width="45%" />
            <Skeleton width="70%" height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mirrors the dashboard: header, start panel, two columns of sections. */
export function DashboardSkeleton() {
  return (
    <Loading label="Loading your dashboard">
      <HeaderBlock />
      <Skeleton shape="block" className={styles.panel} />
      <div className={styles.columns}>
        <div className={styles.column}>
          <Skeleton width="10rem" height="1.25rem" />
          <RowList rows={4} />
        </div>
        <div className={styles.column}>
          <Skeleton width="6rem" height="1.25rem" />
          <RowList rows={2} />
        </div>
      </div>
    </Loading>
  );
}

/** Mirrors a workspace page: header and one content region. */
export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <Loading label={label}>
      <HeaderBlock />
      <RowList rows={3} />
    </Loading>
  );
}

/** Mirrors a content region below a page header that is already visible. */
export function ContentSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label}>
      <RowList rows={3} />
    </Loading>
  );
}
