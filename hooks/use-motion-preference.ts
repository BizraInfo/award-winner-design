import { useEffect, useState, useCallback } from "react"

// Centralized motion preference hook that respects system settings
// and persists user choice for consistency across sessions.
export function useMotionPreference() {
  const [motionEnabled, setMotionEnabled] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizra-motion")
      if (saved === "off") {
        setMotionEnabled(false)
        return
      }
    } catch {
      // ignore storage errors
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateFromMedia = () => setMotionEnabled(!mediaQuery.matches)
    updateFromMedia()
    mediaQuery.addEventListener("change", updateFromMedia)
    return () => mediaQuery.removeEventListener("change", updateFromMedia)
  }, [])

  const toggleMotion = useCallback(() => {
    setMotionEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem("bizra-motion", next ? "on" : "off")
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  return { motionEnabled, toggleMotion }
}
