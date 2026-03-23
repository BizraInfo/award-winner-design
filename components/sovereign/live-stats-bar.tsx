"use client";

/**
 * LiveStatsBar — shows real-time sovereign data from the user's kernel.
 * Polls every 15s. Shows "SOVEREIGN" when kernel is alive, "OFFLINE" otherwise.
 */

import { useSovereignStats } from "@/lib/use-sovereign-stats";

export function LiveStatsBar() {
  const stats = useSovereignStats();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "2rem",
        padding: "8px 16px",
        background: "rgba(10, 22, 40, 0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(201, 169, 98, 0.1)",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "11px",
        letterSpacing: "0.05em",
        color: "rgba(232, 228, 219, 0.5)",
      }}
    >
      <span
        style={{
          color: stats.kernelAlive ? "#34D399" : "#6B7280",
          fontWeight: 600,
        }}
      >
        {stats.kernelAlive ? "● SOVEREIGN" : "○ OFFLINE"}
      </span>

      {stats.kernelAlive && (
        <>
          <span>
            <span style={{ color: "#C9A962" }}>{stats.seedBalance}</span> SEED
          </span>
          <span>
            <span style={{ color: "#C9A962" }}>{stats.totalMissions}</span>{" "}
            missions
          </span>
          <span>
            <span style={{ color: "#C9A962" }}>{stats.knowledgeEntries}</span>{" "}
            knowledge
          </span>
          <span>
            <span style={{ color: "#C9A962" }}>{stats.agents}</span> agents
          </span>
          {stats.gpu && (
            <span style={{ color: "rgba(232, 228, 219, 0.3)" }}>
              {stats.gpu.replace("NVIDIA GeForce ", "")}
            </span>
          )}
        </>
      )}

      {!stats.kernelAlive && (
        <span style={{ color: "rgba(232, 228, 219, 0.3)" }}>
          Start your kernel: <code>bizra start</code>
        </span>
      )}
    </div>
  );
}
