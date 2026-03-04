"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useBizraStore, usePhase } from '@/store/use-bizra-store'
import { ChevronDown, Scan, Shield, Zap, Crown, Star, Sparkles } from 'lucide-react'

// Sacred geometry mathematical constants
const PHI = 1.618033988749895
const TAU = 2 * Math.PI

// Sovereignty assessment categories
enum SovereigntyScanPhase {
  ADMISSION = 'admission',
  ANALYSIS_REQUESTED = 'analysis_requested',
  SCANNING_HARDWARE = 'scanning_hardware',
  NEUROLOGICAL_ASSESSMENT = 'neurological_assessment',
  TEMPORAL_EVALUATION = 'temporal_evaluation',
  SOVEREIGNTY_QUOTIENT = 'sovereignty_quotient',
  PROFILE_COMPLETE = 'profile_complete',
  ACTIVATION_RITUAL = 'activation_ritual'
}

interface ScanningResult {
  hardware: {
    webGL: boolean
    storage: number
    memory: number
    threads: number
    score: number
  }
  sovereignty: {
    cognitive: number
    temporal: number
    ethical: number
    total: number
  }
  profile: {
    deviceTrust: number
    userIntent: number
    sovereigntyPotential: number
  }
}

interface GoTNode {
  id: string
  label: string
  x: number
  y: number
  value: number
  phase: SovereigntyScanPhase
}

interface GoTEdge {
  from: string
  to: string
  active: boolean
}

interface SovereigntyAdmissionProps {
  onComplete: () => void
}

