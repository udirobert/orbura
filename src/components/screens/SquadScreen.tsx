"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { useRecoveryContext } from "@/lib/contexts/RecoveryContext";
import { getContextConfig } from "@/lib/contexts";
import type { SquadPlayer, DebtAnalysis } from "@/lib/types";
import type { PaymentType, SquadPayment } from "@/lib/wdk/types";
import { PrimaryButton } from "@/components/PrimaryButton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

function playerStatus(analysis: DebtAnalysis | null | undefined): {
  label: string;
  color: string;
  emoji: string;
} {
  if (!analysis) return { label: "Not scanned", color: "var(--color-text-faint)", emoji: "○" };
  const score = analysis.debtScore;
  if (score >= 61) return { label: "Out — rest", color: "var(--color-states-error)", emoji: "🔴" };
  if (score >= 41) return { label: "Impact sub", color: "var(--color-states-warning)", emoji: "🟡" };
  if (score >= 21) return { label: "Modified", color: "var(--color-states-success)", emoji: "🟢" };
  return { label: "Fit to start", color: "var(--color-system-brain)", emoji: "⚽" };
}

// ─── Shared scan action — copies a player's state into the global session ─────

function useScanPlayer() {
  const router = useRouter();
  const { setActivePlayerId, setSelectedStressors, setFaceAnalysis } = useBodyDebtStore();
  return (player: SquadPlayer) => {
    setActivePlayerId(player.id);
    setSelectedStressors(player.stressors);
    setFaceAnalysis(player.faceAnalysis ?? null);
    router.push("/intake");
  };
}

// ─── Squad panel — compact view embedded in DashboardScreen ──────────────────

