import { Alert } from "@/components/ui";

import { noticeContent } from "../notices";
import type { AuthNotice } from "../routes";

export function AuthNoticeAlert({ notice }: { notice: AuthNotice }) {
  const content = noticeContent[notice];
  return (
    <Alert tone={content.tone} title={content.title}>
      {content.body}
    </Alert>
  );
}
