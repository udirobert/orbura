"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type ButtonSize = "sm" | "md" | "lg";

const SIZE_MIN_HEIGHT: Record<ButtonSize, number> = {
  sm: 44,
  md: 58,
  lg: 64,
};

/**
 * PrimaryButton — the brand's orange call-to-action.
 *
 * Used for the next-step CTA at the bottom of every screen. Supports
 * three heights (sm 44 / md 58 / lg 64) and an optional shimmer effect
 * for the first-impression screens (opening, wake, bed). The disabled
 * state replaces the orange with a muted surface.
 */
export interface PrimaryButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  size?: ButtonSize;
  /** Animated left-to-right white sweep (first-impression CTAs only). */
  shimmer?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  size = "md",
  shimmer = false,
  disabled = false,
  fullWidth = true,
  className,
  style,
  ...rest
}: PrimaryButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      className={[
        fullWidth ? "w-full" : "",
        "font-semibold rounded-2xl relative overflow-hidden",
        className ?? "",
      ].filter(Boolean).join(" ")}
      style={{
        backgroundColor: disabled ? "var(--color-bg-surface)" : "var(--color-brand-primary)",
        color: disabled ? "var(--color-text-muted)" : "var(--color-text-primary)",
        fontFamily: "var(--font-body)",
        minHeight: SIZE_MIN_HEIGHT[size],
        fontSize: size === "sm" ? 13 : size === "md" ? 14 : 15,
        border: disabled ? "1px solid var(--color-border-subtle)" : "none",
        transition: "background-color 0.2s, color 0.2s",
        ...style,
      }}
      {...rest}
    >
      {shimmer && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
