import { Container } from "@/components/layout/container";
import { OscarPresence, OscarStatus, OscarWordmark, type OscarState } from "@/components/oscar";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Divider,
  Heading,
  Input,
  SectionHeading,
  Tabs,
  Text,
} from "@/components/ui";

import { ButtonDemos } from "./_components/button-demos";
import { FeedbackDemos } from "./_components/feedback-demos";
import { FormDemo } from "./_components/form-demo";
import { MotionDemo } from "./_components/motion-demo";
import { OverlayDemos } from "./_components/overlay-demos";
import { Demo, ShowcaseSection } from "./_components/showcase-section";
import { TokenSwatches } from "./_components/token-swatches";
import styles from "./showcase.module.css";

const sections = [
  ["identity", "Oscar identity"],
  ["color", "Color"],
  ["typography", "Typography"],
  ["spacing", "Spacing"],
  ["shape", "Radius and elevation"],
  ["motion", "Motion"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["display", "Badges, avatars, dividers"],
  ["cards", "Cards"],
  ["overlays", "Overlays"],
  ["tabs", "Tabs"],
  ["feedback", "Feedback and loading"],
  ["alerts", "Alerts"],
  ["dark", "Dark interview surface"],
  ["responsive", "Responsive"],
] as const;

const states: OscarState[] = ["idle", "listening", "thinking", "speaking", "success", "error"];

const typeScale = [
  { role: "Display", className: "text-display", sample: "Practice with purpose" },
  { role: "H1", className: "text-h1", sample: "Prepare for the real interview" },
  { role: "H2", className: "text-h2", sample: "Structured feedback" },
  { role: "H3", className: "text-h3", sample: "Behavioral round" },
  { role: "H4", className: "text-h4", sample: "Question four of eight" },
  {
    role: "Lead",
    className: "text-lead",
    sample: "Lead paragraphs introduce a section in one or two calm sentences.",
  },
  {
    role: "Body",
    className: "text-body",
    sample:
      "Body text is set at 16px with a 1.6 line height for comfortable reading across long answers and feedback.",
  },
  {
    role: "Small",
    className: "text-small",
    sample: "Small text for secondary details and metadata.",
  },
  { role: "Caption", className: "text-caption", sample: "Caption text for hints and timestamps." },
  { role: "Label", className: "text-label", sample: "Form label" },
  { role: "Overline", className: "text-overline", sample: "Section eyebrow" },
];

const spacing = ["1", "2", "3", "4", "6", "8", "12", "16", "24", "32"];
const radii = ["sm", "md", "lg", "xl"];
const shadows = ["xs", "sm", "md", "lg"];

const breakpoints = [
  { name: "Mobile", range: "< 640px", notes: "Single column. Full-width actions in dialogs." },
  { name: "Tablet", range: "640px to 1023px", notes: "Two columns where content allows." },
  { name: "Laptop", range: "1024px to 1279px", notes: "Full layouts, side navigation." },
  { name: "Desktop", range: ">= 1280px", notes: "Content capped at 1200px; gutters grow." },
];

export default function DesignSystemPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Container>
          <div className={styles.pageHeaderInner}>
            <OscarWordmark />
            <Badge tone="warning">Development only</Badge>
          </div>
        </Container>
      </header>

      <Container as="main">
        <div className={styles.intro}>
          <SectionHeading
            as="h1"
            size="h1"
            eyebrow="Phase 1"
            title="Oscar design system"
            description="Tokens, components, and patterns for every Oscar interface. This page is a QA playground, not a product page. The written source of truth is docs/design-system.md."
          />
          <nav aria-label="Design system sections">
            <ul className={styles.toc}>
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <ShowcaseSection
          id="identity"
          title="Oscar identity"
          description="The presence mark carries Oscar's state across voice, video, loading, and outcomes. Abstract by design: no mascot, no robot."
        >
          <Demo title="States">
            <ul className={styles.presenceGrid}>
              {states.map((state) => (
                <li key={state} className={styles.presenceItem}>
                  <OscarPresence state={state} size="lg" />
                  <code className="text-caption text-mono">{state}</code>
                </li>
              ))}
            </ul>
          </Demo>
          <Demo title="Sizes">
            <div className={styles.row}>
              <OscarPresence size="sm" />
              <OscarPresence size="md" />
              <OscarPresence size="lg" />
              <OscarPresence size="xl" state="listening" />
            </div>
          </Demo>
          <Demo title="Status patterns">
            <div className={styles.statusGrid}>
              <Card padding="none">
                <OscarStatus
                  state="idle"
                  title="Nothing here yet"
                  description="Empty state. Explain what will appear and offer the next step."
                  actions={<Button size="sm">Primary next step</Button>}
                />
              </Card>
              <Card padding="none">
                <OscarStatus
                  state="thinking"
                  title="Preparing your session"
                  description="Loading state. Say what is happening, not just that something is."
                />
              </Card>
              <Card padding="none">
                <OscarStatus
                  state="success"
                  title="Session complete"
                  description="Success state. Confirm the outcome and point to what comes next."
                />
              </Card>
              <Card padding="none">
                <OscarStatus
                  state="error"
                  title="Something went wrong"
                  description="Error state. Explain the problem in plain words and offer a way forward."
                  actions={
                    <Button size="sm" variant="outline">
                      Try again
                    </Button>
                  }
                />
              </Card>
            </div>
          </Demo>
        </ShowcaseSection>

        <ShowcaseSection
          id="color"
          title="Color"
          description="Semantic tokens only. Emerald is the accent; white, black, and charcoal carry the interface."
        >
          <TokenSwatches />
        </ShowcaseSection>

        <ShowcaseSection
          id="typography"
          title="Typography"
          description="Geist, self-hosted. Fluid sizes for display through H3."
        >
          <dl className={styles.typeList}>
            {typeScale.map((item) => (
              <div key={item.role} className={styles.typeRow}>
                <dt className="text-caption text-mono">
                  {item.role}
                  <br />.{item.className}
                </dt>
                <dd className={item.className}>{item.sample}</dd>
              </div>
            ))}
          </dl>
        </ShowcaseSection>

        <ShowcaseSection
          id="spacing"
          title="Spacing"
          description="4px base. Use tokens, not arbitrary values."
        >
          <ul className={styles.spaceList}>
            {spacing.map((step) => (
              <li key={step} className={styles.spaceRow}>
                <code className="text-caption text-mono">--space-{step}</code>
                <span className={styles.spaceBar} style={{ width: `var(--space-${step})` }} />
              </li>
            ))}
          </ul>
        </ShowcaseSection>

        <ShowcaseSection
          id="shape"
          title="Radius and elevation"
          description="Restrained radii and soft shadows. Depth comes from contrast and borders first."
        >
          <Demo title="Radius">
            <ul className={styles.tileGrid}>
              {radii.map((radius) => (
                <li
                  key={radius}
                  className={styles.tile}
                  style={{ borderRadius: `var(--radius-${radius})` }}
                >
                  <code className="text-caption text-mono">--radius-{radius}</code>
                </li>
              ))}
            </ul>
          </Demo>
          <Demo title="Elevation">
            <ul className={styles.tileGrid}>
              {shadows.map((shadow) => (
                <li
                  key={shadow}
                  className={styles.tile}
                  style={{ boxShadow: `var(--shadow-${shadow})` }}
                >
                  <code className="text-caption text-mono">--shadow-{shadow}</code>
                </li>
              ))}
            </ul>
          </Demo>
        </ShowcaseSection>

        <ShowcaseSection
          id="motion"
          title="Motion"
          description="Fast 120ms, standard 200ms, slow 480ms. All motion collapses under prefers-reduced-motion."
        >
          <MotionDemo />
        </ShowcaseSection>

        <ShowcaseSection id="buttons" title="Buttons">
          <ButtonDemos />
          <Demo title="Link styled as a button">
            <a href="#buttons" className={buttonStyles({ variant: "outline" })}>
              Back to buttons
            </a>
          </Demo>
        </ShowcaseSection>

        <ShowcaseSection
          id="forms"
          title="Forms"
          description="Submit empty to see validation. Every control has a label; errors and descriptions are linked to their control."
        >
          <Card>
            <FormDemo />
          </Card>
        </ShowcaseSection>

        <ShowcaseSection id="display" title="Badges, avatars, dividers">
          <Demo title="Badges">
            <div className={styles.row}>
              <Badge>Neutral</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="error">Error</Badge>
              <Badge tone="info">Info</Badge>
            </div>
          </Demo>
          <Demo title="Avatars">
            <div className={styles.row}>
              <Avatar name="Example User" size="sm" />
              <Avatar name="Example User" />
              <Avatar name="Example User" size="lg" />
              {/* An invalid inline image exercises the initials fallback without a network request. */}
              <Avatar name="Fallback Example" src="data:image/png;base64,invalid" />
            </div>
          </Demo>
          <Demo title="Dividers">
            <div className={styles.stackTight}>
              <Divider />
              <div className={styles.row}>
                <span className="text-small">Left</span>
                <Divider orientation="vertical" />
                <span className="text-small">Right</span>
              </div>
            </div>
          </Demo>
        </ShowcaseSection>

        <ShowcaseSection id="cards" title="Cards">
          <div className={styles.cardGrid}>
            <Card>
              <CardHeader>
                <CardTitle>Flat card</CardTitle>
                <CardDescription>The default. A border, no shadow.</CardDescription>
              </CardHeader>
              <CardContent>
                <Text variant="small">Use for grouped content inside a page.</Text>
              </CardContent>
            </Card>
            <Card elevation="raised">
              <CardHeader>
                <CardTitle>Raised card</CardTitle>
                <CardDescription>A soft shadow for surfaces above content.</CardDescription>
              </CardHeader>
              <CardContent>
                <Text variant="small">Use sparingly, for one focal surface per view.</Text>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>With footer</CardTitle>
                <CardDescription>Actions sit below a divider.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="ghost">
                  Secondary
                </Button>
              </CardFooter>
            </Card>
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          id="overlays"
          title="Overlays"
          description="Dialog, dropdown menu, and toast. All keyboard operable."
        >
          <OverlayDemos />
        </ShowcaseSection>

        <ShowcaseSection
          id="tabs"
          title="Tabs"
          description="Arrow keys move between tabs; Tab moves into the panel."
        >
          <Tabs
            label="Example tabs"
            items={[
              {
                value: "overview",
                label: "Overview",
                content: <Text variant="small">Overview panel content.</Text>,
              },
              {
                value: "questions",
                label: "Questions",
                content: <Text variant="small">Questions panel content.</Text>,
              },
              {
                value: "feedback",
                label: "Feedback",
                content: <Text variant="small">Feedback panel content.</Text>,
              },
              { value: "locked", label: "Disabled", content: null, disabled: true },
            ]}
          />
        </ShowcaseSection>

        <ShowcaseSection id="feedback" title="Feedback and loading">
          <FeedbackDemos />
        </ShowcaseSection>

        <ShowcaseSection id="alerts" title="Alerts">
          <div className={styles.stackTight}>
            <Alert tone="info" title="Information">
              Neutral context that helps the user decide.
            </Alert>
            <Alert tone="success" title="Success">
              The action completed as expected.
            </Alert>
            <Alert tone="warning" title="Warning">
              Something needs attention before continuing.
            </Alert>
            <Alert
              tone="error"
              title="Error"
              actions={
                <Button size="sm" variant="outline">
                  Retry
                </Button>
              }
            >
              The action failed. Say why and what to do next.
            </Alert>
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          id="dark"
          title="Dark interview surface"
          description='Apply data-theme="dark" to any container. Components re-map through semantic tokens with no code changes.'
        >
          <div data-theme="dark" className={styles.darkPanel}>
            <div className={styles.darkStage}>
              <OscarPresence state="speaking" size="xl" />
              <div className={styles.darkCopy}>
                <Text variant="overline" className={styles.accentText}>
                  Example question
                </Text>
                <Heading as="h3" size="h3">
                  Tell me about a time you had to make a decision with incomplete information.
                </Heading>
              </div>
            </div>
            <div className={styles.darkControls}>
              <Card padding="compact" className={styles.grow}>
                <Input label="Notes" placeholder="Jot down your structure" />
              </Card>
              <div className={styles.row}>
                <Button variant="outline">Pause</Button>
                <Button>Finish answer</Button>
              </div>
            </div>
            <div className={styles.row}>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="error">Error</Badge>
              <Badge>Neutral</Badge>
            </div>
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          id="responsive"
          title="Responsive"
          description="Mobile first. Styles start at the smallest width and add layout at min-width breakpoints."
        >
          <p className={styles.breakpointNow}>
            Current range: <strong className={styles.breakpointLabel} />
          </p>
          {/* Focusable so keyboard users can scroll the table on narrow screens. */}
          <div className={styles.tableWrap} role="region" aria-label="Breakpoints" tabIndex={0}>
            <table className={styles.table}>
              <caption className="visually-hidden">Breakpoints</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Range</th>
                  <th scope="col">Convention</th>
                </tr>
              </thead>
              <tbody>
                {breakpoints.map((bp) => (
                  <tr key={bp.name}>
                    <th scope="row">{bp.name}</th>
                    <td>{bp.range}</td>
                    <td>{bp.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ShowcaseSection>
      </Container>
    </div>
  );
}