export function SquadPanel({ onSelect }: { onSelect: (id: string) => void }) {
  const ctx = useRecoveryContext();
  const { squad } = useBodyDebtStore();
  const scanPlayer = useScanPlayer();

  if (!ctx.supportsSquad) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">
          Squad Readiness
        </h3>
        <span className="text-xs font-mono text-slate-500">
          {squad.length} {squad.length === 1 ? "player" : "players"}
        </span>
      </div>

      {squad.length === 0 ? (
        <p className="text-xs text-slate-500">
          Add players from the manager&apos;s medical room to see team readiness.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {squad.map((p) => {
            const status = playerStatus(p.analysis);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-700 transition-colors"
              >
                <button
                  onClick={() => onSelect(p.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <span className="text-lg">{status.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{p.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      {p.position}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold" style={{ color: status.color }}>
                      {status.label}
                    </p>
                    {p.analysis && (
                      <p className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {p.analysis.debtScore}/100
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => scanPlayer(p)}
                    className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-600/30"
                  >
                    {p.analysis ? "Re-scan" : "Scan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Squad screen — full CRUD view ───────────────────────────────────────────

export function SquadScreen() {
  const ctx = useRecoveryContext();
  const router = useRouter();
  const {
    squad, addPlayer, removePlayer, updatePlayer, setMode,
    walletConnected, managerAddress, treasuryBalance, connecting,
    refreshingBalance, payments, sendingPayment,
    connectWallet, refreshBalance, sendPayment,
  } = useBodyDebtStore();
  const scanPlayer = useScanPlayer();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<SquadPlayer["position"]>("MID");
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [payingPlayer, setPayingPlayer] = useState<string | null>(null);
  const [showPayments, setShowPayments] = useState(false);

  // Share squad — defined before early return so the hook call isn't conditional
  const hasData = squad.some((p) => p.analysis);
  const handleShare = useCallback(async () => {
    if (sharing || squad.length === 0) return;
    setSharing(true);
    setShareLink(null);
    try {
      const res = await fetch("/api/squad/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          squad: squad.map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            analysis: p.analysis,
            stressors: p.stressors,
            faceAnalysis: p.faceAnalysis,
          })),
          appName: ctx.vocabulary.appName,
        }),
      });
      if (!res.ok) throw new Error("Share failed");
      const { url } = await res.json();
      // Ensure absolute URL for external sharing — if the API returned a
      // relative path (NEXT_PUBLIC_APP_URL not configured), prepend origin
      const absoluteUrl = url.startsWith("http")
        ? url
        : `${window.location.origin}${url}`;
      setShareLink(absoluteUrl);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(absoluteUrl);
      } catch {
        // Clipboard API unavailable — show link for manual copy
      }
    } catch {
      // Share failed silently — user sees the link input
    } finally {
      setSharing(false);
    }
  }, [squad, sharing, ctx.vocabulary.appName]);

  if (!ctx.supportsSquad) {
    const targetMode: "personal" | "football" =
      ctx.mode === "football" ? "personal" : "football";
    const targetCtx = getContextConfig(targetMode);
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-6 bg-slate-950">
        <p className="text-sm text-slate-400 mb-4 text-center">
          Squad view is part of the {targetCtx.vocabulary.personaLabel} mode.
        </p>
        <PrimaryButton onClick={() => setMode(targetMode)}>
          Switch to {targetCtx.vocabulary.appName}
        </PrimaryButton>
      </div>
    );
  }

  const handleAdd = () => {
    if (!name.trim()) return;
    addPlayer({ name: name.trim(), position, stressors: [] });
    setName("");
    setPosition("MID");
    setAdding(false);
  };

  const readyCount = squad.filter((p) => p.analysis && p.analysis.debtScore < 41).length;
  const subCount   = squad.filter((p) => p.analysis && p.analysis.debtScore >= 41 && p.analysis.debtScore < 61).length;
  const outCount   = squad.filter((p) => p.analysis && p.analysis.debtScore >= 61).length;

  return (
    <div className="min-h-svh px-5 py-8 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-2xl font-semibold text-slate-100 mb-1">
          Squad Medical Room
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Scan each player to build the match-readiness board.
        </p>

        {/* Team summary */}
        {squad.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryStat label="Ready" value={readyCount} color="var(--color-system-brain)" />
            <SummaryStat label="Impact" value={subCount}   color="var(--color-states-warning)" />
            <SummaryStat label="Out"    value={outCount}   color="var(--color-states-error)" />
          </div>
        )}

        {/* Player list */}
        <div className="flex flex-col gap-2 mb-6">
          {squad.map((p) => {
            const status = playerStatus(p.analysis);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-base font-medium text-slate-100">{p.name}</p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      {p.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scanPlayer(p)}
                      className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-600/30"
                    >
                      {p.analysis ? "Re-scan" : "Scan"}
                    </button>
                    {walletConnected && (
                      <button
                        onClick={() => setPayingPlayer(p.id)}
                        className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/30"
                      >
                        💰 Pay
                      </button>
                    )}
                    <button
                      onClick={() => removePlayer(p.id)}
                      className="text-[10px] font-mono uppercase tracking-widest text-slate-600 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono" style={{ color: status.color }}>
                    {status.emoji} {status.label}
                  </p>
                  {p.analysis && (
                    <p className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                      {p.analysis.debtScore}/100
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add player form */}
        <AnimatePresence mode="wait">
          {adding ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-2xl bg-slate-900 border border-emerald-800 mb-4"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Player name"
                className="w-full px-3 py-2 mb-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="grid grid-cols-4 gap-2 mb-3">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={`py-2 rounded-lg text-xs font-mono uppercase ${
                      position === pos
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-950 border border-slate-800 text-slate-400"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <PrimaryButton onClick={handleAdd} disabled={!name.trim()}>
                  Add Player
                </PrimaryButton>
                <button
                  onClick={() => setAdding(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdding(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700 text-slate-400 text-sm font-mono uppercase tracking-widest hover:border-emerald-600 hover:text-emerald-400 transition-colors"
            >
              + Add Player
            </motion.button>
          )}
        </AnimatePresence>

        {/* Share squad button */}
        {squad.length > 0 && (
          <div className="mb-6">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors"
              style={{
                color: "var(--color-text-secondary)",
                border: "1px dashed rgba(168,162,158,0.15)",
              }}
            >
              {sharing ? (
                <span className="opacity-60">Generating share link…</span>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Share squad snapshot{!hasData ? " (scan players first)" : ""}</span>
                </>
              )}
            </button>

            {/* Shared link display */}
            <AnimatePresence>
              {shareLink && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: "rgba(74,222,128,0.06)",
                      border: "1px solid rgba(74,222,128,0.15)",
                    }}
                  >
                    <p className="text-[10px] font-mono text-emerald-400 mb-1">
                      Share link copied!
                    </p>
                    <input
                      readOnly
                      value={shareLink}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="w-full px-2 py-1.5 rounded text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ─── Player payment modal ─── */}
        <AnimatePresence>
          {payingPlayer && (
            <PlayerPaymentModal
              player={squad.find((p) => p.id === payingPlayer)!}
              sending={sendingPayment}
              onClose={() => setPayingPlayer(null)}
              onSaveAddress={(address) => {
                if (payingPlayer) {
                  updatePlayer(payingPlayer, { walletAddress: address });
                }
              }}
              onSend={async (type, amount, note) => {
                const player = squad.find((p) => p.id === payingPlayer);
                if (!player?.walletAddress) return;
                const result = await sendPayment(
                  type,
                  player.walletAddress,
                  amount,
                  note,
                  player.name,
                );
                if (result) setPayingPlayer(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* ─── WDK Squad Treasury ─── */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-3">
            💰 Squad Treasury
          </h2>

          {!walletConnected ? (
            <button
              onClick={() => void connectWallet()}
              disabled={connecting}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-700/40 text-emerald-400 text-sm font-mono uppercase tracking-widest hover:border-emerald-600 hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect USDt Treasury"}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Treasury balance */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Treasury Balance
                    </p>
                    <p className="text-lg font-bold tabular-nums text-emerald-400">
                      {refreshingBalance ? "…" : `${treasuryBalance ?? "0.00"} USDt`}
                    </p>
                  </div>
                  <button
                    onClick={() => void refreshBalance()}
                    disabled={refreshingBalance}
                    className="text-[10px] font-mono uppercase text-slate-500 hover:text-emerald-400 disabled:opacity-50"
                  >
                    ↻ Refresh
                  </button>
                </div>
                {managerAddress && (
                  <p className="text-[9px] font-mono text-slate-600 mt-1 truncate">
                    {managerAddress}
                  </p>
                )}
              </div>

              {/* Payment history toggle */}
              {payments.length > 0 && (
                <button
                  onClick={() => setShowPayments((v) => !v)}
                  className="w-full text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 py-1"
                >
                  {showPayments ? "Hide" : "Show"} payment history ({payments.length})
                </button>
              )}

              <AnimatePresence>
                {showPayments && payments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      {payments.slice(0, 10).map((p) => (
                        <PaymentRow key={p.id} payment={p} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Payment row ─────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: SquadPayment }) {
  const icon = payment.type === "bonus" ? "🏆" : payment.type === "fine" ? "🟨" : "💚";
  const color =
    payment.type === "bonus" ? "var(--color-states-success)" :
    payment.type === "fine"  ? "var(--color-states-warning)" :
                               "var(--color-system-brain)";
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <div>
          <p className="text-[10px] font-mono" style={{ color }}>
            {payment.amount} USDt
            {payment.playerName ? ` → ${payment.playerName}` : ""}
          </p>
          {payment.note && (
            <p className="text-[9px] font-mono text-slate-600">{payment.note}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] font-mono text-slate-500">
          {new Date(payment.createdAt).toLocaleDateString()}
        </p>
        {payment.txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${payment.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[8px] font-mono text-slate-600 hover:text-emerald-400"
          >
            {payment.txHash.slice(0, 8)}…
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Player payment modal ────────────────────────────────────────────────────

function PlayerPaymentModal({
  player,
  onClose,
  onSend,
  onSaveAddress,
  sending,
}: {
  player: SquadPlayer;
  onClose: () => void;
  onSend: (type: PaymentType, amount: number, note?: string) => void;
  onSaveAddress: (address: `0x${string}`) => void;
  sending: boolean;
}) {
  const [type, setType] = useState<PaymentType>("bonus");
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [addrInput, setAddrInput] = useState(player.walletAddress ?? "");

  const handleSend = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onSend(type, amt, note.trim() || undefined);
  };

  const handleSaveAddress = () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(addrInput)) {
      onSaveAddress(addrInput as `0x${string}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-emerald-800"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Send to {player.name}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>

        {/* Player address */}
        {!player.walletAddress && (
          <div className="mb-4">
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">
              Player EVM Address
            </label>
            <input
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSaveAddress}
              disabled={!/^0x[a-fA-F0-9]{40}$/.test(addrInput)}
              className="mt-2 w-full py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              Save Address
            </button>
          </div>
        )}

        {/* Payment type */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(["bonus", "fine", "tip"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-2 rounded-lg text-[10px] font-mono uppercase ${
                type === t
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-950 border border-slate-800 text-slate-400"
              }`}
            >
              {t === "bonus" ? "🏆 Bonus" : t === "fine" ? "🟨 Fine" : "💚 Tip"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">
            Amount (USDt)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="1"
            max="10000"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Player of the match"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <PrimaryButton
          onClick={handleSend}
          disabled={sending || !player.walletAddress}
          className="w-full"
        >
          {sending ? "Sending…" : `Send ${amount} USDt`}
        </PrimaryButton>

        {!player.walletAddress && (
          <p className="text-[9px] font-mono text-slate-600 mt-2 text-center">
            Add player&apos;s EVM address first
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">{label}</p>
    </div>
  );
}
