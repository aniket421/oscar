"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useRef, useState } from "react";

import { TrashIcon, UploadIcon } from "@/components/icons";
import { Alert, Avatar, Button, Progress } from "@/components/ui";

import { idleActionState } from "../../action-state";
import { removeAvatarAction } from "../../actions";
import { AVATAR_ACCEPT, avatarFileMessages, checkAvatarBasics } from "../../resume-file";
import { uploadFile } from "../upload";
import { useHydrated } from "../use-hydrated";
import styles from "./profile.module.css";

export interface AvatarEditorProps {
  name: string;
  avatarId: string | null;
}

/** Profile photo: upload (PNG, JPEG, WebP up to 2 MB), replace, or remove. */
export function AvatarEditor({ name, avatarId }: AvatarEditorProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [removeState, removeAction, removing] = useActionState(
    async (...args: Parameters<typeof removeAvatarAction>) => {
      const result = await removeAvatarAction(...args);
      if (result.status === "success") setMessage(result.message ?? "");
      return result;
    },
    idleActionState,
  );

  async function upload(file: File) {
    setError(null);
    setMessage("");
    const check = checkAvatarBasics(file);
    if (!check.ok) {
      setError(avatarFileMessages[check.error]);
      return;
    }
    setProgress(0);
    const { result } = uploadFile<{ avatarId: string }>("/profile/avatar", file, setProgress);
    const outcome = await result;
    setProgress(null);
    if (outcome.ok) {
      setMessage("Photo updated.");
      router.refresh();
    } else if (!outcome.aborted) {
      setError(outcome.message);
    }
  }

  const busy = progress !== null || removing || !hydrated;

  return (
    <div className={styles.avatarEditor}>
      <Avatar name={name} size="lg" src={avatarId ? `/profile/avatar?v=${avatarId}` : undefined} />
      <div className={styles.avatarControls}>
        <div className={styles.avatarButtons}>
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<UploadIcon />}
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-describedby={hintId}
          >
            {avatarId ? "Change photo" : "Add photo"}
          </Button>
          {avatarId ? (
            <form action={removeAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                leadingIcon={<TrashIcon />}
                loading={removing}
                disabled={progress !== null}
              >
                {removing ? "Removing" : "Remove photo"}
              </Button>
            </form>
          ) : null}
        </div>
        <p id={hintId} className={styles.hint}>
          PNG, JPEG, or WebP, up to 2 MB.
        </p>
        <input
          ref={input}
          type="file"
          accept={AVATAR_ACCEPT}
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
        {progress !== null ? (
          <Progress label="Uploading photo" value={Math.round(progress * 100)} size="sm" />
        ) : null}
        {error || (removeState.status === "error" && removeState.message) ? (
          <Alert tone="error" role="alert">
            {error ?? removeState.message}
          </Alert>
        ) : null}
        <p role="status" className="visually-hidden">
          {message}
        </p>
      </div>
    </div>
  );
}
