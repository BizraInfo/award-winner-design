(function (window) {
  const MINIMUMS = {
    ramGb: 16,
    storageGb: 150,
    threads: 8
  }

  const RECOMMENDED = {
    ramGb: 32,
    storageGb: 500,
    threads: 12
  }

  const round = (value, places = 1) =>
    typeof value === "number"
      ? Math.round(value * Math.pow(10, places)) / Math.pow(10, places)
      : null

  const parseOS = () => {
    const ua = navigator.userAgent || ""
    if (/Windows NT 10/.test(ua)) return "Windows 10/11"
    if (/Windows NT 6\.3/.test(ua)) return "Windows 8.1"
    if (/Windows NT 6\.2/.test(ua)) return "Windows 8"
    if (/Windows NT 6\.1/.test(ua)) return "Windows 7"
    if (/Mac OS X/.test(ua)) return "macOS"
    if (/Linux/.test(ua)) return "Linux"
    return "Unknown OS"
  }

  const detectArch = () => {
    const ua = navigator.userAgent || ""
    if (/WOW64|Win64|x64|amd64|x86_64/.test(ua)) return "x64"
    if (/arm64|aarch64/.test(ua)) return "ARM64"
    return "Unknown"
  }

  const detectGPU = () => {
    try {
      const canvas = document.createElement("canvas")
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")

      if (!gl) return { vendor: "Unknown", model: "Unknown", label: "Unknown GPU" }

      const dbg = gl.getExtension("WEBGL_debug_renderer_info")
      const vendor = dbg
        ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
        : "Unknown"
      const model = dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : "Unknown"

      return {
        vendor: vendor || "Unknown",
        model: model || "Unknown",
        label: `${vendor || "Unknown"} ${model || ""}`.trim()
      }
    } catch (err) {
      return { vendor: "Unknown", model: "Unknown", label: "Unknown GPU" }
    }
  }

  const detectStorage = async () => {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { totalGb: null, freeGb: null }
    }

    try {
      const estimate = await navigator.storage.estimate()
      const totalGb = estimate.quota ? round(estimate.quota / 1e9, 0) : null
      const usedGb = estimate.usage ? round(estimate.usage / 1e9, 0) : null
      const freeGb =
        totalGb !== null && usedGb !== null ? round(totalGb - usedGb, 0) : null

      return { totalGb, freeGb }
    } catch (err) {
      return { totalGb: null, freeGb: null }
    }
  }

  const buildStatus = (metrics) => {
    const statuses = []

    const threads = metrics.cpuThreads || 0
    if (threads >= RECOMMENDED.threads) {
      statuses.push({ label: "CPU Threads", value: threads, status: "ready" })
    } else if (threads >= MINIMUMS.threads) {
      statuses.push({ label: "CPU Threads", value: threads, status: "warn" })
    } else {
      statuses.push({ label: "CPU Threads", value: threads, status: "unmet" })
    }

    const ram = metrics.memoryGb || 0
    if (ram >= RECOMMENDED.ramGb) {
      statuses.push({ label: "Memory", value: `${ram} GB`, status: "ready" })
    } else if (ram >= MINIMUMS.ramGb) {
      statuses.push({ label: "Memory", value: `${ram} GB`, status: "warn" })
    } else {
      statuses.push({ label: "Memory", value: `${ram} GB`, status: "unmet" })
    }

    const storage = metrics.storage?.freeGb || 0
    if (storage >= RECOMMENDED.storageGb) {
      statuses.push({ label: "Free Storage", value: `${storage} GB`, status: "ready" })
    } else if (storage >= MINIMUMS.storageGb) {
      statuses.push({ label: "Free Storage", value: `${storage} GB`, status: "warn" })
    } else {
      statuses.push({ label: "Free Storage", value: `${storage} GB`, status: "unmet" })
    }

    const overall = statuses.some((s) => s.status === "unmet")
      ? "unmet"
      : statuses.some((s) => s.status === "warn")
        ? "warn"
        : "ready"

    return { overall, statuses }
  }

  async function scan(onUpdate) {
    const emit = (status, detail) => {
      if (typeof onUpdate === "function") onUpdate(status, detail)
    }

    emit("Initializing System Scanner...", "Preparing to analyze your environment")
    await new Promise((r) => setTimeout(r, 150))

    const cpuThreads = navigator.hardwareConcurrency || null
    const deviceMemory = navigator.deviceMemory ? Math.round(navigator.deviceMemory) : null
    const storage = await detectStorage()

    emit("Detecting hardware...", "CPU, RAM, GPU, and storage")
    const gpu = detectGPU()
    await new Promise((r) => setTimeout(r, 120))

    emit("Evaluating readiness...", "Comparing against BIZRA baseline")
    const summary = buildStatus({
      cpuThreads,
      memoryGb: deviceMemory,
      storage
    })

    const result = {
      os: parseOS(),
      architecture: detectArch(),
      cpuThreads: cpuThreads || undefined,
      memoryGb: deviceMemory || undefined,
      storage,
      gpu,
      summary
    }

    emit("Scan complete", "Your system analysis is ready")
    return result
  }

  window.SystemScanner = { scan }
})(window)
