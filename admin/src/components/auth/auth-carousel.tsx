"use client";

import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
    title: "Connect founders with vetted investors",
    caption: "Verified onboarding with BRS, KRA, and KYC-ready workflows.",
  },
  {
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
    title: "Track capital across Kenya",
    caption: "Nairobi, Mombasa, Kisumu — real transaction visibility.",
  },
  {
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    title: "Groups manage pooled finance",
    caption: "Deposits and withdrawals happen on mobile — admin sees the ledger.",
  },
];

export function AuthCarousel({ className }: { className?: string }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className={cn("relative h-full min-h-[280px] w-full overflow-hidden bg-primary-dark lg:min-h-full", className)}>
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image src={s.src} alt="" fill className="object-cover" priority={i === 0} sizes="50vw" />
          <div className="absolute inset-0 bg-primary-dark/55" />
        </div>
      ))}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white md:p-10">
        <h2 className="text-xl font-bold md:text-2xl">{slide.title}</h2>
        <p className="mt-2 max-w-md text-sm text-white/90 md:text-base">{slide.caption}</p>
        <div className="mt-6 flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-4 bg-white/40")}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
