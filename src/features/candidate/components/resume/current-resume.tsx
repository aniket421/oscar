"use client";

import { startTransition, useActionState, useRef, useState } from "react";

import { DocumentIcon, DownloadIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { Alert, Badge, Button, buttonStyles, Progress } from "@/components/ui";
import type { Resume } from "@/types/candidate";

import { idleActionState } from "../../action-state";
import { deleteResumeAction, retryResumeProcessingAction } from "../../actions";
import { formatDate, joinParts, processingErrorMessages, resumeStatusLabels } from "../../format";
import { formatFileSize } from "../../resume-file";
import { ConfirmActionDialog } from "../confirm-dialog";
import { useHydrated } from "../use-hydrated";
import { ProcessingWatcher } from "./processing-watcher";
import styles from "./resume.module.css";
import { ResumeUploader } from "./resume-uploader";

/** Failures worth retrying on the same file; the others need a different file. */
const retryable = new Set(["internal", "storage"]);

/** The current resume: its file, processing status, and actions. */
export function CurrentResume({ resume }: { resume: Resume }) {
  const hydrated = useHydrated();
  const [replacing, setReplacing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const [retryState, retryAction, retrying] = useActionState(
    retryResumeProcessingAction,
    idleActionState,
  );

  const status = resumeStatusLabels[resume.status];
  const inProgress = resume.status === "uploaded" || resume.status === "processing";

  return (
    <section aria-labelledby="current-resume" className={styles.block}>
      <h2 id="current-resume" className={styles.blockTitle}>
        Current resume
      </h2>

      <div className={styles.file}>
        <span className={styles.fileIcon} aria-hidden="true">
          <DocumentIcon size={20} />
        </span>
        <div className={styles.fileText}>
          <p className={styles.fileName}>{resume.fileName}</p>
          <p className={styles.fileMeta}>
            {joinParts([
              resume.fileType.toUpperCase(),
              formatFileSize(resume.fileSize),
              `Uploaded ${formatDate(resume.uploadedAt)}`,
            ])}
          </p>
        </div>
      </div>

      <div role="status" className={styles.statusLine}>
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className={styles.statusText}>
          {inProgress
            ? "Oscar is reading your resume. This usually takes a few seconds."
            : resume.status === "processed"
              ? `Read on ${formatDate(resume.processedAt)}.`
              : "Nothing was extracted from this file."}
        </span>
      </div>

      {inProgress ? (
        <>
          <Progress label="Reading your resume" size="sm" />
          <ProcessingWatcher resumeId={resume.id} />
        </>
      ) : null}

      {resume.status === "failed" && resume.processingError ? (
        <Alert
          tone="error"
          title="Oscar could not read this resume"
          actions={
            retryable.has(resume.processingError) ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  startTransition(() => retryAction(formData));
                }}
              >
                <input type="hidden" name="id" value={resume.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  loading={retrying}
                  disabled={!hydrated}
                >
                  {retrying ? "Starting" : "Try again"}
                </Button>
              </form>
            ) : null
          }
        >
          {processingErrorMessages[resume.processingError]}
        </Alert>
      ) : null}
      {retryState.status === "error" && retryState.message ? (
        <Alert tone="error" role="alert">
          {retryState.message}
        </Alert>
      ) : null}

      <div className={styles.actions}>
        <a
          href="/resume/file"
          download
          className={buttonStyles({ variant: "outline", size: "sm" })}
        >
          <DownloadIcon />
          Download
        </a>
        <Button
          ref={replaceButton}
          variant="outline"
          size="sm"
          leadingIcon={<UploadIcon />}
          onClick={() => setReplacing(true)}
          disabled={!hydrated || replacing}
          aria-expanded={replacing}
        >
          Replace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<TrashIcon />}
          disabled={!hydrated}
          onClick={() => setConfirmingDelete(true)}
        >
          Delete
        </Button>
      </div>

      {replacing ? (
        <ResumeUploader
          replacing
          onCancel={() => {
            setReplacing(false);
            replaceButton.current?.focus();
          }}
          onUploaded={() => setReplacing(false)}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmActionDialog
          open
          onOpenChange={(open) => setConfirmingDelete(open)}
          title="Delete your resume?"
          description="This permanently deletes the file and everything Oscar found in it. Skills you added to your profile stay there."
          action={deleteResumeAction}
          fields={{ id: resume.id }}
          confirmLabel="Delete resume"
          pendingLabel="Deleting"
          onConfirmed={() => setConfirmingDelete(false)}
        />
      ) : null}
    </section>
  );
}
