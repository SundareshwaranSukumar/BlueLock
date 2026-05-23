# BlueLock — Execution Plan

A single-page TanStack Start app with 5 views driven by a global view manager, a shared reactive store for crowd/gate state, and a Neon Egoist design system.

## 1. Tech & Folder Architecture

```
src/
  routes/
    index.tsx                  # mounts <AppShell/> + view router
  components/
    ui/                        # shadcn primitives (existing)
    shell/
      AppShell.tsx             # background grid, fonts, view switch
      ViewManager.tsx          # activeView 1..5, transitions
    branding/
      HexFrame.tsx             # reusable clip-path hex container
      HexPulseLogo.tsx
    landing/        EgoistGate.tsx
    ticketing/      SeatMapper.tsx, DispersalBlueprint.tsx, TicketCTA.tsx
    stadium/        IsoStadium.tsx, Jumbotron.tsx, CompanionNode.tsx
    stats/          PointsTable.tsx, PlayerOverlay.tsx, RadarChart.tsx
    admin/          DirectorHUD.tsx, GateTelemetryGrid.tsx, DirectorRadio.tsx
  state/
    useStadiumStore.ts         # zustand: gates, tickets, agentReactionText, directives
    selectors.ts
  domain/
    types.ts                   # Gate, Seat, UserTicket, Directive, Player
    fixtures.ts                # seed teams, fixtures, players, seat matrix
  hooks/
    useTicker.ts, useGateLoadSim.ts, usePrefersReducedMotion.ts
  styles.css                   # design tokens + hex utilities
```

SOLID application:

- SRP: each component is render-only; data lives in `useStadiumStore` + selectors.
- OCP: components take config objects (e.g. `GateTelemetryGrid` consumes `Gate[]`).
- ISP: small typed prop contracts in `domain/types.ts`; no god props.
- DIP: simulation hooks (`useGateLoadSim`) inject pure updaters into the store.

Performance:

- `will-change-transform`, `translate-z-0`, `transform-gpu` on jumbotron ticker, isometric layers.
- `React.memo` + zustand selector subscriptions to avoid cascade renders.
- Animations via CSS keyframes; `prefers-reduced-motion` respected.

## 2. Design System (in `src/styles.css`)

Tokens (oklch equivalents of the brief):

- `--background` → `#040914`, `--foreground` → `#F8FAFC`
- `--surface-glass` `rgba(10,20,42,0.5)`, `--border-glass` `rgba(0,240,255,0.1)`
- `--accent-cyan` `#00F0FF`, `--ok` `#1E8E3E`, `--warn` `#FBBC05`, `--crit` `#D93025`
- Fonts: Space Grotesk (display), Orbitron (numerics/HUD), Inter (tables)
- Utilities: `.hex-clip`, `.hex-frame` (border via mask), `.glow-cyan`, `.scanline`, `.ticker`

All component colors come from tokens; no raw hex in JSX.

## 3. View Manager

`activeView: 1|2|3|4|5` held in zustand. Cross-screen mutations (admin → fan) flow through the same store so a Director directive on Screen 5 retargets the `UserTicket.assignedGate` shown on Screen 2.

## 4. Screen Build Order

1. **Foundation**: tokens, fonts, `HexFrame`, `AppShell`, `ViewManager`, fixtures, store.
2. **Screen 1 — Egoist Gate**: hero, pulsing hex logo, two hex CTAs → set view 2 or 5.
3. **Screen 2 — Ticketing**: seat matrix (cyan/slate states), seat-click writes `UserTicket`, dispersal blueprint card with entry corridor, gates, metro load.
4. **Screen 3 — Iso Stadium**: SVG isometric sectors, gate halos reading `gates[*].load`, jumbotron scoreboard + marquee reading `agentReactionText`, two companion avatars (CSK yellow / MI cobalt) with speech bubbles.
5. **Screen 4 — Stats Hub**: tabs (Points / Schedule / Players), sortable table, 90%-width player overlay with phase matrix + SVG radar.
6. **Screen 5 — Director Matrix**: HUD strip (intake, scans, live count), gate grid with >80% red pulse, Director Radio terminal. "Issue Direct Bypass Order" dispatches a `Directive` that (a) prints to the terminal and (b) rewrites affected `UserTicket.assignedGate` / corridor in store → Screen 2 self-heals.

## 5. Simulation Layer

`useGateLoadSim` ticks gate loads with bounded random walks; Director directives clamp/redirect loads and append to `directives[]`. Companion bubbles and `agentReactionText` derive from match state + directive feed via selectors — deterministic, no extra fetches.

## 6. Responsiveness

- Desktop ≥1280: multi-column HUDs, full isometric.
- Tablet: stack HUD strip, keep iso canvas at 100% width.
- Mobile: bottom nav for view switch, seat matrix scrolls horizontally, jumbotron collapses to compact scoreboard.

## 7. Out of Scope (flagging up front)

- No real backend / auth / payments. All data is in-memory fixtures + simulation.
- "AR" is stylistic isometric SVG, not WebXR/Three.js.
- No real Namma Metro feed; load is simulated.

Ready to switch to build mode and start with the foundation + Screen 1.
