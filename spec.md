# My Digital Board 2.0

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full port of the provided HTML/React single-file app into a Caffeine React + Motoko project
- Two boards toggled via a top-bar dropdown:
  1. **Amazon Workplace: Demorians Department** (Staffing Board) — drag-and-drop employee cards across columns and sections
  2. **Southern New Hampshire University (SNHU)** — drag-and-drop course cards across columns and sections
- Top bar with: board selector dropdown (left), centered title + live clock + today's date (center), Lock/Unlock button (right)
- "Last Updated" timestamp displayed in the top bar
- Lock/Unlock board state persisted to localStorage (per user)
- Full board state (card positions) persisted to localStorage (per user key `migudavc`)
- Toast notifications for locked state and board actions
- Unlock confirmation modal

**Staffing Board columns & sections:**
- Process Guide: Stow, Pick
- In Path Function: Downstacker, Stower, Picker, Transporter (Stow or Pick), QXY2 Problem Solve, ICQA IOL
- LaborShare: XLX7 Inbound Problem Solve, XLX7 Outbound Problem Solve, XLX7 WaterSpider
- Not Assigned (flat drop zone)

**SNHU Board columns & sections:**
- Current Term: Assignments Pending, In Progress Assignments
- Upcoming Term (flat drop zone)
- Not Assigned (flat drop zone)

**Default data:**
- Staffing: one card for Miguel A Davalos (login: migudavc, shift: DB3T0700, Back Half Days) in Not Assigned
- SNHU: 4 canonical course cards (ENG 190, IDS 105, ECO 202, PHL 260) in Not Assigned

**Migration logic:**
- Old Problem Solve column section keys map to new In Path Function / LaborShare keys
- Old LaborShare section keys map to renamed keys
- Old SNHU `up_pending`/`up_progress` map to `up_term`
- SNHU cards are normalized/merged against canonical list on load

**Card add feature:** The staffing board needs an "Add Associate" button/form (unlocked state) to add new employee cards with: personName, login, shiftCoHost, shiftPattern fields.

### Modify
- None (new project)

### Remove
- None (new project)

## Implementation Plan
1. Backend: store board state (staffing cards + university cards) per user in Motoko stable storage, expose get/set calls
2. Frontend: implement App, StaffingBoard, SnhuBoard components matching the provided design exactly — dark navy theme, glassmorphism cards, drag-and-drop, lock/unlock, toast, unlock modal, live clock
3. Wire backend persistence (replace localStorage with canister calls) while keeping localStorage as fallback for initial load speed
4. Implement add-associate modal for staffing board
5. Validate, build, deploy
