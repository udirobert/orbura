"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type ButtonSize = "sm" | "md" | "lg";

const SIZE_MIN_HEIGHT: Record<ButtonSize, number> = {
  sm: 36,
  md: 48,
  lg: 56,
};

/**
 * SecondaryButton — the muted dark CTA used for "back" / "later" /
 * "secondary action" affordances. Always pairs with a `PrimaryButton`
 * above it.
 */
export interface SecondaryButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function SecondaryButton({
  children,
  size = "md",
  fullWidth = true,
  className,
  style,
  ...rest
}: SecondaryButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={[
        fullWidth ? "w-full" : "",
        "font-semibold rounded-2xl",
        className ?? "",
      ].filter(Boolean).join(" ")}
      style={{
        backgroundColor: "var(--color-bg-surface)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border-default)",
        minHeight: SIZE_MIN_HEIGHT[size],
        fontFamily: "var(--font-body)",
        fontSize: size === "sm" ? 11 : size === "md" ? 12 : 13,
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
