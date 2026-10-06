"use client";

import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useId, useRef, useState } from "react";

import { UploadIcon } from "@/components/icons";
import { Alert, Button, Progress } from "@/components/ui";
import { cn } from "@/lib/cn";

import { checkResumeBasics, RESUME_ACCEPT, resumeFileMessages } from "../../resume-file";
import { uploadFile, type UploadHandle } from "../upload";
import { useHydrated } from "../use-hydrated";
import styles from "./resume.module.css";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string; progress: number }
  | { phase: "error"; message: string };

export interface ResumeUploaderProps {
  /** Replacing an existing resume (changes the wording and offers Cancel). */
  replacing?: boolean;
  onCancel?: () => void;
  /** Called after the new resume is stored. */
  onUploaded?: () => void;
}

/**
 * Picks or receives a dropped file, checks it instantly, and uploads it with progress. The
 * server repeats every check and reads the file's content before storing it.
 */
export function ResumeUploader({ replacing = false, onCancel, onUploaded }: ResumeUploaderProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const input = useRef<HTMLInputElement>(null);
  const handle = useRef<UploadHandle<unknown> | null>(null);
  const hintId = useId();
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  async function upload(file: File) {
    setAnnouncement("");
    const check = checkResumeBasics(file);
    if (!check.ok) {
      setState({ phase: "error", message: resumeFileMessages[check.error] });
      return;
    }
    setState({ phase: "uploading", fileName: file.name, progress: 0 });
    const current = uploadFile("/resume/upload", file, (fraction) =>
      setState({ phase: "uploading", fileName: file.name, progress: fraction }),
    );
    handle.current = current;
    const outcome = await current.result;
    handle.current = null;

    if (outcome.ok) {
      setState({ phase: "idle" });
      setAnnouncement("Resume uploaded. Oscar is reading it now.");
      onUploaded?.();
      router.refresh();
    } else if (outcome.aborted) {
      setState({ phase: "idle" });
      setAnnouncement("Upload cancelled.");
    } else {
      setState({ phase: "error", message: outcome.message });
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (state.phase === "uploading") return;
    const file = event.dataTransfer.files[0];
    if (file) void upload(file);
  }

  const uploading = state.phase === "uploading";

  return (
    <div className={styles.uploader}>
      <div
        className={cn(styles.dropzone, dragging && styles.dragging)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.dropIcon} aria-hidden="true">
          <UploadIcon size={20} />
        </span>
        <p className={styles.dropTitle}>
          {replacing ? "Upload a new resume" : "Upload your resume"}
        </p>
        <p id={hintId} className={styles.dropHint}>
          PDF or Word (.docx), up to 5 MB. Choose a file, or drag one here.
        </p>
        <div className={styles.dropActions}>
          <Button
            variant={replacing ? "outline" : "primary"}
            size="sm"
            onClick={() => input.current?.click()}
            disabled={uploading || !hydrated}
            aria-describedby={hintId}
          >
            Choose file
          </Button>
          {replacing && onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={uploading}>
              Keep current resume
            </Button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          name="file"
          accept={RESUME_ACCEPT}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          disabled={!hydrated}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      {state.phase === "uploading" ? (
        <div className={styles.uploadProgress}>
          <Progress
            label={`Uploading ${state.fileName}`}
            value={Math.round(state.progress * 100)}
            showValue
            size="sm"
          />
          <Button variant="ghost" size="sm" onClick={() => handle.current?.abort()}>
            Cancel upload
          </Button>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <Alert tone="error" title="Upload failed" role="alert">
          {state.message}
        </Alert>
      ) : null}

      {replacing ? (
        <p className={styles.dropHint}>
          Your current resume stays in place until the new one is stored.
        </p>
      ) : null}

      <p role="status" className="visually-hidden">
        {announcement}
      </p>
    </div>
  );
}
