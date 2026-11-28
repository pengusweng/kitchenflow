"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "cn";
import aureliasLogo from "@/src/assets/brand/AureliasInasal.png";
import gamcheonLogo from "@/src/assets/brand/Gamcheon.png";
import kingKungsLogo from "@/src/assets/brand/KingKungsKafe.png";
import aureliasDarkLogo from "@/src/assets/brand/mono/aurelias-inasal.png";
import gamcheonDarkLogo from "@/src/assets/brand/mono/gamcheon.png";
import kingKungsDarkLogo from "@/src/assets/brand/mono/king-kungs-kafe.png";

const PILOT_MARKS = new Map([
  ["GC", { light: gamcheonLogo, dark: gamcheonDarkLogo, width: "w-[68px]" }],
  ["AI", { light: aureliasLogo, dark: aureliasDarkLogo, width: "w-[132px]" }],
  ["KK", { light: kingKungsLogo, dark: kingKungsDarkLogo, width: "w-52" }],
]);

export default function BrandMark({ code, name, logoUrl }: {
  code: string;
  name: string;
  logoUrl?: string | null;
}) {
  const pilot = PILOT_MARKS.get(code.trim().toUpperCase());
  const [failedSrc, setFailedSrc] = useState<string>();

  if (pilot) {
    return (
      <span role="img" aria-label={name} className="inline-flex h-20 w-full items-center justify-center">
        <Image
          alt=""
          src={pilot.light}
          unoptimized
          draggable={false}
          className={cn("h-auto max-w-full object-contain dark:hidden", pilot.width)}
        />
        <Image
          alt=""
          src={pilot.dark}
          unoptimized
          draggable={false}
          className={cn("hidden h-auto max-w-full object-contain dark:block", pilot.width)}
        />
      </span>
    );
  }

  if (logoUrl && logoUrl !== failedSrc) {
    return (
      <span className="inline-flex h-16 w-52 max-w-full items-center justify-center rounded-md px-2.5 dark:bg-[#f6efe6]">
        {/* The API can provide logos from arbitrary brand-managed image hosts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          loading="lazy"
          draggable={false}
          onError={() => setFailedSrc(logoUrl)}
          className="h-14 w-full object-contain"
        />
      </span>
    );
  }

  return <span className="line-clamp-2 text-center text-base font-semibold text-ink [overflow-wrap:anywhere]">{name}</span>;
}
