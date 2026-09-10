"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Upload } from "lucide-react";
import { unzip } from "fflate";
import { parseAppleHealth } from "@/lib/api";
import { memory } from "@/lib/sdk/eazo-client";
import type { HRVData } from "@/lib/types";

function findHealthXml(
  data: Record<string, Uint8Array>
): { name: string; text: string } | null {
  const candidates = Object.entries(data).filter(
    ([name]) =>
      name.toLowerCase().endsWith(".xml") &&
      !/ecg|electrocardiogram/i.test(name)
  );
  if (candidates.length === 0) return null;

  const [name, bytes] = candidates.sort(
    (a, b) => b[1].byteLength - a[1].byteLength
  )[0];
  const text = new TextDecoder().decode(bytes);
  return { name, text };
}

export function AppleHealthUpload({
  onData,
  onSkip,
}: {
  onData: (d: HRVData) => void;
  onSkip: () => void;
}) {
  const [state, setState] = useState<"idle" | "parsing" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setState("parsing");
    try {
      const buffer = await file.arrayBuffer();
      const unzipped = await new Promise<Record<string, Uint8Array>>(
        (resolve, reject) => {
          unzip(
            new Uint8Array(buffer),
            { filter: (info) => info.name.toLowerCase().endsWith(".xml") },
            (err, data) => {
              if (err) reject(err);
              else resolve(data ?? {});
            }
          );
        }
      );

      const xml = findHealthXml(unzipped);
      if (!xml) {
        throw new Error(
          "Could not find an Apple Health XML file in this zip."
        );
      }

      const result = await parseAppleHealth(xml.text, xml.name);
      if (!result.hrvData) {
        setErrMsg("Couldn't read this export. Try a different one.");
        setState("error");
        return;
      }

      memory.reportAction({
        content: "User uploaded and parsed an Apple Health export.",
        event_type: "create",
        page: "hrv-pull",
        metadata: { type: "apple_health_export", has_data: true },
      }).catch(() => {});
      onData(result.hrvData);
    } catch (err) {
      setErrMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong reading that export."
      );
      setState("error");
    }
  }, [onData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.3rem,5vw,1.6rem)",
            color: "var(--color-text-primary)",
          }}
        >
          Apple Health keeps everything in one export. Let&apos;s read it
          locally.
        </h3>
      </div>

      {[
        {
          n: 1,
          text: "Open Health app → Profile → Export All Health Data",
        },
        { n: 2, text: "Wait for the zip, then download it" },
        { n: 3, text: "Upload the export.zip below" },
      ].map((s) => (
        <div
          key={s.n}
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-brand-primary) 15%, transparent)",
              color: "var(--color-brand-primary)",
            }}
          >
            {s.n}
          </span>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {s.text}
          </p>
        </div>
      ))}

      {state === "error" && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: "rgba(220,38,38,0.08)",
            border: "1.5px solid rgba(220,38,38,0.2)",
          }}
        >
          <AlertCircle
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: "var(--color-states-error)" }}
          />
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {errMsg}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        disabled={state === "parsing"}
        className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2"
        style={{
          backgroundColor:
            state === "parsing"
              ? "var(--color-bg-elevated)"
              : "var(--color-brand-primary)",
          color:
            state === "parsing"
              ? "var(--color-text-faint)"
              : "var(--color-text-primary)",
          fontFamily: "var(--font-body)",
          minHeight: "58px",
        }}
      >
        <Upload className="w-4 h-4" />
        {state === "parsing" ? "Reading export..." : "Upload Apple Health zip"}
      </motion.button>
      <button
        onClick={onSkip}
        className="w-full text-center text-[11px] py-2 font-medium"
        style={{ color: "var(--color-text-faint)" }}
      >
        Skip — answer manually instead
      </button>
    </div>
  );
}
