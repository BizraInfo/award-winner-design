# BIZRA Lean Core Cleanup

Purpose: strip unused ports/nodes (libraries and component bundles) to keep the Genesis UI small, loadable, and focused on the 3D/lifecycle experience.

## Removed
- Shadcn/Radix UI bundle and generated components (`components/ui`, `components/theme-provider.tsx`, `components/error-boundary.tsx`, duplicate `hooks/use-toast.ts`) — nothing in the lifecycle/showcase paths referenced them.
- Mobile stack: `expo*`, `react-native` — no React Native or Expo usage in the codebase.
- Extra client libs: analytics/theme (`@vercel/analytics`, `next-themes`), form/validation (`react-hook-form`, `@hookform/resolvers`, `zod`), chart/carousel/OTP/resizable/toast helpers (`recharts`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `cmdk`, `input-otp`, `sonner`, `vaul`), misc (`class-variance-authority`, `@emotion/is-prop-valid`, `immer`, `date-fns`, `use-sync-external-store`, `@react-three/drei`).
- Package lock regenerated after removals; lint passes with only the existing warnings in `citadel-optimized.tsx` and `sovereignty-admission.tsx`.

## Lean core that remains
- Rendering/3D: `three`, `@react-three/fiber`, `@react-three/postprocessing`.
- UI/animation: `framer-motion`, `lucide-react`, `tailwindcss` + `tailwind-merge`, `tailwindcss-animate`.
- State: `zustand`.
- Next/React runtime: `next@16`, `react@19`.

## Notes
- If you need shadcn-style primitives again, you can regenerate them later (e.g., `npx shadcn@latest add button`) and recreate `components/ui`.
- With the mobile/analytics/form stacks gone, installs and builds should be noticeably faster and the dependency surface is easier to audit.
