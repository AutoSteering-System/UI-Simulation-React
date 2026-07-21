# UI Update README (Tablet-First + Production Coverage)

This document defines a practical implementation plan to update the Auto Steering UI for tablet devices.

## 1) Goal

Build a tablet-first UI that is readable, touch-friendly, and stable in operation.

Current assumption:
- Primary target is tablet landscape mode.
- Desktop can still run, but tablet UX is the priority.

## 2) Target Devices

Primary target:
- Width: 1024-1366 px
- Height: 768-1024 px
- Orientation: landscape-first

Secondary support:
- Width: 820-1023 px (compact tablet)
- Desktop >= 1367 px

Out of scope for this update:
- Mobile phone layout redesign

## 3) UI Problems To Fix

1. Overuse of fixed pixel sizing causes compressed layout on smaller tablet widths.
2. Important text is too small in many status areas.
3. Too many floating overlays at once increase cognitive load during run mode.
4. Icon-only controls are not consistently accessible.
5. One large screen file reduces maintainability and slows iteration.

## 4) Design Rules For This Update

1. Tablet-first breakpoints
- Use explicit breakpoints based on tablet widths.
- Avoid hard-locked ratio behavior for core interaction areas.

2. Touch-first interaction
- Minimum hit target: 44 x 44 px.
- Keep high-frequency controls in fixed, predictable zones.

3. Readability first
- No critical text below 12 px.
- Main run metrics should be 14-18 px.

4. Information hierarchy
- Always visible: guidance error, speed, steer mode, RTK/sat status.
- Secondary information should be collapsible or context-triggered.

5. Accessibility baseline
- All icon-only buttons require aria-label.
- Visible keyboard focus state for interactive controls.

## 5) Breakpoint and Layout Spec

Recommended Tailwind breakpoints for this project:
- tablet-sm: 820 px
- tablet: 1024 px
- tablet-lg: 1280 px

Implementation note:
- If custom screens are not configured yet, use existing Tailwind classes first (`md`, `lg`, `xl`), then migrate to custom screens if needed.

Layout behavior:
- Left rail width should be clamped (not tiny, not oversized).
- Header should switch from rigid 3-column fixed widths to adaptive minmax/flex.
- Bottom control bar should allow wrapping or two-row mode on compact tablet.
- Overlay stack in run mode should be reduced to one primary + one secondary panel.

## 6) File-Level Implementation Plan

### A) src/app.jsx

1. Extract screen sections into local components in this order:
- `RunHeader`
- `RunBottomBar`
- `MapOverlayStack`
- `LeftRail`

2. Replace key fixed values with responsive classes:
- Header: remove rigid grid widths that lock content.
- Bottom bar: support compact tablet by switching to 2 rows when width is constrained.
- Mission cards and status strip: reduce simultaneous visible cards in compact mode.

3. Typography cleanup:
- Replace repeated `text-[8px]`, `text-[9px]`, `text-[10px]` in critical labels with `text-xs` or larger.
- Keep micro labels only for non-critical decorative text.

4. Accessibility pass:
- Add `aria-label` for icon-only buttons.
- Ensure all actionable controls have clear role and focus style.

### B) src/components/ui.jsx

1. Normalize shared button primitives:
- Define size variants: `compact`, `default`, `large`.
- Enforce min touch size.

2. Normalize font scale in shared controls:
- Labels: minimum `text-xs`.
- Value text: `text-sm` and above for runtime metrics.

### C) src/components/TractorVehicle.jsx

1. Keep visual output unchanged first.
2. Ensure render container scales safely in tablet compact mode.
3. Prevent clipping when map overlay density changes.

## 7) Suggested Implementation Phases

Phase 1: Stability and readability (must do first)
- Increase critical text sizes.
- Fix hit targets.
- Add missing aria-labels.
- Reduce overlay clutter in run mode.

