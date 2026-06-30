"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Upload } from "lucide-react";
import { parseGarminCsv } from "@/lib/api";
import { memory } from "@/lib/sdk/eazo-client";
import type { HRVData } from "@/lib/types";

export function GarminUpload({ onData, onSkip }: { onData: (d: HRVData) => void; onSkip: () => void }) {
  const [state, setState] = useState<"idle" | "parsing" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setState("parsing");
    try {
      const text = await file.text();
      const result = await parseGarminCsv(text);
      if (!result.hrvData) {
        setErrMsg("Couldn't read this file. Try a different export.");
        setState("error");
        return;
      }
      memory.reportAction({
        content: "User uploaded and parsed Garmin CSV.",
        event_type: "create",
        page: "hrv-pull",
        metadata: { type: "garmin_csv", has_data: true },
      }).catch(() => {});
      onData(result.hrvData);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong reading that file.");
      setState("error");
    }
  }, [onData]);

  return (
    <div className="flex flex-col gap-4">
      {/* Orb prompt */}
      <div className="text-center">
        <h3 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.3rem,5vw,1.6rem)", color: "var(--color-text-primary)" }}>
          Garmin keeps your best data on your own device. Let&apos;s bring it in.
        </h3>
      </div>

      {/* Steps */}
      {[
        { n: 1, text: "Open Garmin Connect → Health Stats → Heart Rate Variability → Export CSV" },
        { n: 2, text: "Download the file to your phone" },
        { n: 3, text: "Upload it below" },
      ].map((s) => (
        <div key={s.n} className="flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(234,88,12,0.15)", color: "var(--color-brand-primary)" }}>{s.n}</span>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{s.text}</p>
        </div>
      ))}

      {/* Error */}
      {state === "error" && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: "rgba(127,29,29,0.18)", border: "1.5px solid rgba(220,38,38,0.3)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-states-error)" }} />
          <p className="text-xs" style={{ color: "#fca5a5" }}>{errMsg}</p>
        </div>
      )}

      {/* Upload button */}
      <input ref={inputRef} type="file" accept=".csv,.zip" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <motion.button whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        disabled={state === "parsing"}
        className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2"
        style={{ backgroundColor: state === "parsing" ? "var(--color-bg-elevated)" : "var(--color-brand-primary)", color: state === "parsing" ? "var(--color-text-faint)" : "var(--color-text-primary)", fontFamily: "var(--font-body)", minHeight: "58px" }}>
        <Upload className="w-4 h-4" />
        {state === "parsing" ? "Reading file..." : "Upload Garmin CSV"}
      </motion.button>
      <button onClick={onSkip} className="w-full text-center text-[11px] py-2 font-medium" style={{ color: "var(--color-text-faint)" }}>
        Skip — answer manually instead
      </button>
    </div>
  );
}
