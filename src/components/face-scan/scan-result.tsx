"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ShieldCheck } from "lucide-react";
import { getQvacAdvice } from "@/lib/api";

export function ScanResult({ txHash }: { txHash?: string }) {
  const router = useRouter();
  const { zkProof, selectedStressors } = useBodyDebtStore();
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceSource, setAdviceSource] = useState<string | null>(null);

  useEffect(() => {
    if (advice) return;
    const stressScore = zkProof?.stressScore != null
      ? Math.round(zkProof.stressScore * 100)
      : 50;

    getQvacAdvice({
      stressScore,
      isHealthy: zkProof?.isHealthy ?? true,
      features: {
        eyeFatigue: (zkProof?.stressScore ?? 0.5) > 0.4,
        browTension: (zkProof?.stressScore ?? 0.5) > 0.3,
        mouthTension: false,
      },
      stressors: selectedStressors.map((s) => s.type),
    }).then((result) => {
      setAdvice(result.advice);
      setAdviceSource(result.source);
    }).catch(() => {
      setAdvice("Focus on hydration and rest. Your body needs recovery time.");
      setAdviceSource("fallback");
    });
  }, [zkProof, selectedStressors, advice]);

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex-1 flex flex-col gap-4 pb-10"
    >
      <div className="flex items-center gap-3 rounded-2xl p-4"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
        <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#10B981" }}>
            {zkProof?.verified ? "Cryptographically Verified on SKALE" : "ZK Proof Generated Locally"}
          </p>
          <p className="text-sm font-medium mt-0.5" style={{ color: "#F5F5F4" }}>
            Stress score: {zkProof ? `${Math.round(zkProof.stressScore * 100)}%` : "—"}
          </p>
        </div>
      </div>

      {txHash && (
        <div className="rounded-2xl px-4 py-3 break-all"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <span className="text-[9px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#524F4C" }}>
            Transaction Hash
          </span>
          <span className="text-xs font-mono" style={{ color: "#A8A29E" }}>{txHash}</span>
        </div>
      )}

      {advice && (
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#A8A29E" }}>
              Recovery Advice
            </span>
            {adviceSource === "qvac-local" && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "rgba(234,88,12,0.15)", color: "#EA580C" }}>
                QVAC LOCAL
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#A8A29E" }}>{advice}</p>
        </div>
      )}

      <p className="text-[10px] text-center" style={{ color: "#3a3835" }}>
        Proof generated on-device · Zero data retained
      </p>

      <div className="mt-auto">
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/hrv-pull")}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
          Accept & Continue
        </motion.button>
      </div>
    </motion.div>
  );
}
