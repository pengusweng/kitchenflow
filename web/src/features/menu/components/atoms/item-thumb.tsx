import { cn } from "cn";
import type { MenuItem } from "../../utils/menu";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

type ItemThumbProps = {
  item: MenuItem;
  /** Unavailable items fade so the eye skips past them to what can be sold. */
  dim?: boolean;
  className?: string;
};

// The item photo, or a tile in the brand's accent with the item's initials, so
// a page of placeholder images still sorts itself by brand at a glance.
export default function ItemThumb({ item, dim = false, className }: ItemThumbProps) {
  const base = cn(
    "size-10 shrink-0 rounded-md transition-[opacity,filter] duration-200",
    dim && "opacity-45 grayscale",
    className,
  );

  if (item.imageUrl) {
    return (
      // Item photos are signed storage URLs from the API, not build-time assets, so next/image adds nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.imageUrl} alt="" className={cn(base, "border border-hairline bg-card object-cover")} />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: item.brand.accent }}
      className={cn(base, "grid place-items-center text-[0.8125rem] font-semibold tracking-[0.02em] text-white")}
    >
      {initials(item.name)}
    </span>
  );
}
