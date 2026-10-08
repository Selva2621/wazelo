"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Briefcase, Building2 } from "lucide-react";
import { stories, type Story } from "@/components/home/stories";
import { StoryPhone } from "@/components/mocks/phone-chats";
import { LaptopFrame } from "@/components/mocks/laptop-frame";
import { FreelancerScreen, TeamScreen } from "@/components/mocks/app-screens";
import { usePageVisible } from "@/components/mocks/phone-frame";

/* ─── Timing model ───────────────────────────────────────────────────────────
   Autoplay walks each beat's chat items on a timer, holds, then moves on. */

const FIRST_ITEM_MS = 600;
const ITEM_MS = 1150;
const HOLD_MS = 2800;

/** Autoplay clock; plays while the section is on screen. */
function useStoryClock(story: Story, playing: boolean, reduce: boolean) {
  const [beat, setBeat] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const items = story.beats[beat].chat.length;

  useEffect(() => {
    if (!playing || reduce) return;
    const t =
      revealed < items
        ? setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? FIRST_ITEM_MS : ITEM_MS)
        : setTimeout(() => {
            setBeat((b) => (b + 1) % story.beats.length);
            setRevealed(0);
          }, HOLD_MS);
    return () => clearTimeout(t);
  }, [playing, reduce, revealed, items, story.beats.length]);

  const go = (b: number) => {
    setBeat(b);
    setRevealed(reduce ? story.beats[b].chat.length : 0);
  };
  return { beat, revealed: reduce ? items : revealed, go };
}

function beatDurationMs(story: Story, beat: number) {
  const n = story.beats[beat].chat.length;
  return n === 0 ? HOLD_MS + 600 : FIRST_ITEM_MS + (n - 1) * ITEM_MS + HOLD_MS;
}

/* ─── Section ────────────────────────────────────────────────────────────── */

export function StorySection() {
  const [active, setActive] = useState<Story["id"]>("freelancer");
  const story = stories.find((s) => s.id === active)!;
  const section = useRef<HTMLElement>(null);

  const inView = useInView(section, { amount: 0.35 });
  const visible = usePageVisible();
  const reduce = !!useReducedMotion();
  const clock = useStoryClock(story, inView && visible, reduce);

  const pos = { beat: clock.beat, revealed: clock.revealed };
  const goTo = clock.go;

  const switchStory = (id: Story["id"]) => {
    if (id === active) return;
    setActive(id);
    clock.go(0);
  };

  const Screen = story.id === "freelancer" ? FreelancerScreen : TeamScreen;

  return (
    <section ref={section} id="stories" className="relative scroll-mt-16">
      <div className="flex min-h-[100dvh] items-center px-4 py-24 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* copy, tabs, steps */}
          <div className="order-2 lg:order-1 lg:col-span-4">
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface xl:text-[2.75rem]">Watch a deal close on WhatsApp.</h2>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={story.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-4 text-base leading-relaxed text-on-surface-variant"
              >
                {story.who}
              </motion.p>
            </AnimatePresence>

            <div role="tablist" aria-label="Choose a story" className="lg-glass-pill mt-7 flex w-max gap-1 rounded-full p-1">
              {stories.map((s) => {
                const Icon = s.id === "freelancer" ? Briefcase : Building2;
                const selected = s.id === active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => switchStory(s.id)}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-[background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
                      selected ? "text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {selected && <motion.span layoutId="story-tab" className="absolute inset-0 rounded-full bg-primary-container" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{s.tab}</span>
                  </button>
                );
              })}
            </div>

            <ol className="mt-6 flex flex-col gap-0.5">
              {story.beats.map((b, i) => {
                const on = i === pos.beat;
                return (
                  <li key={`${story.id}-${b.title}`}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={on ? "step" : undefined}
                      className={`group relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
                        on ? "lg-glass" : "hover:bg-ink/[0.03]"
                      }`}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className={`font-mono text-xs tabular-nums ${on ? "text-primary-container" : "text-outline"}`}>{i + 1}</span>
                        <span className={`text-[15px] font-semibold tracking-tight ${on ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"}`}>{b.title}</span>
                      </span>
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                            className="overflow-hidden pl-6 text-sm leading-relaxed text-on-surface-variant"
                          >
                            <span className="block pt-1.5">{b.body}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                      {on && !reduce && (
                        <motion.span
                          key={`${story.id}-${pos.beat}`}
                          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary-container"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: beatDurationMs(story, pos.beat) / 1000, ease: "linear" }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* devices */}
          <div data-story="stage" className="relative order-1 lg:order-2 lg:col-span-8">
            <div className="hidden pr-36 lg:block xl:pr-44">
              <LaptopFrame>
                <Screen beat={pos.beat} revealed={pos.revealed} />
              </LaptopFrame>
            </div>
            <div className="relative mx-auto w-max lg:absolute lg:-bottom-8 lg:right-0 lg:origin-bottom-right lg:scale-[0.8] xl:scale-[0.86]">
              <div aria-hidden className="device-glow" />
              <StoryPhone story={story} beat={pos.beat} revealed={pos.revealed} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
