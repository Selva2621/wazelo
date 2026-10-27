import { Fragment } from "react";

/**
 * Letter-by-letter entrance for short headings (see `.split-char` in globals.css).
 * Screen readers get the plain text once; the animated letters are hidden from them.
 * Words stay unbreakable so a title never wraps mid-word. Re-mounting (new key or new
 * page) replays the entrance.
 */
export function SplitText({ text }: { text: string }) {
  let i = 0;
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="inline-block whitespace-nowrap">
              {[...word].map((ch, c) => (
                <span key={c} className="split-char" style={{ "--char-i": i++ } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </>
  );
}
