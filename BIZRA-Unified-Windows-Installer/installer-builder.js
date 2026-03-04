(function (window) {
  const DEFAULT_PHASES = [
    { id: "profile", label: "Apply user profile", weight: 10, detail: "Personalizing agent team and privacy controls" },
    { id: "requirements", label: "Verify system requirements", weight: 10, detail: "CPU, RAM, storage, GPU baselines" },
    { id: "config", label: "Generate configuration", weight: 15, detail: "Creating .env and manifest files" },
    { id: "services", label: "Bundle core services", weight: 25, detail: "API, databases, vector store, Redis, Neo4j" },
    { id: "models", label: "Prepare AI models", weight: 15, detail: "Selecting Ollama + LM Studio targets" },
    { id: "package", label: "Build installer package", weight: 15, detail: "Creating unified installer archive" },
    { id: "finalize", label: "Finalize & verify", weight: 10, detail: "Checksums, signatures, health probes" }
  ]

  const simulateBuild = (phases = DEFAULT_PHASES, onProgress) =>
    new Promise((resolve) => {
      let percent = 0
      let phaseIndex = 0

      const advancePhase = () => {
        if (phaseIndex >= phases.length) {
          resolve({
            installerName: "BIZRA-Sovereign-OS-Setup.exe",
            saveLocation: "Downloads/BIZRA-Installer/",
            totalSizeGb: 4.2
          })
          return
        }

        const phase = phases[phaseIndex]
        const ticks = 5
        let tick = 0
        const increment = phase.weight / ticks
        const duration = Math.max(phase.weight * 40, 250) // simple pacing

        const timer = setInterval(() => {
          tick += 1
          percent = Math.min(100, Math.round(percent + increment))
          if (typeof onProgress === "function") {
            onProgress({
              percent,
              phaseIndex,
              phase,
              status: tick >= ticks ? "complete" : "in_progress"
            })
          }

          if (tick >= ticks) {
            clearInterval(timer)
            phaseIndex += 1
            setTimeout(advancePhase, 120)
          }
        }, duration / ticks)
      }

      advancePhase()
    })

  window.InstallerBuilder = { simulateBuild, DEFAULT_PHASES }
})(window)
