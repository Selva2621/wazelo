/** A phone around a 390x844 app recording; the screen keeps the recording's exact shape. */
export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-[300px] rounded-[2.6rem] bg-[#16130f] p-2.5 ring-1 ring-ink/15 shadow-[0_50px_100px_-30px_rgba(60,40,20,0.5),0_0_0_1px_rgba(23,19,15,0.12)] ${className}`}
    >
      <div className="relative aspect-[390/844] overflow-hidden rounded-[2.1rem] bg-white">{children}</div>
    </div>
  );
}