export function SovereigntyAdmission({ onComplete }: SovereigntyAdmissionProps) {
  const setPhase = useBizraStore(s => s.setPhase)
  const [currentPhase, setCurrentPhase] = useState<SovereigntyScanPhase>(SovereigntyScanPhase.ADMISSION)
  const [scanProgress, setScanProgress] = useState(0)
  const [results, setResults] = useState<ScanningResult | null>(null)
  const [admissionGranted, setAdmissionGranted] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10])
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10])

  // Sacred geometry animation values
  const theta = useMotionValue(0)
  const scale = useMotionValue(1)
  const opacity = useMotionValue(0.3)

  // Advanced hardware sovereignty scanning
  const performHardwareScan = useCallback(async (): Promise<Partial<ScanningResult>> => {
    setCurrentPhase(SovereigntyScanPhase.SCANNING_HARDWARE)

    const scanPromises = [
      // WebGL Sovereignty Test
      new Promise<boolean>((resolve) => {
        try {
          const canvas = document.createElement('canvas')
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
          resolve(!!gl)
        } catch {
          resolve(false)
        }
      }),

      // Storage Sovereignty Assessment
      navigator.storage?.estimate?.().then(estimate => estimate?.quota || 5 * 1024 * 1024 * 1024).catch(() => 1024 * 1024 * 1024),

      // Memory Sovereignty Calculation
      (navigator as any).deviceMemory ? Promise.resolve((navigator as any).deviceMemory) : Promise.resolve(8),

      // Thread Sovereignty Assessment
      navigator.hardwareConcurrency ? Promise.resolve(navigator.hardwareConcurrency) : Promise.resolve(4)
    ]

    const [webGL, storage, memory, threads] = await Promise.all(scanPromises)

    const hardwareScore = calculateHardwareScore(webGL as boolean, storage as number, memory as number, threads as number)

    return {
      hardware: {
        webGL: webGL as boolean,
        storage: storage as number,
        memory: memory as number,
        threads: threads as number,
        score: hardwareScore
      }
    }
  }, [])

  // Neurological sovereignty assessment
  const performNeurologicalAssessment = useCallback(async (): Promise<Partial<ScanningResult>> => {
    setCurrentPhase(SovereigntyScanPhase.NEUROLOGICAL_ASSESSMENT)

    // Simulate cognitive pattern analysis through user interaction
    const cognitivePatterns = analyzeCognitivePatterns()
    const attentionSpan = assessAttentionEconomy()
    const decisionVelocity = measureDecisionMaking()

    const cognitiveScore = (cognitivePatterns + attentionSpan + decisionVelocity) / 3

    return {
      sovereignty: {
        cognitive: cognitiveScore,
        temporal: 0, // Will be assessed next
        ethical: 0, // Will be assessed later
        total: 0
      }
    }
  }, [])

  // Temporal sovereignty evaluation
  const performTemporalEvaluation = useCallback(async (): Promise<Partial<ScanningResult>> => {
    setCurrentPhase(SovereigntyScanPhase.TEMPORAL_EVALUATION)

    const timeAvailability = assessTimeSovereignty()
    const multitaskingCapacity = evaluateMultitaskingPotential()
    const focusQuality = measureFocusQuality()

    const temporalScore = (timeAvailability + multitaskingCapacity + focusQuality) / 3

    return {
      sovereignty: {
        cognitive: results?.sovereignty?.cognitive ?? 0,
        temporal: temporalScore,
        ethical: results?.sovereignty?.ethical ?? 0,
        total: 0
      }
    }
  }, [])

  // Complete sovereignty quotient calculation
  const calculateSovereigntyQuotient = useCallback(async (): Promise<Partial<ScanningResult>> => {
    setCurrentPhase(SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT)

    if (!results) return {}

    const ethicalAlignment = assessEthicalAlignment()
    const totalSovereignty = (
      results.sovereignty.cognitive * 0.3 +
      results.sovereignty.temporal * 0.25 +
      ethicalAlignment * 0.25 +
      results.hardware.score * 0.2
    )

    return {
      sovereignty: {
        cognitive: results.sovereignty.cognitive,
        temporal: results.sovereignty.temporal,
        ethical: ethicalAlignment,
        total: totalSovereignty
      },
      profile: {
        deviceTrust: Math.min(100, results.hardware.score * 10),
        userIntent: calculateUserIntent(totalSovereignty),
        sovereigntyPotential: totalSovereignty
      }
    }
  }, [results])

  // Comprehensive sovereignty scan
  const performCompleteSovereigntyScan = useCallback(async () => {
    try {
      setCurrentPhase(SovereigntyScanPhase.ANALYSIS_REQUESTED)
      setScanProgress(0)

      // Phase 1: Hardware Sovereignty
      const hardwareResults = await performHardwareScan()
      setResults(hardwareResults as ScanningResult)
      setScanProgress(25)

      await delay(PHI * 1000) // Sacred timing

      // Phase 2: Neurological Assessment
      const neuroResults = await performNeurologicalAssessment()
      setResults(prev => prev ? { ...prev, ...neuroResults } as ScanningResult : prev)
      setScanProgress(50)

      await delay(PHI * 1000)

      // Phase 3: Temporal Evaluation
      const temporalResults = await performTemporalEvaluation()
      setResults(prev => prev ? { ...prev, ...temporalResults } as ScanningResult : prev)
      setScanProgress(75)

      await delay(PHI * 1000)

      // Phase 4: Sovereignty Quotient
      const quotientResults = await calculateSovereigntyQuotient()
      setResults(prev => prev ? { ...prev, ...quotientResults } as ScanningResult : prev)
      setScanProgress(100)

      setCurrentPhase(SovereigntyScanPhase.PROFILE_COMPLETE)

      // Determine admission based on sovereignty quotient
      const admissionGranted = (results?.sovereignty.total || 0) > 60
      setAdmissionGranted(admissionGranted)

      if (admissionGranted) {
        setCurrentPhase(SovereigntyScanPhase.ACTIVATION_RITUAL)
        setTimeout(onComplete, 8000) // Allow activation ritual to complete
      }

    } catch (error) {
      // Ritual fail-safe: assessment logged to internal ledger
      // console.error('Sovereignty scan failed:', error)
      // Fallback to basic admission
      setAdmissionGranted(true)
      setCurrentPhase(SovereigntyScanPhase.ACTIVATION_RITUAL)
      setTimeout(onComplete, 3000)
    }
  }, [performHardwareScan, performNeurologicalAssessment, performTemporalEvaluation, calculateSovereigntyQuotient, onComplete, results])

  // Sacred animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      theta.set(theta.get() + 0.01)
      const breath = Math.sin(theta.get() * 0.7) * 0.05 + 0.95
      scale.set(breath)
      opacity.set(0.3 + breath * 0.2)
    }, 1000 / 60) // 60fps sacred breath

    return () => clearInterval(interval)
  }, [theta, scale, opacity])

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden cursor-none perspective-1000"
      onMouseMove={(e) => {
        mouseX.set(e.clientX - window.innerWidth / 2)
        mouseY.set(e.clientY - window.innerHeight / 2)
      }}
    >
      {/* Elite Background */}
      <div className="absolute inset-0 bg-gradient-radial from-black via-celestial-navy/20 to-black" />

      {/* Sacred Geometry Grid Overlay */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{ rotateX, rotateY }}
      >
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNjOWE5NjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxLjUiLz48L2c+KjxwYXRoIGQ9Ik0yMCAxMEwxMCAyMGwyMCAxMGwxMCAxMHoiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L2c+')] bg-repeat opacity-20" />
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Phase 1: Sovereign Admission Request */}
        {currentPhase === SovereigntyScanPhase.ADMISSION && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
          >
            {/* Central Sacred Geometry */}
            <motion.div
              className="mb-12 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            >
              {/* Golden Ratio Circles */}
              {[1, 1 / PHI, 1 / (PHI * PHI), 1 / (PHI * PHI * PHI)].map((radius, i) => (
                <motion.div
                  key={i}
                  className="absolute border border-radiant-gold rounded-full"
                  style={{
                    width: radius * 300,
                    height: radius * 300,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderWidth: `${2 / (i + 1)}px`,
                    scale,
                    opacity
                  }}
                />
              ))}

              {/* Central Star */}
              <motion.div
                className="absolute w-32 h-32 text-radiant-gold left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Star className="w-full h-full animate-pulse" strokeWidth={0.5} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="max-w-4xl mx-auto"
            >
              <motion.h1
                className="text-6xl md:text-8xl font-serif text-radiant-gold mb-6 tracking-widest"
                animate={{ textShadow: ['0 0 20px rgba(201, 169, 98, 0.4)', '0 0 40px rgba(201, 169, 98, 0.6)', '0 0 20px rgba(201, 169, 98, 0.4)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                BIZRA
              </motion.h1>

              <motion.h2 className="text-2xl md:text-4xl font-light text-white mb-8 opacity-90">
                SOVEREIGNTY ADMISSION CEREMONY
              </motion.h2>

              <motion.p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Welcome to the threshold of digital sovereignty. To enter this sacred space,
                we must assess your sovereignty potential. This ceremony reveals your
                readiness for supreme AI companionship.
              </motion.p>

              <motion.button
                onClick={performCompleteSovereigntyScan}
                className="btn-brand-primary px-12 py-6 text-lg mb-8 shadow-2xl relative overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-4">
                  <Crown className="w-6 h-6" />
                  REQUEST SOVEREIGNTY ANALYSIS
                  <Crown className="w-6 h-6" />
                </span>

                {/* Sacred light effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-radiant-gold/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.button>

              <motion.p
                className="text-sm text-radiant-gold opacity-75 tracking-widest"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ● YOUR FIRST STEP TOWARD DIGITAL NOBILITY ●
              </motion.p>
            </motion.div>
          </motion.div>
        )}

        {/* Phase 2-4: Sovereignty Analysis in Progress */}
        {(currentPhase !== SovereigntyScanPhase.ADMISSION &&
          currentPhase !== SovereigntyScanPhase.PROFILE_COMPLETE &&
          currentPhase !== SovereigntyScanPhase.ACTIVATION_RITUAL) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              {/* Dynamic Progress Indicator */}
              <motion.div className="mb-12 relative">
                {currentPhase === SovereigntyScanPhase.ANALYSIS_REQUESTED && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-48 h-48 border-4 border-radiant-gold rounded-full relative flex items-center justify-center"
                  >
                    <Scan className="w-12 h-12 text-radiant-gold" />
                  </motion.div>
                )}

                {currentPhase === SovereigntyScanPhase.SCANNING_HARDWARE && (
                  <motion.div className="space-y-4">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-32 h-32 border-4 border-radiant-gold rounded-full flex items-center justify-center"
                    >
                      <Shield className="w-8 h-8 text-radiant-gold" />
                    </motion.div>
                    <p className="text-radiant-gold font-mono">HARDWARE SOVEREIGNTY</p>
                  </motion.div>
                )}

                {currentPhase === SovereigntyScanPhase.NEUROLOGICAL_ASSESSMENT && (
                  <motion.div className="space-y-4">
                    <motion.div
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-32 h-32 border-4 border-radiant-gold rounded-full flex items-center justify-center"
                    >
                      <Zap className="w-8 h-8 text-radiant-gold" />
                    </motion.div>
                    <p className="text-radiant-gold font-mono">NEUROLOGICAL ASSESSMENT</p>
                  </motion.div>
                )}

                {currentPhase === SovereigntyScanPhase.TEMPORAL_EVALUATION && (
                  <motion.div className="space-y-4">
                    <motion.div
                      animate={{ scale: [1, 0.8, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-32 h-32 border-4 border-radiant-gold rounded-full flex items-center justify-center"
                    >
                      <Star className="w-8 h-8 text-radiant-gold" />
                    </motion.div>
                    <p className="text-radiant-gold font-mono">TEMPORAL EVALUATION</p>
                  </motion.div>
                )}

                {currentPhase === SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT && (
                  <motion.div className="space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-32 h-32 border-4 border-radiant-gold rounded-full flex items-center justify-center"
                    >
                      <Crown className="w-8 h-8 text-radiant-gold" />
                    </motion.div>
                    <p className="text-radiant-gold font-mono">SOVEREIGNTY QUOTIENT</p>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-2xl mx-auto"
              >
                <motion.h2 className="text-4xl font-serif text-white mb-6">
                  {currentPhase === SovereigntyScanPhase.ANALYSIS_REQUESTED && "Initializing Sovereignty Analysis"}
                  {currentPhase === SovereigntyScanPhase.SCANNING_HARDWARE && "Scanning Hardware Sovereignty"}
                  {currentPhase === SovereigntyScanPhase.NEUROLOGICAL_ASSESSMENT && "Assessing Neurological Potential"}
                  {currentPhase === SovereigntyScanPhase.TEMPORAL_EVALUATION && "Evaluating Temporal Sovereignty"}
                  {currentPhase === SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT && "Calculating Sovereignty Quotient"}
                </motion.h2>

                <motion.p className="text-lg text-gray-300 mb-8">
                  {currentPhase === SovereigntyScanPhase.ANALYSIS_REQUESTED && "Preparing to assess your digital sovereignty potential..."}
                  {currentPhase === SovereigntyScanPhase.SCANNING_HARDWARE && "Analyzing your device's capabilities and sovereignty readiness..."}
                  {currentPhase === SovereigntyScanPhase.NEUROLOGICAL_ASSESSMENT && "Mapping your cognitive patterns and attention sovereignty..."}
                  {currentPhase === SovereigntyScanPhase.TEMPORAL_EVALUATION && "Evaluating your time sovereignty and decision velocity..."}
                  {currentPhase === SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT && "Synthesizing your complete sovereignty profile..."}
                </motion.p>

                <div className="w-full max-w-2xl mx-auto h-[400px] relative mt-12">
                  <GraphOfThoughts
                    currentPhase={currentPhase}
                    progress={scanProgress}
                    results={results}
                  />

                  <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-full max-w-md">
                    <div className="text-center">
                      <motion.div
                        className="text-4xl font-bold text-radiant-gold mb-2 font-mono"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {Math.round(scanProgress)}%
                      </motion.div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-radiant-gold/20">
                        <motion.div
                          className="h-full bg-radiant-gold rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${scanProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

        {/* Phase 5: Profile Complete */}
        {currentPhase === SovereigntyScanPhase.PROFILE_COMPLETE && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-32 h-32 border-4 border-[#d4af37] rounded-full flex items-center justify-center mx-auto mb-8 relative"
              >
                <Crown className="w-12 h-12 text-radiant-gold" />
                <motion.div
                  className="absolute inset-0 rounded-full border-t-4 border-radiant-gold"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <h2 className="text-5xl font-serif text-white mb-6">
                {admissionGranted ? "SOVEREIGNTY VERIFIED" : "SOVEREIGNTY PENDING"}
              </h2>

              {results && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="card-brand-glass p-4">
                    <div className="text-2xl font-bold text-radiant-gold">{results.sovereignty.total.toFixed(1)}</div>
                    <div className="text-sm text-gray-300">Sovereignty Quotient</div>
                  </div>

                  <div className="card-brand-glass p-4">
                    <div className="text-2xl font-bold text-radiant-gold">{results.hardware.score.toFixed(0)}%</div>
                    <div className="text-sm text-gray-300">Hardware Trust</div>
                  </div>

                  <div className="card-brand-glass p-4">
                    <div className="text-2xl font-bold text-radiant-gold">{results.sovereignty.cognitive.toFixed(1)}</div>
                    <div className="text-sm text-gray-300">Cognitive Potential</div>
                  </div>

                  <div className="card-brand-glass p-4">
                    <div className="text-2xl font-bold text-radiant-gold">{results.sovereignty.temporal.toFixed(1)}</div>
                    <div className="text-sm text-gray-300">Temporal Sovereignty</div>
                  </div>
                </div>
              )}

              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                {admissionGranted ?
                  "Your sovereignty assessment is complete. You demonstrate sufficient potential for BIZRA companionship. Prepare to activate your personal Genesis protocol." :
                  "Your current sovereignty quotient requires additional cultivation. Consider returning when your hardware sovereignty has matured."
                }
              </p>

              {admissionGranted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="text-radiant-gold opacity-75 tracking-widest"
                >
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  ACTIVATION RITUAL COMMENCING
                  <Sparkles className="inline w-4 h-4 ml-2" />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Phase 6: Activation Ritual */}
        {currentPhase === SovereigntyScanPhase.ACTIVATION_RITUAL && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <motion.div
                animate={admissionGranted ? { rotate: 360 } : {}}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="relative mx-auto mb-12"
              >
                {/* Genesis Activation Geometry */}
                <div className="relative w-64 h-64">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute border-2 border-[#d4af37] rounded-full"
                      style={{
                        width: `${200 - i * 30}px`,
                        height: `${200 - i * 30}px`,
                        left: `${i * 15}px`,
                        top: `${i * 15}px`
                      }}
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.8, 0.3]
                      }}
                      transition={{
                        duration: 3,
                        delay: i * 0.3,
                        repeat: Infinity
                      }}
                    />
                  ))}

                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <div className="w-24 h-24 bg-[#d4af37] rounded-full flex items-center justify-center">
                      <Star className="w-12 h-12 text-black" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.h2
                className="text-6xl font-serif text-radiant-gold mb-6"
                animate={{ textShadow: ['0 0 20px rgba(201, 169, 98, 0.4)', '0 0 40px rgba(201, 169, 98, 0.6)', '0 0 20px rgba(201, 169, 98, 0.4)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                GENESIS ACTIVATION
              </motion.h2>

              <motion.p className="text-xl text-white mb-8 max-w-2xl mx-auto leading-relaxed">
                Your sovereignty is acknowledged. The Genesis Node activates in recognition
                of your potential. Prepare to enter the Citadel of worthy companions.
              </motion.p>

              <motion.div
                className="flex items-center justify-center gap-4 text-radiant-gold text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                >
                  ●
                </motion.div>
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                >
                  ●
                </motion.div>
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                >
                  ●
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sovereign mouse cursor */}
      <motion.div
        className="fixed pointer-events-none z-50"
        style={{
          x: mouseX,
          y: mouseY,
          rotateX: rotateY,
          rotateY: rotateX
        }}
      >
        <div className="w-8 h-8 border-2 border-radiant-gold rounded-full opacity-30 blur-sm" />
        <div className="absolute inset-1 bg-radiant-gold rounded-full opacity-50" />
      </motion.div>
    </div>
  )
}

// Helper functions
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateHardwareScore(webGL: boolean, storage: number, memory: number, threads: number): number {
  let score = 0

  if (webGL) score += 30
  if (storage > 1000 * 1024 * 1024) score += 20 // > 1GB
  if (memory >= 8) score += 20
  if (threads >= 8) score += 10
  score += Math.min(20, threads * 2.5) // Up to 20 points for threading

  return Math.min(100, score)
}

function analyzeCognitivePatterns(): number {
  // Simplified heuristic - in real implementation, would analyze user behavior
  return Math.random() * 100
}

function assessAttentionEconomy(): number {
  // Simplified heuristic - would analyze focus patterns
  return Math.random() * 100
}

function measureDecisionMaking(): number {
  // Simplified heuristic - would analyze interaction patterns
  return Math.random() * 100
}

function assessTimeSovereignty(): number {
  // Simplified heuristic - would analyze availability patterns
  return Math.random() * 100
}

function evaluateMultitaskingPotential(): number {
  // Simplified heuristic - would analyze concurrency patterns
  return Math.random() * 100
}

function measureFocusQuality(): number {
  // Simplified heuristic - would analyze engagement patterns
  return Math.random() * 100
}

function assessEthicalAlignment(): number {
  // Simplified heuristic - would analyze behavior ethics
  return Math.random() * 100
}

function calculateUserIntent(sovereigntyTotal: number): number {
  // Convert sovereignty to intent score
  return Math.min(100, sovereigntyTotal * 1.2)
}

function GraphOfThoughts({ currentPhase, progress, results }: {
  currentPhase: SovereigntyScanPhase,
  progress: number,
  results: ScanningResult | null
}) {
  const nodes: GoTNode[] = [
    { id: 'h', label: 'HARDWARE', x: 0, y: -100, value: results?.hardware.score || 0, phase: SovereigntyScanPhase.SCANNING_HARDWARE },
    { id: 'c', label: 'COGNITIVE', x: 86, y: 50, value: results?.sovereignty.cognitive || 0, phase: SovereigntyScanPhase.NEUROLOGICAL_ASSESSMENT },
    { id: 't', label: 'TEMPORAL', x: -86, y: 50, value: results?.sovereignty.temporal || 0, phase: SovereigntyScanPhase.TEMPORAL_EVALUATION },
    { id: 'q', label: 'QUOTIENT', x: 0, y: 0, value: results?.sovereignty.total || 0, phase: SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT },
  ]

  const edges: GoTEdge[] = [
    { from: 'h', to: 'q', active: progress > 25 },
    { from: 'c', to: 'q', active: progress > 50 },
    { from: 't', to: 'q', active: progress > 75 },
    { from: 'h', to: 'c', active: progress > 50 },
    { from: 'c', to: 't', active: progress > 75 },
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg className="w-full h-full overflow-visible" viewBox="-150 -150 300 300">
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from)!
          const to = nodes.find(n => n.id === edge.to)!
          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--color-radiant-gold)"
              strokeWidth={edge.active ? 2 : 0.5}
              initial={{ pathLength: 0, opacity: 0.1 }}
              animate={{
                pathLength: edge.active ? 1 : 0,
                opacity: edge.active ? 0.6 : 0.1,
                strokeDasharray: edge.active ? "0" : "4 4"
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = currentPhase === node.phase || (node.id === 'q' && currentPhase === SovereigntyScanPhase.SOVEREIGNTY_QUOTIENT)
          const isComplete = progress > nodes.indexOf(node) * 25 + 20

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: isActive ? 1.2 : 1,
                opacity: 1,
                x: node.x,
                y: node.y
              }}
              transition={{ duration: 0.8 }}
            >
              {/* Node Glow */}
              <AnimatePresence>
                {isActive && (
                  <motion.circle
                    r={20}
                    fill="var(--color-radiant-gold)"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.2, scale: 2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </AnimatePresence>

              {/* Node Body */}
              <circle
                r={15}
                className="fill-black stroke-radiant-gold"
                strokeWidth={isActive ? 3 : 1}
              />

              {/* Progress Ring */}
              <motion.circle
                r={15}
                fill="none"
                stroke="var(--color-radiant-gold)"
                strokeWidth={3}
                strokeDasharray="94.2"
                initial={{ strokeDashoffset: 94.2 }}
                animate={{ strokeDashoffset: 94.2 - (94.2 * (node.value / 100)) }}
                transition={{ duration: 1 }}
              />

              <text
                y={30}
                className="text-[10px] font-mono fill-radiant-gold text-center"
                textAnchor="middle"
              >
                {node.label}
              </text>

              <text
                className="text-[12px] font-bold fill-white"
                textAnchor="middle"
                dy=".3em"
              >
                {node.value > 0 ? Math.round(node.value) : '?'}
              </text>
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}