Phase 2: Responsive structure
- Header and bottom bar adaptive behavior.
- Compact tablet layout rules.
- Left rail width clamp and spacing adjustments.

Phase 3: Maintainability
- Split monolithic screen sections into smaller components.
- Move repeated style patterns into shared primitives.

## 8) Acceptance Criteria

Tablet usability checks (required):
1. On 1024 x 768 landscape, no critical overlap in run mode.
2. Guidance error, speed, and RTK are readable at arm-length.
3. Primary controls are operable with touch (no precision tapping needed).
4. No icon-only control without accessible label.
5. Switching Run/Field/Lines/System remains smooth without visual jumps.

Regression checks:
1. Desktop layout still usable.
2. Existing run simulation interactions still work (steer, speed, line workflow).

## 9) QA Checklist (Manual)

1. Test widths: 820, 1024, 1180, 1280, 1366.
2. Verify orientation change handling on tablet.
3. Verify overlay order and z-index in run mode.
4. Verify all main controls with keyboard focus and Enter/Space activation.
5. Verify light and dark theme readability.

## 10) Dev Notes

Current project runs with CDN Tailwind + in-browser Babel.
For production readiness (separate task):
- Move to build pipeline (Tailwind CLI/PostCSS + precompiled React).
- Keep this UI update scoped to behavior and structure first.

## 11) Quick Start Task List

1. Add missing aria-labels for icon-only controls.
2. Raise critical text sizes in run header, lightbar, bottom metrics.
3. Refactor header and bottom bar to adaptive layout.
4. Introduce compact-tablet mode (<= 1024 width).
5. Reduce run overlays visible by default.
6. Extract 3-4 sections from `src/app.jsx` into local components.
7. Run manual QA checklist on target tablet resolutions.

## 12) Functional Coverage (What Is Still Missing)

This section is the implementation backlog to make the UI feel complete for real auto-steering operations.

### P0 - Must Have For Real Field Use

1. Safety and control state machine
- States: `MANUAL`, `READY`, `ENGAGED`, `PAUSED`, `FAULT`.
- Every state must show reason text (example: `RTK lost`, `Speed too low`, `Operator override`).
- Add explicit `re-engage conditions` shown to operator.

2. GNSS / RTK quality panel
- Show: fix type, correction age, latency, satellite count, HDOP/PDOP, base source.
- Add quality color rules with thresholds (green, yellow, red).
- Add stale-data warning if telemetry not updated in configured timeout.

3. Alarm and event strip on Run screen
- Severity levels: Critical, Warning, Info.
- Critical alarm must pin to top of Run screen and require acknowledge.
- Keep event history list with timestamp.

4. Manual override and recovery
- Detect steering wheel/manual input override.
- Auto disengage when override happens.
- Show one-tap safe recovery actions.

5. Main run metrics required at all times
- Cross-track error (XTE).
- Heading error.
- Speed and target speed.
- Steering mode/state.
- RTK quality summary.
- Active line and pass.
- Coverage done and remaining.

### P1 - Strongly Recommended

1. Headland flow and turn flow
- Define headland entry, in-turn, and exit states.
- Show turn guidance progress and fail reasons.

2. Implement intelligence surface
- Section state visibility (on/off per section).
- Overlap and skip indicators.
- Rate control status by zone.

3. Task productivity surface
- ETA, remaining area, work rate.
- Session statistics summary card.

4. Diagnostics dashboard improvements
- Sensor heartbeat cards.
- Bus/communication status.
- Last fault and active fault sections.

### P2 - Enterprise / Fleet Features

1. Data export packages
- Shift summary, event logs, guidance traces, coverage map snapshots.

2. Operator and machine profile switching
- Fast profile switch with audit trail.

3. Fleet sync status surface
- Last sync time, pending uploads, sync errors.

## 13) Run Screen Information Contract

The Run screen must be split into three priority zones.

### Zone A - Safety (always visible)

1. Steering state and reason.
2. RTK quality summary.
3. Active critical alarm.

