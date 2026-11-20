import { Avatar } from "@/src/components/ui/atoms/avatar";
import type { Brand } from "../../utils/brands";
import StatusBadge from "../atoms/status-badge";

// The badge sits under the code on phones so long names keep the full
// width, and moves to the right edge once there is room beside the name.
export default function BrandIdentity({ brand }: { brand: Brand }) {
  return (
    <div className="flex items-start gap-4">
      {brand.logoUrl ? (
        // Logos are signed storage URLs from the API, not build-time assets, so next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt=""
          className="size-12 shrink-0 rounded-full border border-hairline bg-card object-cover"
        />
      ) : (
        <Avatar name={brand.name} className="size-12 text-lg" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <h3 className="text-lg leading-snug font-semibold text-balance break-words text-ink">{brand.name}</h3>
        <p className="font-mono text-sm break-all text-ink-muted">{brand.code}</p>
        <div className="mt-2 sm:hidden">
          <StatusBadge status={brand.status} />
        </div>
      </div>
      <div className="hidden shrink-0 pt-1 sm:block">
        <StatusBadge status={brand.status} />
      </div>
    </div>
  );
}
