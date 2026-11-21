"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorIllustration } from "./error-illustration";

type PrimaryAction = { label: string; href: string } | { label: string; onClick: () => void };

interface ErrorScreenProps {
  code: "404" | "500";
  title: string;
  message: string;
  primary: PrimaryAction;
  /** Secondary link; omit to get a "Go back" history button. */
  secondary?: { label: string; href: string };
  digest?: string;
  /** Renders inside the app shell (no logo row, height minus header). */
  inline?: boolean;
}

const SPRING = { type: "spring", stiffness: 260, damping: 24 } as const;

/** Error page styled as a short WhatsApp thread; the outgoing bubble is the primary action. */
export function ErrorScreen({ code, title, message, primary, secondary, digest, inline }: ErrorScreenProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const enter = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 12, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { ...SPRING, delay } };

  const bubbleClass =
    "group inline-flex items-center gap-2 rounded-2xl rounded-br-md bg-bubble-out px-4 py-2.5 text-body-lg font-medium text-on-bubble-out " +
    "transition-transform duration-120 ease-standard hover:-translate-y-px active:scale-[0.98] " +
    "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  const bubbleInner = (
    <>
      {primary.label}
      <CheckCheck className="size-3.5 text-on-bubble-out/70" aria-hidden />
    </>
  );

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  // The app shell already owns <main>.
  const Root = inline ? "div" : "main";

  return (
    <Root
      className={cn(
        "flex w-full flex-col items-center justify-center bg-surface px-4 py-12",
        inline ? "min-h-[calc(100dvh-var(--header-height))]" : "min-h-dvh",
      )}
    >
      <div className="w-full max-w-md">
        {!inline && (
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-title-sm font-semibold text-on-surface">
            <img src="/logo/logo.png" alt="" className="size-7 object-contain" />
            Wazelo
          </Link>
        )}

        <ErrorIllustration code={code} />

        <div className="mt-6 flex flex-col gap-3" role="status" aria-live="polite">
          {/* Incoming: what happened */}
          <motion.div
            {...enter(0)}
            className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-outline-variant/60 bg-surface-container px-4 py-3 text-on-surface"
          >
            <p className="mb-1 font-mono text-label font-semibold text-primary">Error {code}</p>
            <h1 className="text-headline font-semibold text-on-surface">{title}</h1>
            <p className="mt-1 text-body-lg leading-relaxed text-on-surface-variant">{message}</p>
            {digest && (
              <p className="mt-2 font-mono text-caption text-on-surface-variant">Ref: {digest}</p>
            )}
          </motion.div>

          {/* Outgoing: the primary action */}
          <motion.div {...enter(0.35)} className="self-end">
            {"href" in primary ? (
              <Link href={primary.href} className={bubbleClass}>
                {bubbleInner}
              </Link>
            ) : (
              <button type="button" onClick={primary.onClick} className={bubbleClass}>
                {bubbleInner}
              </button>
            )}
          </motion.div>

          {/* Typing indicator: the conversation isn't over */}
          <motion.div
            {...enter(0.7)}
            aria-hidden
            className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-bl-md border border-outline-variant/60 bg-surface-container px-3.5 py-3"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-on-surface-variant/60"
                animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        </div>

        <motion.div {...enter(0.9)} className="mt-8 flex justify-center">
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex h-9 items-center rounded-lg px-3 text-body-lg font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              {secondary.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-body-lg font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Go back
            </button>
          )}
        </motion.div>
      </div>
    </Root>
  );
}
