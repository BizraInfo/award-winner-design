;(function () {
  const STEP_IDS = ["step-1", "step-2", "step-3", "step-4", "step-5"]

  const AGENTS = [
    {
      id: "master_reasoner",
      name: "The Reasoner",
      title: "Master Reasoner",
      description: "Deep thinking for hard decisions. Breaks down complex problems into clear paths.",
      color: "#C9A962",
      capabilities: ["Strategic planning", "Decision frameworks", "Problem decomposition"]
    },
    {
      id: "memory_architect",
      name: "The Architect",
      title: "Memory Architect",
      description: "Organizes everything in your life. Builds your personal knowledge base.",
      color: "#2A9D8F",
      capabilities: ["Knowledge organization", "Pattern recognition", "Life documentation"]
    },
    {
      id: "creative_synthesizer",
      name: "The Creator",
      title: "Creative Synthesizer",
      description: "Writing, ideas, and creative output. Turns your thoughts into polished work.",
      color: "#E76F51",
      capabilities: ["Content creation", "Idea generation", "Writing assistance"]
    },
    {
      id: "data_analyst",
      name: "The Analyst",
      title: "Data and Analysis",
      description: "Makes sense of numbers and information. Finds patterns others miss.",
      color: "#264653",
      capabilities: ["Data analysis", "Research synthesis", "Trend identification"]
    },
    {
      id: "communicator",
      name: "The Voice",
      title: "Communication Agent",
      description: "Helps you present ideas and communicate with impact.",
      color: "#F4A261",
      capabilities: ["Presentation design", "Communication strategy", "Message clarity"]
    },
    {
      id: "execution_planner",
      name: "The Executor",
      title: "Execution Planner",
      description: "Turns plans into action. Keeps you on track without shame.",
      color: "#E9C46A",
      capabilities: ["Task breakdown", "Timeline management", "Accountability"]
    },
    {
      id: "ethics_guardian",
      name: "The Guardian",
      title: "Ethics and Safety",
      description: "Watches over your digital sovereignty. Protects your values.",
      color: "#8B5CF6",
      capabilities: ["Privacy protection", "Ethical guidance", "Value alignment"]
    }
  ]

  const state = {
    currentStep: 1,
    scan: null,
    profile: ConfigGenerator.loadProfile(),
    config: null,
    buildArtifact: null
  }

  const $ = (id) => document.getElementById(id)

  const elements = {
    scanStatus: $("scan-status"),
    scanDetail: $("scan-detail"),
    startScan: $("start-scan"),
    backToScan: $("back-to-scan"),
    continueToProfile: $("continue-to-profile"),
    backToResults: $("back-to-results"),
    continueToGeneration: $("continue-to-generation"),
    systemSpecs: $("system-specs"),
    agentPreview: $("agent-preview"),
    profileStatusTitle: $("profile-status-title"),
    profileStatusDesc: $("profile-status-desc"),
    userName: $("user-name"),
    installPath: $("install-path"),
    privacyLevel: $("privacy-level"),
    progressFill: $("progress-fill"),
    progressText: $("progress-text"),
    progressPercent: $("progress-percent"),
    installationPhases: $("installation-phases"),
    installerName: $("installer-name"),
    generateAnother: $("generate-another"),
    downloadInstaller: $("download-installer")
  }

  const showStep = (stepNumber) => {
    state.currentStep = stepNumber
    STEP_IDS.forEach((id, index) => {
      const el = $(id)
      if (!el) return
      el.classList.toggle("active", index + 1 === stepNumber)
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const updateProfileStatus = () => {
    const hasProfile = Boolean(state.profile?.name)
    elements.profileStatusTitle.textContent = hasProfile
      ? "Existing profile loaded"
      : "New user detected"
    elements.profileStatusDesc.textContent = hasProfile
      ? "We found your previous BIZRA installer preferences and will reuse them."
      : "No existing BIZRA configuration found. We'll create a personalized profile for you."
  }

  const renderAgents = () => {
    if (!elements.agentPreview) return
    elements.agentPreview.innerHTML = AGENTS.map((agent) => {
      const capabilityList = agent.capabilities.map((cap) => `<li>${cap}</li>`).join("")
      return `
        <div class="agent-card" style="border-color: ${agent.color}">
          <div class="agent-icon" style="color: ${agent.color}; border: 1px solid ${agent.color};">${agent.name
            .split(" ")
            .map((w) => w[0])
            .join("")}</div>
          <h4>${agent.title}</h4>
          <p>${agent.description}</p>
          <ul style="text-align:left; margin-top:12px; color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">
            ${capabilityList}
          </ul>
        </div>
      `
    }).join("")
  }

  const renderSystemSpecs = (scan) => {
    if (!elements.systemSpecs || !scan) return
    const freeStorage = scan.storage?.freeGb !== null && scan.storage?.freeGb !== undefined
      ? `${scan.storage.freeGb} GB free`
      : "Unknown"
    const totalStorage = scan.storage?.totalGb
      ? `Total: ${scan.storage.totalGb} GB`
      : "Total unknown"

    const readinessText =
      scan.summary?.overall === "ready"
        ? "Ready for installation"
        : scan.summary?.overall === "warn"
          ? "Meets minimum; expect longer setup"
          : "Requirements unmet or unknown"

    const specs = [
      { label: "Operating System", value: scan.os, detail: `Arch: ${scan.architecture}` },
      { label: "CPU Threads", value: scan.cpuThreads || "Unknown", detail: "Recommended 12+ threads" },
      { label: "Memory", value: scan.memoryGb ? `${scan.memoryGb} GB` : "Unknown", detail: "Recommended 32 GB" },
      { label: "Storage", value: freeStorage, detail: totalStorage },
      { label: "GPU", value: scan.gpu?.label || "Unknown GPU", detail: scan.gpu?.vendor || "Vendor unknown" },
      { label: "Readiness", value: readinessText, detail: "Baseline: Win11 Pro, 32 GB RAM, 500 GB free" }
    ]

    elements.systemSpecs.innerHTML = specs
      .map(
        (spec) => `
        <div class="info-card">
          <div class="info-icon">${spec.label.slice(0, 2).toUpperCase()}</div>
          <div class="info-content">
            <h3>${spec.label}</h3>
            <p>${spec.detail}</p>
            <div class="info-value">${spec.value}</div>
          </div>
        </div>
      `
      )
      .join("")
  }

  const renderPhases = () => {
    const phases = InstallerBuilder?.DEFAULT_PHASES || []
    if (!elements.installationPhases) return
    elements.installationPhases.innerHTML = phases
      .map(
        (phase, index) => `
        <div class="phase-item ${index === 0 ? "active" : ""}" data-phase="${phase.id}">
          <div class="phase-status">${index + 1}</div>
          <div class="phase-info">
            <div class="phase-name">${phase.label}</div>
            <div class="phase-desc">${phase.detail}</div>
          </div>
          <div class="phase-duration">${phase.weight}%</div>
        </div>
      `
      )
      .join("")
  }

  const setPhaseState = (activeIndex) => {
    const items = elements.installationPhases?.querySelectorAll(".phase-item") || []
    items.forEach((item, idx) => {
      item.classList.remove("active", "complete")
      if (idx < activeIndex) item.classList.add("complete")
      else if (idx === activeIndex) item.classList.add("active")
    })
  }

  const setProgress = (percent, label) => {
    if (elements.progressFill) elements.progressFill.style.width = `${percent}%`
    if (elements.progressPercent) elements.progressPercent.textContent = `${Math.min(percent, 100)}%`
    if (elements.progressText) elements.progressText.textContent = label || "Working..."
  }

  const fillProfileForm = () => {
    const profile = state.profile || ConfigGenerator.defaultProfile()
    if (elements.userName) elements.userName.value = profile.name || ""
    if (elements.installPath) elements.installPath.value = profile.installPath || "C:\\Program Files\\BIZRA\\"
    if (elements.privacyLevel) elements.privacyLevel.value = profile.privacyLevel || "maximum"
  }

  const readProfileForm = () => ({
    name: (elements.userName?.value || "").trim(),
    installPath: (elements.installPath?.value || "C:\\Program Files\\BIZRA\\").trim(),
    privacyLevel: elements.privacyLevel?.value || "maximum"
  })

  const validateProfile = (profile) => profile.name.length >= 2

  const startScan = async () => {
    elements.startScan.disabled = true
    setProgress(0, "Initializing...")
    try {
      const scan = await SystemScanner.scan((status, detail) => {
        elements.scanStatus.textContent = status
        elements.scanDetail.textContent = detail
      })
      state.scan = scan
      renderSystemSpecs(scan)
      updateProfileStatus()
      showStep(2)
    } catch (err) {
      elements.scanStatus.textContent = "Scan failed"
      elements.scanDetail.textContent = "Please try again or check browser permissions."
    } finally {
      elements.startScan.disabled = false
    }
  }

  const startBuild = () => {
    renderPhases()
    setProgress(0, "Initializing installer builder...")
    showStep(4)

    InstallerBuilder.simulateBuild(InstallerBuilder.DEFAULT_PHASES, (update) => {
      setProgress(update.percent, update.phase.label)
      setPhaseState(update.phaseIndex)
    }).then((artifact) => {
      state.buildArtifact = artifact
      const displayName = `${artifact.installerName.replace(".exe", "")}-${Date.now()}.exe`
      elements.installerName.textContent = displayName
      showStep(5)
    })
  }

  const wireEvents = () => {
    elements.startScan?.addEventListener("click", startScan)
    elements.backToScan?.addEventListener("click", () => showStep(1))
    elements.backToResults?.addEventListener("click", () => showStep(2))

    elements.continueToProfile?.addEventListener("click", () => {
      fillProfileForm()
      renderAgents()
      showStep(3)
    })

    elements.continueToGeneration?.addEventListener("click", () => {
      const profile = readProfileForm()
      if (!validateProfile(profile)) {
        alert("Please enter your name to personalize the installer.")
        return
      }
      state.profile = ConfigGenerator.saveProfile(profile)
      state.config = ConfigGenerator.buildConfig(profile, state.scan)
      startBuild()
    })

    elements.generateAnother?.addEventListener("click", () => {
      showStep(1)
    })

    elements.downloadInstaller?.addEventListener("click", () => {
      if (!state.config) return
      ConfigGenerator.downloadTextFile("bizra-config.env", state.config.env)
      ConfigGenerator.downloadTextFile(
        "bizra-manifest.json",
        JSON.stringify(state.config.manifest, null, 2)
      )
    })
  }

  const init = () => {
    updateProfileStatus()
    fillProfileForm()
    renderAgents()
    wireEvents()
  }

  init()
})()