### Zone B - Guidance (always visible)

1. XTE and heading error.
2. Active line and pass.
3. Speed, target speed, steering command.

### Zone C - Productivity (collapsible allowed)

1. Coverage done and remaining.
2. Implement section/rate summary.
3. Task ETA and work rate.

Rule:
- Only Zone C may collapse on compact tablets.
- Zones A and B must stay readable at all times.

## 14) Screen-Level Deliverables

### Run

1. Safety strip (top): steering state, RTK, alarms.
2. Guidance strip (center): XTE, heading, active line/pass.
3. Control shelf (bottom): speed, engage/disengage, turn actions, quick nudge.
4. Overlay manager: only one secondary panel open at once.

### Field

1. Field list with clear status badges: loaded, active task, last used.
2. Boundary lifecycle states: recording, preview, saved, invalid.
3. Visual validation for open vs closed boundary.

### Lines

1. Line catalog with type and quality metadata.
2. Active line state and lock indicator.
3. Fast actions: load, rename, duplicate, archive.

### System

1. Sensor and communication health summary.
2. GNSS source config and quality thresholds.
3. Feature toggles grouped by subsystem.
4. Data transfer and backup status.

## 15) UI State Model To Implement

Add one shared UI contract object in app state:

1. `systemHealth`
- `gnss`, `imu`, `steering`, `canbus`, `obd`, `camera`.

2. `runStatus`
- `steeringState`, `steeringReason`, `overrideDetected`, `engageAllowed`.

3. `rtkTelemetry`
- `fixType`, `ageSec`, `latencyMs`, `hdop`, `pdop`, `baseSource`, `lastUpdateTs`.

4. `runKpi`
- `xteCm`, `headingErrDeg`, `speedKmh`, `targetSpeedKmh`, `areaDoneHa`, `areaRemainingHa`, `etaMin`.

5. `alarms`
- array with `id`, `severity`, `message`, `timestamp`, `acked`.

## 16) Definition Of Done (Per Feature)

A feature is done only when all conditions are met:

1. UI state is visible in correct zone.
2. State has loading, normal, degraded, and fault visuals.
3. Critical transitions create event logs.
4. Compact tablet layout still readable.
5. Manual QA checklist passes.

## 17) Implementation Order (Suggested Sprints)

Sprint 1
1. Run safety strip + steering state machine visuals.
2. RTK quality block with thresholds.
3. Alarm strip and event list panel.

Sprint 2
1. Guidance strip redesign (XTE + heading + line/pass).
2. Control shelf simplification for touch operation.
3. Compact tablet responsive behavior.

Sprint 3
1. Field and Lines lifecycle polish.
2. System diagnostics and quality pages.
3. Data export summary panel.

## 18) QA Test Matrix (Functional)

Run these scenarios before release:

1. RTK loss while engaged -> must disengage safely and show reason.
2. Manual steering override while engaged -> immediate safe state and clear recovery path.
3. Boundary recording incomplete closure -> warning and controlled choices.
4. Active task with line switch -> KPI and status remain coherent.
5. Compact tablet width with one overlay open -> no overlap on safety/guidance zones.

## 19) Backlog Template For Your Team

Use this format for each ticket:

1. Context
2. UI change
3. Data inputs and outputs
4. Alarm/edge-case behavior
5. Acceptance criteria
6. QA steps

## 20) Immediate Next 10 Tasks

1. Add steering state machine UI block on Run header.
2. Add `rtkTelemetry` object and render full RTK quality card.
3. Add critical alarm strip with ack action.
4. Move productivity widgets into collapsible zone on compact tablet.
5. Add heading error next to XTE in guidance lightbar.
6. Add active line pass index display.
7. Add override detection banner and one-tap recover action.
8. Add event history drawer in Run mode.
9. Normalize all critical labels to >= 12 px.
10. Validate all P0 scenarios with QA matrix above.
