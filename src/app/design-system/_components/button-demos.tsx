"use client";

import { useState } from "react";

import { ArrowRightIcon, MicrophoneIcon, MoreIcon } from "@/components/icons";
import { Button, IconButton, Tooltip, type ButtonVariant } from "@/components/ui";

import styles from "../showcase.module.css";
import { Demo } from "./showcase-section";

const variants: ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "destructive"];

export function ButtonDemos() {
  const [loading, setLoading] = useState(false);

  function simulateLoading() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  }

  return (
    <div className={styles.stack}>
      <Demo title="Hierarchy">
        <div className={styles.row}>
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant[0]?.toUpperCase() + variant.slice(1)}
            </Button>
          ))}
        </div>
      </Demo>
      <Demo title="Sizes">
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Demo>
      <Demo title="States">
        <div className={styles.row}>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled outline
          </Button>
          <Button loading={loading} onClick={simulateLoading}>
            {loading ? "Saving" : "Click to load"}
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
        </div>
      </Demo>
      <Demo title="With icons">
        <div className={styles.row}>
          <Button trailingIcon={<ArrowRightIcon />}>Continue</Button>
          <Button variant="outline" leadingIcon={<MicrophoneIcon />}>
            Test microphone
          </Button>
        </div>
      </Demo>
      <Demo title="Icon buttons with tooltips">
        <div className={styles.row}>
          <Tooltip content="Mute microphone">
            <IconButton label="Mute microphone" icon={<MicrophoneIcon size={18} />} />
          </Tooltip>
          <Tooltip content="More actions" side="bottom">
            <IconButton label="More actions" variant="outline" icon={<MoreIcon size={18} />} />
          </Tooltip>
          <IconButton
            label="Start recording"
            variant="secondary"
            icon={<MicrophoneIcon size={18} />}
          />
          <IconButton
            label="Unavailable action"
            variant="outline"
            disabled
            icon={<MoreIcon size={18} />}
          />
        </div>
      </Demo>
    </div>
  );
}
