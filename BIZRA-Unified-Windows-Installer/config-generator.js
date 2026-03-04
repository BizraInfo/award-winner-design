(function (window) {
  const STORAGE_KEY = "bizra-installer-profile"
  const VERSION = "v2.2.0-rc1"

  const defaultProfile = () => ({
    name: "",
    installPath: "C:\\Program Files\\BIZRA\\",
    privacyLevel: "maximum",
    createdAt: null,
    updatedAt: null
  })

  const loadProfile = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaultProfile()
      const parsed = JSON.parse(raw)
      return { ...defaultProfile(), ...parsed }
    } catch (err) {
      return defaultProfile()
    }
  }

  const saveProfile = (profile) => {
    const timestamp = new Date().toISOString()
    const payload = {
      ...defaultProfile(),
      ...profile,
      updatedAt: timestamp,
      createdAt: profile.createdAt || timestamp
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return payload
  }

  const buildConfig = (profile, scanResult) => {
    const manifest = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      user: {
        name: profile.name,
        privacyLevel: profile.privacyLevel,
        installPath: profile.installPath
      },
      system: {
        os: scanResult?.os || "Unknown",
        architecture: scanResult?.architecture || "Unknown",
        cpuThreads: scanResult?.cpuThreads || null,
        memoryGb: scanResult?.memoryGb || null,
        storage: scanResult?.storage || null,
        gpu: scanResult?.gpu || null,
        readiness: scanResult?.summary || null
      }
    }

    const envLines = [
      `APP_VERSION=${VERSION}`,
      `USER_NAME=${profile.name || "User"}`,
      `PRIVACY_LEVEL=${profile.privacyLevel}`,
      `INSTALL_PATH=${profile.installPath}`,
      `OS_NAME=${manifest.system.os}`,
      `ARCHITECTURE=${manifest.system.architecture}`,
      `CPU_THREADS=${manifest.system.cpuThreads ?? ""}`,
      `MEMORY_GB=${manifest.system.memoryGb ?? ""}`,
      `GPU_MODEL=${manifest.system.gpu?.label ?? ""}`,
      `FREE_STORAGE_GB=${manifest.system.storage?.freeGb ?? ""}`,
      `CONFIG_CREATED_AT=${manifest.generatedAt}`
    ]

    return {
      manifest,
      env: envLines.join("\n")
    }
  }

  const downloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  window.ConfigGenerator = {
    loadProfile,
    saveProfile,
    buildConfig,
    downloadTextFile,
    defaultProfile
  }
})(window)
