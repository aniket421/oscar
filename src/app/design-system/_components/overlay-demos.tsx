"use client";

import { useState } from "react";

import { ChevronDownIcon, MoreIcon } from "@/components/icons";
import {
  Button,
  Dialog,
  DropdownMenu,
  IconButton,
  Input,
  useToast,
  type ToastTone,
} from "@/components/ui";

import styles from "../showcase.module.css";
import { Demo } from "./showcase-section";

const toastExamples: Record<ToastTone, { title: string; description: string }> = {
  info: { title: "Session paused", description: "Resume whenever you are ready." },
  success: { title: "Settings saved", description: "Your preferences were updated." },
  warning: { title: "Microphone is quiet", description: "Move closer or raise the input level." },
  error: { title: "Upload failed", description: "Check your connection and try again." },
};

export function OverlayDemos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <div className={styles.stack}>
      <Demo title="Dialog">
        <div className={styles.row}>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete draft
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Rename session"
          description="Give this practice session a name you will recognize later."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Save</Button>
            </>
          }
        >
          <Input label="Session name" placeholder="Behavioral practice" />
        </Dialog>
        <Dialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          size="sm"
          title="Delete this draft?"
          description="This cannot be undone."
          dismissOnBackdrop={false}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Keep draft
              </Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(false)}>
                Delete
              </Button>
            </>
          }
        />
      </Demo>

      <Demo title="Dropdown menu">
        <div className={styles.row}>
          <DropdownMenu
            label="Session actions"
            items={[
              { id: "rename", label: "Rename", onSelect: () => setLastAction("Rename") },
              { id: "duplicate", label: "Duplicate", onSelect: () => setLastAction("Duplicate") },
              {
                id: "export",
                label: "Export (coming later)",
                onSelect: () => undefined,
                disabled: true,
              },
              {
                id: "delete",
                label: "Delete",
                destructive: true,
                onSelect: () => setLastAction("Delete"),
              },
            ]}
            trigger={(triggerProps) => (
              <Button variant="outline" trailingIcon={<ChevronDownIcon />} {...triggerProps}>
                Actions
              </Button>
            )}
          />
          <DropdownMenu
            label="More options"
            align="end"
            items={[
              { id: "settings", label: "Settings", onSelect: () => setLastAction("Settings") },
              { id: "help", label: "Help", onSelect: () => setLastAction("Help") },
            ]}
            trigger={(triggerProps) => (
              <IconButton label="More options" icon={<MoreIcon size={18} />} {...triggerProps} />
            )}
          />
          <p className="text-small text-muted" aria-live="polite">
            {lastAction ? `Selected: ${lastAction}` : "No action selected"}
          </p>
        </div>
      </Demo>

      <Demo title="Toast">
        <div className={styles.row}>
          {(Object.keys(toastExamples) as ToastTone[]).map((tone) => (
            <Button
              key={tone}
              variant="outline"
              size="sm"
              onClick={() => toast({ tone, ...toastExamples[tone] })}
            >
              {tone[0]?.toUpperCase() + tone.slice(1)} toast
            </Button>
          ))}
        </div>
      </Demo>
    </div>
  );
}
