import { cn } from "cn";
import { CHANNEL_LABEL, CHANNEL_SHORT, type MenuItemChannel } from "../../utils/menu";

// One tag per channel. A channel that's switched off is struck through on a
// danger tint, so it reads as "off" without relying on the color alone.
export default function ChannelTags({ channels }: { channels: MenuItemChannel[] }) {
  return (
    <ul aria-label="Channels" className="flex gap-1">
      {channels.map(({ channel, available }) => {
        const label = `${CHANNEL_LABEL[channel]}${available ? "" : ", off"}`;
        return (
          <li
            key={channel}
            title={label}
            className={cn(
              "inline-flex h-6 min-w-7 items-center justify-center rounded-sm border px-1.5 font-mono text-[0.6875rem] font-semibold tracking-[0.04em]",
              available
                ? "border-hairline text-ink-muted"
                : "border-transparent bg-destructive/10 text-danger-ink line-through decoration-[1.5px]",
            )}
          >
            <span aria-hidden="true">{CHANNEL_SHORT[channel]}</span>
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
