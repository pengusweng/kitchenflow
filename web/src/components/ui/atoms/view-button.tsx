import { ChevronRight } from "lucide-react";
import Link from "next/link";

const CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md pr-1.5 pl-2.5 font-semibold text-ink transition-colors outline-none hover:bg-ink/6 focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-ink/10 [&_svg]:text-ink-muted";

type ViewButtonProps = { label: string } & (
  | { onClick?: () => void; href?: never }
  /** Opens a page instead of a modal; a real link, so it can open in a new tab. */
  | { href: string; onClick?: never }
);

export default function ViewButton({ label, onClick, href }: ViewButtonProps) {
  const content = (
    <>
      View
      <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2.25} />
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={CLASS}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={CLASS}>
      {content}
    </button>
  );
}
