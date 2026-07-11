"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryCardProps {
  profile: string;
  memories: string[];
  /** Container tag for forget API calls */
  containerTag?: string;
  /** Callback after memories are forgotten (parent refetches) */
  onForget?: () => void;
}

/**
 * MemoryCard — "Your coach remembers"
 *
 * Shows extracted facts from Supermemory so the user can see
 * that their recovery coach has accumulated knowledge about them.
 * Collapsible. Purple accent to distinguish from Edge AI (green)
 * and On-chain (blue).
 *
 * When containerTag + onForget are provided, each fact has a
 * per-item forget button and the card has a "Forget all" action
 * with a confirmation dialog. This uses the Supermemory forget()
 * API — soft-delete, not permanent deletion.
 */
export function MemoryCard({ profile, memories, containerTag, onForget }: MemoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showForgetConfirm, setShowForgetConfirm] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [forgottenFacts, setForgottenFacts] = useState<Set<string>>(new Set());

  // Split profile into individual fact lines
  const profileFacts = profile
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);

  // Show up to 3 memories
  const topMemories = memories.slice(0, 3);

  const totalFacts = profileFacts.length + topMemories.length;
  if (totalFacts === 0) return null;

  // Preview: first 2 facts for the collapsed state
  const previewFacts = [...profileFacts, ...topMemories].slice(0, 2);

  const canForget = !!containerTag && !!onForget;

  const handleForgetOne = async (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerTag) return;
    setForgottenFacts((prev) => new Set(prev).add(content));
    try {
      await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerTag, content }),
      });
      onForget?.();
    } catch {
      // Revert on failure
      setForgottenFacts((prev) => {
        const next = new Set(prev);
        next.delete(content);
        return next;
      });
    }
  };

  const handleForgetAll = async () => {
    if (!containerTag) return;
    setForgetting(true);
    try {
      await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerTag, all: true }),
      });
      onForget?.();
      setShowForgetConfirm(false);
    } catch {
      // non-blocking
    } finally {
      setForgetting(false);
    }
  };

  const isForgotten = (content: string) => forgottenFacts.has(content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,85,247,0.15)",
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm flex-shrink-0">🧠</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Your coach remembers
            </span>
            <span className="text-[9px] font-mono flex-shrink-0" style={{ color: "#a855f7" }}>
              {totalFacts} {totalFacts === 1 ? "fact" : "facts"}
            </span>
          </div>
          {/* Source badge */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#a855f7" }} />
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#a855f7" }}>
              Supermemory · persistent agent memory
            </span>
          </div>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-[10px]" style={{ color: "var(--color-text-faint)" }}>
          ▼
        </motion.span>
      </div>

      {/* Collapsed preview — first 2 facts */}
      {!expanded && (
        <div className="px-4 pb-3 space-y-1">
          {previewFacts.map((fact, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "#a855f7" }}>•</span> {fact.length > 80 ? fact.slice(0, 80) + "…" : fact}
            </p>
          ))}
        </div>
      )}

      {/* Expanded — all facts */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Profile facts */}
              {profileFacts.length > 0 && (
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
                    What your coach knows
                  </span>
                  <div className="mt-1.5 space-y-1.5">
                    {profileFacts.map((fact, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <p className="text-[11px] leading-relaxed flex-1" style={{
                          color: isForgotten(fact) ? "var(--color-text-faint)" : "var(--color-text-secondary)",
                          textDecoration: isForgotten(fact) ? "line-through" : "none",
                        }}>
                          <span style={{ color: "#a855f7" }}>•</span> {fact}
                        </p>
                        {canForget && !isForgotten(fact) && (
                          <button
                            onClick={(e) => handleForgetOne(fact, e)}
                            className="text-[9px] font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: "var(--color-text-faint)" }}
                            aria-label="Forget this memory"
                          >
                            forget
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent memories */}
              {topMemories.length > 0 && (
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
                    Recent sessions
                  </span>
                  <div className="mt-1.5 space-y-1.5">
                    {topMemories.map((mem, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <p className="text-[11px] leading-relaxed flex-1" style={{
                          color: isForgotten(mem) ? "var(--color-text-faint)" : "var(--color-text-secondary)",
                          textDecoration: isForgotten(mem) ? "line-through" : "none",
                        }}>
                          <span style={{ color: "var(--color-text-faint)" }}>◦</span> {mem.length > 100 ? mem.slice(0, 100) + "…" : mem}
                        </p>
                        {canForget && !isForgotten(mem) && (
                          <button
                            onClick={(e) => handleForgetOne(mem, e)}
                            className="text-[9px] font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: "var(--color-text-faint)" }}
                            aria-label="Forget this memory"
                          >
                            forget
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy footer + forget all */}
              <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: "1px solid rgba(168,162,158,0.06)" }}>
                <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
                  🔒 You control your memory — nothing uploaded
                </span>
                {canForget && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowForgetConfirm(true); }}
                    className="text-[9px] font-mono uppercase tracking-wider flex-shrink-0"
                    style={{ color: "var(--color-states-error)" }}
                  >
                    Forget all
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forget all confirmation dialog */}
      <AnimatePresence>
        {showForgetConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm forget all memories"
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={(e) => { e.stopPropagation(); setShowForgetConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-2xl p-6 w-full max-w-sm text-center"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,85,247,0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                Forget all memories?
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>
                Your coach will forget everything it knows about your patterns, past scores, and preferences. This cannot be undone. Future sessions will start fresh.
              </p>
              <div className="flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={forgetting}
                  onClick={handleForgetAll}
                  className="w-full font-semibold text-sm rounded-xl py-3 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-states-error)", color: "white" }}
                >
                  {forgetting ? "Forgetting…" : "Forget everything"}
                </motion.button>
                <button
                  onClick={() => setShowForgetConfirm(false)}
                  className="w-full text-xs font-medium py-2.5"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
