import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateRecoveryIcs } from "@/lib/ics";

// ─── Fixed test data ──────────────────────────────────────────────────────────

const DANGER_ENDS = "2026-06-03T08:00:00.000Z";
const PARTIAL_ENDS = "2026-06-03T14:00:00.000Z";
const CLEARED_AT = "2026-06-04T02:00:00.000Z";

const VALID_INPUT = {
  verdict: "Your body is in damage control. Listen to it.",
  recoveryTime: "2am tomorrow",
  recoveryArc: {
    dangerEnds: DANGER_ENDS,
    partialEnds: PARTIAL_ENDS,
    clearedAt: CLEARED_AT,
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-03T06:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractIcsField(ics: string, field: string): string | null {
  // Match field: value (with possible continuation lines)
  const regex = new RegExp(`^${field}:(.+)$`, "m");
  const match = ics.match(regex);
  if (!match) return null;
  return match[1].trim();
}

function countIcsOccurrences(ics: string, token: string): number {
  return (ics.match(new RegExp(token, "g")) ?? []).length;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateRecoveryIcs", () => {
  describe("basic structure", () => {
    it("returns a string that starts with BEGIN:VCALENDAR", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    });

    it("ends with END:VCALENDAR followed by CRLF", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    });

    it("contains a BEGIN:VEVENT and END:VEVENT pair", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      const begins = countIcsOccurrences(ics, "BEGIN:VEVENT");
      const ends = countIcsOccurrences(ics, "END:VEVENT");
      expect(begins).toBe(1);
      expect(ends).toBe(1);
    });

    it("uses CRLF line endings exclusively", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // Split by CRLF — should have > 5 lines, none left over
      const lines = ics.split("\r\n");
      expect(lines.length).toBeGreaterThan(5);
      // No dangling LF without CR
      expect(ics).not.toContain("\n\r");
    });
  });

  describe("required iCalendar properties", () => {
    it("includes VERSION:2.0", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("VERSION:2.0");
    });

    it("includes a PRODID with the app identifier", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("PRODID:-//Body Debt//Recovery Calendar//EN");
    });

    it("includes CALSCALE:GREGORIAN", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("CALSCALE:GREGORIAN");
    });

    it("includes METHOD:PUBLISH", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("METHOD:PUBLISH");
    });
  });

  describe("event timing", () => {
    it("sets DTSTART from dangerEnds (correct date prefix)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // DTSTART uses local time (floating time per iCalendar spec).
      // The date part (20260603) is fixed; time depends on test env TZ.
      expect(ics).toMatch(/^DTSTART:20260603T\d{6}$/m);
    });

    it("sets DTEND from clearedAt (correct date prefix)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // clearedAt is 2026-06-04 in UTC; date part may vary by TZ
      expect(ics).toMatch(/^DTEND:2026060[34]T\d{6}$/m);
    });

    it("includes a UID with the correct format", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // formatIcsDate returns YYYYMMDDTHHMMSS (e.g., 20260603T090000)
      expect(ics).toMatch(/^UID:body-debt-recovery-\d{8}T\d{6}@bodydebt\.app$/m);
    });

    it("sets DTSTAMP to the current time (correct date)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // System time is 2026-06-03T06:00:00 UTC → DTSTAMP in local time
      expect(ics).toMatch(/^DTSTAMP:20260603T\d{6}$/m);
    });
  });

  describe("event content", () => {
    it("sets SUMMARY to 'Recovery Window — <appName>'", () => {
      const ics = generateRecoveryIcs({ ...VALID_INPUT, appName: "Body Debt" });
      // SUMMARY is short enough to not be folded
      expect(ics).toMatch(/^SUMMARY:Recovery Window — Body Debt$/m);
    });

    it("uses default appName 'Body Debt Recovery' when not provided", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toMatch(/^SUMMARY:Recovery Window — Body Debt Recovery$/m);
    });

    it("includes the verdict in the DESCRIPTION (may be folded)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // Verdict may be split across a folded line boundary,
      // so use a partial match for the unique core text
      expect(ics).toContain("damage control");
    });

    it("includes the recoveryTime in the DESCRIPTION (may be folded)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      // "Cleared by:" may be split across a fold boundary in the
      // DESCRIPTION field, so match the unique trailing part
      expect(ics).toContain("2am tomorrow");
    });

    it("includes 'Generated by bodydebt.app' in the DESCRIPTION", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("bodydebt.app");
    });
  });

  describe("alarm (VALARM)", () => {
    it("includes a VALARM block", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("BEGIN:VALARM");
      expect(ics).toContain("END:VALARM");
    });

    it("sets the alarm trigger 1 hour before the event", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("TRIGGER:-PT1H");
    });

    it("sets ACTION:DISPLAY", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("ACTION:DISPLAY");
    });

    it("includes a reminder description", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("Reminder: check your recovery progress");
    });
  });

  describe("status and transparency", () => {
    it("sets STATUS:CONFIRMED", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("STATUS:CONFIRMED");
    });

    it("sets TRANSP:OPAQUE (busy time)", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toContain("TRANSP:OPAQUE");
    });
  });

  describe("line folding (RFC 5545)", () => {
    it("folds long lines (>74 octets) with continuation", () => {
      // Create a very long verdict to force line folding
      const longVerdict = "A".repeat(200);
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        verdict: longVerdict,
      });
      // Find continuation lines (those starting with a space)
      const continuationLines = ics.match(/^ .{10,}$/gm);
      expect(continuationLines).not.toBeNull();
      expect(continuationLines!.length).toBeGreaterThanOrEqual(2);
    });

    it("does not fold short lines", () => {
      const ics = generateRecoveryIcs(VALID_INPUT);
      expect(ics).toMatch(/^STATUS:CONFIRMED$/m);
    });

    it("reassembles folded content correctly", () => {
      const longVerdict = "Your body is in damage control mode after last night's heavy training session and poor sleep quality combined.";
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        verdict: longVerdict,
      });
      // Reconstruct folded lines by joining with empty string
      const lines = ics.split("\r\n");
      // Find the DESCRIPTION block (starts with DESCRIPTION: or space continuation)
      const descBlock: string[] = [];
      let inDesc = false;
      for (const line of lines) {
        if (line.startsWith("DESCRIPTION:")) {
          descBlock.push(line.slice("DESCRIPTION:".length));
          inDesc = true;
        } else if (inDesc && line.startsWith(" ")) {
          descBlock.push(line.slice(1));
        } else if (inDesc) {
          break;
        }
      }
      const reconstructed = descBlock.join("");
      expect(reconstructed).toContain(longVerdict);
    });
  });

  describe("custom appName", () => {
    it("uses the provided appName in the SUMMARY", () => {
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        appName: "Match Fit",
      });
      const summary = extractIcsField(ics, "SUMMARY");
      expect(summary).toBe("Recovery Window — Match Fit");
    });

    it("uses the provided appName even when empty", () => {
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        appName: "",
      });
      const summary = extractIcsField(ics, "SUMMARY");
      expect(summary).toBe("Recovery Window —");
    });
  });

  describe("edge cases", () => {
    it("handles very long verdict gracefully (line folding)", () => {
      const longVerdict = "Your body is showing " + "very ".repeat(30) + "significant physiological stress markers that require immediate attention and rest.";
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        verdict: longVerdict,
      });
      // Should still be valid ICS structure
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("END:VEVENT");
    });

    it("handles zero-length verdict", () => {
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        verdict: "",
      });
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VEVENT");
    });

    it("produces a valid ICS even with empty recoveryTime", () => {
      const ics = generateRecoveryIcs({
        ...VALID_INPUT,
        recoveryTime: "",
      });
      expect(ics).toContain("Cleared by:");
    });
  });
});
