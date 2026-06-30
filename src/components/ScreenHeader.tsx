"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";

interface BackTarget {
  /** Route to push to (mutually exclusive with onBack). */
  href?: string;
  /** Replace instead of push (use for back-navigation). */
  replace?: boolean;
  /** Custom click handler (mutually exclusive with href). */
  onBack?: () => void;
  label: string;
}

interface ScreenHeaderProps {
  back: BackTarget;
  /** Right-side content. Typically a MiniOrb or live score readout. */
  right?: ReactNode;
  /** Show a 5-step wizard progress bar below the header. Set
   *  `optional: true` when the step itself is skippable, so the step
   *  count reads "Step X of Y · optional". */
  progress?: { current: number; total: number; optional?: boolean };
  /** Top padding (defaults to 12 / mt-12 for the standard nav offset). */
  topSpacing?: boolean;
}

/**
 * ScreenHeader — the standard top-of-screen chrome for every wizard
 * and post-wizard screen. Encapsulates the back button (with ChevronLeft
 * icon), the right-side slot (orb / score), and the optional wizard
 * progress bar. Replaces 5+ inline header rebuilds.
 */
export function ScreenHeader({
  back,
  right,
  progress,
  topSpacing = true,
}: ScreenHeaderProps) {
  const router = useRouter();
  const handleBack = () => {
    if (back.onBack) {
      back.onBack();
      return;
    }
    if (back.href) {
      if (back.replace) router.replace(back.href);
      else router.push(back.href);
    } else {
      router.back();
    }
  };

  return (
    <>
      <div
        className={`relative z-10 flex items-center justify-between ${topSpacing ? "mt-12" : ""}`}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {back.label}
        </button>
        {right}
      </div>

      {progress && (
        <div className="relative z-10 pt-3 pb-4">
          <ProgressBar
            current={progress.current}
            total={progress.total}
            optional={progress.optional}
          />
        </div>
      )}
    </>
  );
}

/** Helper for the most common header pattern: back-left, MiniOrb-right. */
export function ScreenHeaderWithOrb({
  back,
  orbScore,
  orbForming,
  progress,
  orbSize = 28,
}: Omit<ScreenHeaderProps, "right"> & {
  orbScore: number;
  orbForming?: boolean;
  orbSize?: number;
}) {
  return (
    <ScreenHeader
      back={back}
      progress={progress}
      right={<MiniOrb score={orbScore} size={orbSize} forming={orbForming} />}
    />
  );
}
