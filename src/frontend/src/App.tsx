import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { GripVertical, Loader2, Lock, Plus, Unlock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "./hooks/useActor";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalStaffingCard {
  id: string;
  personName: string;
  login: string;
  shiftCoHost: string;
  shiftPattern: string;
  col: string;
  createdBy: string;
  createdAt: string;
}

interface LocalUniversityCard {
  id: string;
  title: string;
  term: string;
  col: string;
  createdBy: string;
  createdAt: string;
}

interface ColSection {
  key: string;
  title: string;
}

interface ColConfig {
  key: string;
  title: string;
  sections: ColSection[] | null;
  dropKey?: string;
}

// ─── Board Config ─────────────────────────────────────────────────────────────

const STAFFING_COLS: ColConfig[] = [
  {
    key: "pg",
    title: "Process Guide",
    sections: [
      { key: "pg_stow", title: "Stow" },
      { key: "pg_pick", title: "Pick" },
    ],
  },
  {
    key: "ipf",
    title: "In Path Function",
    sections: [
      { key: "ipf_down", title: "Downstacker" },
      { key: "ipf_stow", title: "Stower" },
      { key: "ipf_pick", title: "Picker" },
      { key: "ipf_trans", title: "Transporter (Stow or Pick)" },
      { key: "ipf_qxy2_ps", title: "QXY2 Problem Solve" },
      { key: "ipf_icqa_iol", title: "ICQA IOL" },
    ],
  },
  {
    key: "ls",
    title: "LaborShare",
    sections: [
      { key: "ls_in_ps", title: "XLX7 Inbound Problem Solve" },
      { key: "ls_out_ps", title: "XLX7 Outbound Problem Solve" },
      { key: "ls_ws", title: "XLX7 WaterSpider" },
    ],
  },
  { key: "na", title: "Not Assigned", sections: null, dropKey: "staff_na" },
];

const SNHU_COLS: ColConfig[] = [
  {
    key: "cur",
    title: "Current Term",
    sections: [
      { key: "cur_pending", title: "Assignments Pending" },
      { key: "cur_progress", title: "In Progress Assignments" },
    ],
  },
  { key: "up", title: "Upcoming Term", sections: null, dropKey: "up_term" },
  { key: "na", title: "Not Assigned", sections: null, dropKey: "snhu_na" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () =>
  `${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

const encodeId = (id: string): Uint8Array => new TextEncoder().encode(id);
const decodeId = (id: Uint8Array): string => new TextDecoder().decode(id);

const nowStamp = () => new Date().toLocaleString();

const todayStr = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const liveClockStr = () =>
  new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

// ─── Migration ────────────────────────────────────────────────────────────────

function migrateStaffingCol(oldCol: string): string {
  const validKeys = new Set([
    "pg_stow",
    "pg_pick",
    "ipf_down",
    "ipf_stow",
    "ipf_pick",
    "ipf_trans",
    "ipf_qxy2_ps",
    "ipf_icqa_iol",
    "ls_in_ps",
    "ls_out_ps",
    "ls_ws",
    "staff_na",
  ]);
  if (validKeys.has(oldCol)) return oldCol;
  if (oldCol === "ps_qxy2") return "ipf_qxy2_ps";
  if (oldCol === "ps_iol") return "ipf_icqa_iol";
  if (oldCol === "ps_xlx7") return "ls_in_ps";
  if (oldCol === "ls_in") return "ls_in_ps";
  if (oldCol === "ls_out") return "ls_out_ps";
  return "staff_na";
}

function migrateSnhuCol(oldCol: string): string {
  const valid = new Set(["cur_pending", "cur_progress", "up_term", "snhu_na"]);
  if (valid.has(oldCol)) return oldCol;
  if (oldCol === "up_pending" || oldCol === "up_progress") return "up_term";
  return "snhu_na";
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const LOGIN_NAME = "migudavc";

function miguelCard(): LocalStaffingCard {
  return {
    id: `miguel-${uid()}`,
    personName: "Miguel A Davalos",
    login: "migudavc",
    shiftCoHost: "DB3T0700",
    shiftPattern: "Back Half Days",
    col: "staff_na",
    createdBy: "migudavc",
    createdAt: new Date().toISOString(),
  };
}

function snhuCanonicalCards(): LocalUniversityCard[] {
  const now = new Date().toISOString();
  return [
    {
      id: "snhu-eng190",
      title: "ENG 190: Research and Persuasion",
      term: "C-2 Term - March thru April 2026",
      col: "snhu_na",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-ids105",
      title: "IDS 105: Awareness and Online Learning",
      term: "C-2 Term - March thru April 2026",
      col: "snhu_na",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-eco202",
      title: "ECO 202: Macroeconomics",
      term: "C-3 Term - May thru June 2026",
      col: "snhu_na",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-phl260",
      title: "PHL 260: Ethical Decision-Making & Problem-Solving",
      term: "C-3 Term - May thru June 2026",
      col: "snhu_na",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
  ];
}

function normalizeSnhuCards(
  cards: LocalUniversityCard[],
): LocalUniversityCard[] {
  const canonical = snhuCanonicalCards();
  const canonById = new Map(canonical.map((c) => [c.id, c]));

  const existingById = new Map<string, LocalUniversityCard>();
  for (const c of cards) if (c?.id) existingById.set(c.id, c);

  const result: LocalUniversityCard[] = [];

  for (const canon of canonical) {
    const existing = existingById.get(canon.id);
    result.push({ ...canon, col: existing?.col ?? "snhu_na" });
  }

  for (const c of cards) {
    if (!c) continue;
    if (canonById.has(c.id)) continue;
    result.push(c);
  }

  return result;
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  activeBoard: "amazon" | "snhu";
  onBoardChange: (b: "amazon" | "snhu") => void;
  lastUpdated: string;
  isLocked: boolean;
  onLock: () => void;
  onRequestUnlock: () => void;
}

function TopBar({
  activeBoard,
  onBoardChange,
  lastUpdated,
  isLocked,
  onLock,
  onRequestUnlock,
}: TopBarProps) {
  const [liveTime, setLiveTime] = useState(liveClockStr);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(liveClockStr()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header
      className="glass-panel rounded-2xl shadow-panel"
      style={{ padding: "14px 16px" }}
    >
      <div
        className="topbar-grid grid items-center gap-3"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        {/* Left: board selector + meta */}
        <div className="flex flex-col gap-2 items-start min-w-0">
          <select
            value={activeBoard}
            onChange={(e) => onBoardChange(e.target.value as "amazon" | "snhu")}
            className="w-full max-w-[360px] rounded-xl text-sm outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.92)",
              padding: "10px 12px",
            }}
          >
            <option value="amazon">
              Amazon Workplace: Demorians Department
            </option>
            <option value="snhu">
              Southern New Hampshire University (SNHU)
            </option>
          </select>

          <div
            className="flex flex-wrap items-center gap-3"
            style={{ fontSize: 12, color: "var(--text-muted)" }}
          >
            <span>
              <strong>Last Updated:</strong> {lastUpdated}
            </span>
          </div>
        </div>

        {/* Center: title + date/clock */}
        <div className="flex flex-col items-center justify-center gap-1.5 text-center">
          <h1
            className="font-display font-extrabold m-0 tracking-tight"
            style={{ fontSize: 18, color: "var(--text-primary)" }}
          >
            My Digital Board 2.0
          </h1>
          <div
            className="flex items-center gap-2 whitespace-nowrap"
            style={{ fontSize: 14, opacity: 0.86 }}
          >
            {todayStr()}
            <span style={{ opacity: 0.55 }}>•</span>
            {liveTime}
          </div>
        </div>

        {/* Right: lock/unlock */}
        <div className="flex flex-col items-end gap-2">
          {isLocked ? (
            <button
              type="button"
              onClick={onRequestUnlock}
              className="flex items-center gap-1.5 text-xs rounded-xl transition-colors"
              style={{
                background: "var(--btn-unlock)",
                border: "1px solid var(--btn-unlock-border)",
                color: "rgba(255,120,120,0.9)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              <Lock size={13} />
              Unlock
            </button>
          ) : (
            <button
              type="button"
              onClick={onLock}
              className="flex items-center gap-1.5 text-xs rounded-xl transition-colors"
              style={{
                background: "var(--btn-lock)",
                border: "1px solid var(--btn-lock-border)",
                color: "rgba(255,200,60,0.9)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              <Unlock size={13} />
              Lock
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── StaffingCard ─────────────────────────────────────────────────────────────

interface StaffingCardViewProps {
  card: LocalStaffingCard;
  isLocked: boolean;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
}

function StaffingCardView({
  card,
  isLocked,
  onDragStart,
}: StaffingCardViewProps) {
  return (
    <div
      className="glass-card rounded-2xl no-select transition-shadow"
      draggable={!isLocked}
      onDragStart={(e) => onDragStart(e, card.id)}
      title={isLocked ? "Locked" : "Drag to move"}
      style={{
        padding: "12px",
        boxShadow: "var(--shadow-card)",
        cursor: isLocked ? "default" : "grab",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="font-bold truncate m-0"
            style={{ fontSize: 14, color: "var(--text-primary)" }}
          >
            {card.personName}{" "}
            <span style={{ fontWeight: 500, opacity: 0.75 }}>
              ({card.login})
            </span>
          </p>
          <div
            className="mt-1"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}
          >
            {card.shiftCoHost} &mdash; {card.shiftPattern}
          </div>
        </div>
        {!isLocked && (
          <GripVertical
            size={14}
            style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 2 }}
          />
        )}
      </div>
    </div>
  );
}

// ─── UniversityCard ───────────────────────────────────────────────────────────

interface UniversityCardViewProps {
  card: LocalUniversityCard;
  isLocked: boolean;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
}

function UniversityCardView({
  card,
  isLocked,
  onDragStart,
}: UniversityCardViewProps) {
  return (
    <div
      className="glass-card rounded-2xl no-select transition-shadow"
      draggable={!isLocked}
      onDragStart={(e) => onDragStart(e, card.id)}
      title={isLocked ? "Locked" : "Drag to move"}
      style={{
        padding: "12px",
        boxShadow: "var(--shadow-card)",
        cursor: isLocked ? "default" : "grab",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="font-bold m-0"
            style={{ fontSize: 14, color: "var(--text-primary)" }}
          >
            {card.title}
          </p>
          <div
            className="mt-1"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}
          >
            {card.term}
          </div>
        </div>
        {!isLocked && (
          <GripVertical
            size={14}
            style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 2 }}
          />
        )}
      </div>
    </div>
  );
}

// ─── DropBucket ───────────────────────────────────────────────────────────────

interface DropBucketProps {
  bucketKey: string;
  label?: string;
  count: number;
  dragOverId: string | null;
  isLocked: boolean;
  children: React.ReactNode;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDrop: (e: React.DragEvent, key: string) => void;
  onDragLeave: () => void;
  showHeader?: boolean;
}

function DropBucket({
  bucketKey,
  label,
  count,
  dragOverId,
  isLocked,
  children,
  onDragOver,
  onDrop,
  onDragLeave,
  showHeader = true,
}: DropBucketProps) {
  const isDragOver = !isLocked && dragOverId === bucketKey;

  return (
    <div
      className={`glass-sub rounded-2xl overflow-hidden transition-all ${isDragOver ? "drag-over-highlight" : ""}`}
      onDragOverCapture={(e) => onDragOver(e, bucketKey)}
      onDragEnterCapture={(e) => onDragOver(e, bucketKey)}
      onDropCapture={(e) => onDrop(e, bucketKey)}
      onDragLeave={onDragLeave}
    >
      {showHeader && label && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            fontSize: 13,
          }}
        >
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {count}
          </span>
        </div>
      )}

      <div
        className="flex flex-col gap-2"
        style={{ padding: 10, minHeight: 80 }}
      >
        {count === 0 && (
          <div
            className="rounded-xl"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.40)",
              border: "1px dashed rgba(255,255,255,0.18)",
              padding: "10px 12px",
              minHeight: 26,
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

// ─── AddAssociateModal ────────────────────────────────────────────────────────

interface AddAssociateModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (
    card: Omit<LocalStaffingCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
}

function AddAssociateModal({ open, onClose, onAdd }: AddAssociateModalProps) {
  const [personName, setPersonName] = useState("");
  const [login, setLogin] = useState("");
  const [shiftCoHost, setShiftCoHost] = useState("");
  const [shiftPattern, setShiftPattern] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !login.trim()) return;
    onAdd({
      personName: personName.trim(),
      login: login.trim(),
      shiftCoHost: shiftCoHost.trim(),
      shiftPattern: shiftPattern.trim(),
    });
    setPersonName("");
    setLogin("");
    setShiftCoHost("");
    setShiftPattern("");
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    fontSize: 14,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="border-0 max-w-md"
        style={{
          background: "rgba(18,26,51,0.97)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 18,
          boxShadow: "var(--shadow-modal)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{ fontSize: 15, color: "rgba(255,255,255,0.92)" }}
          >
            Add Associate
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Person Name *
            </Label>
            <Input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Full name"
              required
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Login *
            </Label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="e.g. migudavc"
              required
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Shift / Co-Host
            </Label>
            <Input
              value={shiftCoHost}
              onChange={(e) => setShiftCoHost(e.target.value)}
              placeholder="e.g. DB3T0700"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Shift Pattern
            </Label>
            <Input
              value={shiftPattern}
              onChange={(e) => setShiftPattern(e.target.value)}
              placeholder="e.g. Back Half Days"
              style={inputStyle}
            />
          </div>

          <DialogFooter className="mt-1 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl text-sm transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)",
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: "var(--btn-primary)",
                border: "1px solid var(--btn-primary-border)",
                color: "var(--btn-primary-text)",
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── UnlockModal ──────────────────────────────────────────────────────────────

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

function UnlockModal({ open, onClose, onUnlock }: UnlockModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="border-0 max-w-sm"
        style={{
          background: "rgba(18,26,51,0.97)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 18,
          boxShadow: "var(--shadow-modal)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{ fontSize: 15, color: "rgba(255,255,255,0.92)" }}
          >
            Unlock board?
          </DialogTitle>
        </DialogHeader>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            margin: "4px 0 0 0",
            lineHeight: 1.5,
          }}
        >
          This enables editing and moving cards.
        </p>

        <DialogFooter className="mt-3 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl text-sm transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUnlock}
            className="rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: "var(--btn-primary)",
              border: "1px solid var(--btn-primary-border)",
              color: "var(--btn-primary-text)",
              padding: "8px 18px",
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StaffingBoard ────────────────────────────────────────────────────────────

interface StaffingBoardProps {
  cards: LocalStaffingCard[];
  isLocked: boolean;
  onMove: (cardId: string, newCol: string) => void;
  onAdd: (
    card: Omit<LocalStaffingCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
}

function StaffingBoard({ cards, isLocked, onMove, onAdd }: StaffingBoardProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const buckets = useMemo(() => {
    const m: Record<string, LocalStaffingCard[]> = {};
    for (const col of STAFFING_COLS) {
      if (col.sections) for (const s of col.sections) m[s.key] = [];
      if (!col.sections && col.dropKey) m[col.dropKey] = [];
    }
    for (const c of cards) {
      if (!m[c.col]) m[c.col] = [];
      m[c.col].push(c);
    }
    return m;
  }, [cards]);

  function onDragStart(e: React.DragEvent, cardId: string) {
    if (isLocked) {
      e.preventDefault();
      toast.warning("Locked. Unlock to edit.");
      return;
    }
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, key: string) {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(key);
  }

  function onDrop(e: React.DragEvent, bucketKey: string) {
    if (isLocked) {
      toast.warning("Locked. Unlock to edit.");
      return;
    }
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;
    onMove(cardId, bucketKey);
    setDragOverId(null);
  }

  return (
    <>
      {/* Add Associate button */}
      {!isLocked && (
        <div className="flex justify-end mb-2 mt-3">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-xl transition-colors"
            style={{
              background: "var(--btn-primary)",
              border: "1px solid var(--btn-primary-border)",
              color: "var(--btn-primary-text)",
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <Plus size={13} />
            Add Associate
          </button>
        </div>
      )}

      <div
        className="board-grid mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {STAFFING_COLS.map((col) => {
          const colCount = col.sections
            ? col.sections.reduce(
                (sum, s) => sum + (buckets[s.key]?.length ?? 0),
                0,
              )
            : (buckets[col.dropKey ?? ""]?.length ?? 0);

          return (
            <div
              key={col.key}
              className="glass-panel rounded-2xl overflow-hidden flex flex-col"
              style={{ boxShadow: "var(--shadow-panel)", minHeight: 420 }}
            >
              <div
                className="flex items-center justify-between"
                style={{
                  padding: "12px 12px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <h2
                  className="m-0 font-semibold"
                  style={{ fontSize: 14, color: "var(--text-primary)" }}
                >
                  {col.title}
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {colCount}
                </span>
              </div>

              <div
                className="flex flex-col gap-2 flex-1"
                style={{ padding: 12 }}
              >
                {col.sections ? (
                  col.sections.map((sec) => (
                    <DropBucket
                      key={sec.key}
                      bucketKey={sec.key}
                      label={sec.title}
                      count={buckets[sec.key]?.length ?? 0}
                      dragOverId={dragOverId}
                      isLocked={isLocked}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onDragLeave={() => setDragOverId(null)}
                    >
                      {(buckets[sec.key] ?? []).map((card) => (
                        <StaffingCardView
                          key={card.id}
                          card={card}
                          isLocked={isLocked}
                          onDragStart={onDragStart}
                        />
                      ))}
                    </DropBucket>
                  ))
                ) : (
                  <DropBucket
                    bucketKey={col.dropKey!}
                    count={buckets[col.dropKey ?? ""]?.length ?? 0}
                    dragOverId={dragOverId}
                    isLocked={isLocked}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragLeave={() => setDragOverId(null)}
                    showHeader={false}
                  >
                    {(buckets[col.dropKey ?? ""] ?? []).map((card) => (
                      <StaffingCardView
                        key={card.id}
                        card={card}
                        isLocked={isLocked}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </DropBucket>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddAssociateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAdd}
      />
    </>
  );
}

// ─── SnhuBoard ────────────────────────────────────────────────────────────────

interface SnhuBoardProps {
  cards: LocalUniversityCard[];
  isLocked: boolean;
  onMove: (cardId: string, newCol: string) => void;
}

function SnhuBoard({ cards, isLocked, onMove }: SnhuBoardProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const buckets = useMemo(() => {
    const m: Record<string, LocalUniversityCard[]> = {
      cur_pending: [],
      cur_progress: [],
      up_term: [],
      snhu_na: [],
    };
    for (const c of cards) {
      if (!m[c.col]) m[c.col] = [];
      m[c.col].push(c);
    }
    return m;
  }, [cards]);

  function onDragStart(e: React.DragEvent, cardId: string) {
    if (isLocked) {
      e.preventDefault();
      toast.warning("Locked. Unlock to edit.");
      return;
    }
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, key: string) {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(key);
  }

  function onDrop(e: React.DragEvent, bucketKey: string) {
    if (isLocked) {
      toast.warning("Locked. Unlock to edit.");
      return;
    }
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;
    onMove(cardId, bucketKey);
    setDragOverId(null);
  }

  return (
    <div
      className="board-grid-3 mt-3"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
      }}
    >
      {SNHU_COLS.map((col) => {
        const colCount = col.sections
          ? col.sections.reduce(
              (sum, s) => sum + (buckets[s.key]?.length ?? 0),
              0,
            )
          : (buckets[col.dropKey ?? ""]?.length ?? 0);

        return (
          <div
            key={col.key}
            className="glass-panel rounded-2xl overflow-hidden flex flex-col"
            style={{ boxShadow: "var(--shadow-panel)", minHeight: 420 }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "12px 12px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <h2
                className="m-0 font-semibold"
                style={{ fontSize: 14, color: "var(--text-primary)" }}
              >
                {col.title}
              </h2>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {colCount}
              </span>
            </div>

            <div className="flex flex-col gap-2 flex-1" style={{ padding: 12 }}>
              {col.sections ? (
                col.sections.map((sec) => (
                  <DropBucket
                    key={sec.key}
                    bucketKey={sec.key}
                    label={sec.title}
                    count={buckets[sec.key]?.length ?? 0}
                    dragOverId={dragOverId}
                    isLocked={isLocked}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragLeave={() => setDragOverId(null)}
                  >
                    {(buckets[sec.key] ?? []).map((card) => (
                      <UniversityCardView
                        key={card.id}
                        card={card}
                        isLocked={isLocked}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </DropBucket>
                ))
              ) : (
                <DropBucket
                  bucketKey={col.dropKey!}
                  count={buckets[col.dropKey ?? ""]?.length ?? 0}
                  dragOverId={dragOverId}
                  isLocked={isLocked}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragLeave={() => setDragOverId(null)}
                  showHeader={false}
                >
                  {(buckets[col.dropKey ?? ""] ?? []).map((card) => (
                    <UniversityCardView
                      key={card.id}
                      card={card}
                      isLocked={isLocked}
                      onDragStart={onDragStart}
                    />
                  ))}
                </DropBucket>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { actor, isFetching } = useActor();

  const [loaded, setLoaded] = useState(false);
  const [activeBoard, setActiveBoard] = useState<"amazon" | "snhu">("amazon");
  const [lastUpdated, setLastUpdated] = useState(
    () => localStorage.getItem("swb_lastUpdated") ?? nowStamp(),
  );
  const [isLocked, setIsLocked] = useState(
    () => localStorage.getItem(`swb_locked_${LOGIN_NAME}`) === "1",
  );
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);

  const [staffingCards, setStaffingCards] = useState<LocalStaffingCard[]>([]);
  const [universityCards, setUniversityCards] = useState<LocalUniversityCard[]>(
    [],
  );

  // Load from backend on mount (once actor is ready)
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!actor || isFetching || loadedRef.current) return;
    loadedRef.current = true;

    async function loadData() {
      try {
        const [rawStaff, rawUni, lu] = await Promise.all([
          actor!.getAllStaffingCards(),
          actor!.getAllUniversityCards(),
          actor!.getLastUpdated(),
        ]);

        // Process staffing cards
        let sCards: LocalStaffingCard[] = rawStaff.map((c) => ({
          id: decodeId(c.id),
          personName: c.personName,
          login: c.login,
          shiftCoHost: c.shiftCoHost,
          shiftPattern: c.shiftPattern,
          col: migrateStaffingCol(c.col),
          createdBy: c.createdBy,
          createdAt: c.createdAt,
        }));

        if (sCards.length === 0) {
          sCards = [miguelCard()];
          // Save defaults
          await actor!.saveAllStaffingCards(
            sCards.map((c) => ({
              id: encodeId(c.id),
              personName: c.personName,
              login: c.login,
              shiftCoHost: c.shiftCoHost,
              shiftPattern: c.shiftPattern,
              col: c.col,
              createdBy: c.createdBy,
              createdAt: c.createdAt,
            })),
          );
        } else {
          // Ensure Miguel is present
          const hasMiguel = sCards.some(
            (c) =>
              c.login === "migudavc" &&
              c.personName.toLowerCase().includes("miguel"),
          );
          if (!hasMiguel) sCards = [miguelCard(), ...sCards];
        }

        // Process university cards
        let uCards: LocalUniversityCard[] = rawUni.map((c) => ({
          id: decodeId(c.id),
          title: c.title,
          term: c.term,
          col: migrateSnhuCol(c.col),
          createdBy: c.createdBy,
          createdAt: c.createdAt,
        }));

        uCards = normalizeSnhuCards(uCards);

        if (rawUni.length === 0) {
          await actor!.saveAllUniversityCards(
            uCards.map((c) => ({
              id: encodeId(c.id),
              title: c.title,
              term: c.term,
              col: c.col,
              createdBy: c.createdBy,
              createdAt: c.createdAt,
            })),
          );
        }

        if (lu) {
          setLastUpdated(lu);
          localStorage.setItem("swb_lastUpdated", lu);
        }

        setStaffingCards(sCards);
        setUniversityCards(uCards);
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load data from backend", err);
        // Fall back to defaults
        setStaffingCards([miguelCard()]);
        setUniversityCards(normalizeSnhuCards([]));
        setLoaded(true);
      }
    }

    loadData();
  }, [actor, isFetching]);

  // Persist lock state
  useEffect(() => {
    localStorage.setItem(`swb_locked_${LOGIN_NAME}`, isLocked ? "1" : "0");
  }, [isLocked]);

  // Save helper
  const saveStaffing = useCallback(
    async (cards: LocalStaffingCard[]) => {
      if (!actor) return;
      toast.loading("Saving...", { id: "saving" });
      try {
        await actor.saveAllStaffingCards(
          cards.map((c) => ({
            id: encodeId(c.id),
            personName: c.personName,
            login: c.login,
            shiftCoHost: c.shiftCoHost,
            shiftPattern: c.shiftPattern,
            col: c.col,
            createdBy: c.createdBy,
            createdAt: c.createdAt,
          })),
        );
        const stamp = nowStamp();
        await actor.setLastUpdated(stamp);
        setLastUpdated(stamp);
        localStorage.setItem("swb_lastUpdated", stamp);
        toast.success("Saved.", { id: "saving" });
      } catch {
        toast.error("Save failed.", { id: "saving" });
      }
    },
    [actor],
  );

  const saveUniversity = useCallback(
    async (cards: LocalUniversityCard[]) => {
      if (!actor) return;
      toast.loading("Saving...", { id: "saving" });
      try {
        await actor.saveAllUniversityCards(
          cards.map((c) => ({
            id: encodeId(c.id),
            title: c.title,
            term: c.term,
            col: c.col,
            createdBy: c.createdBy,
            createdAt: c.createdAt,
          })),
        );
        const stamp = nowStamp();
        await actor.setLastUpdated(stamp);
        setLastUpdated(stamp);
        localStorage.setItem("swb_lastUpdated", stamp);
        toast.success("Saved.", { id: "saving" });
      } catch {
        toast.error("Save failed.", { id: "saving" });
      }
    },
    [actor],
  );

  // Staffing card handlers
  function handleStaffingMove(cardId: string, newCol: string) {
    const next = staffingCards.map((c) =>
      c.id === cardId ? { ...c, col: newCol } : c,
    );
    setStaffingCards(next);
    saveStaffing(next);
  }

  function handleStaffingAdd(
    data: Omit<LocalStaffingCard, "id" | "createdAt" | "col" | "createdBy">,
  ) {
    const newCard: LocalStaffingCard = {
      ...data,
      id: uid(),
      col: "staff_na",
      createdBy: LOGIN_NAME,
      createdAt: new Date().toISOString(),
    };
    const next = [...staffingCards, newCard];
    setStaffingCards(next);
    toast.success("Associate added.");
    saveStaffing(next);
  }

  // University card handlers
  function handleUniversityMove(cardId: string, newCol: string) {
    const next = universityCards.map((c) =>
      c.id === cardId ? { ...c, col: newCol } : c,
    );
    setUniversityCards(next);
    saveUniversity(next);
  }

  function handleLock() {
    setIsLocked(true);
    toast.info("Board locked.");
  }

  function handleRequestUnlock() {
    setUnlockModalOpen(true);
  }

  function handleUnlock() {
    setIsLocked(false);
    setUnlockModalOpen(false);
    toast.info("Board unlocked.");
  }

  // Loading state
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "rgba(255,255,255,0.5)" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Loading board...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "rgba(18,26,51,0.95)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            borderRadius: 14,
          },
          duration: 1800,
        }}
      />

      <div className="mx-auto" style={{ maxWidth: 1500, padding: 20 }}>
        <TopBar
          activeBoard={activeBoard}
          onBoardChange={setActiveBoard}
          lastUpdated={lastUpdated}
          isLocked={isLocked}
          onLock={handleLock}
          onRequestUnlock={handleRequestUnlock}
        />

        <main>
          {activeBoard === "amazon" ? (
            <StaffingBoard
              cards={staffingCards}
              isLocked={isLocked}
              onMove={handleStaffingMove}
              onAdd={handleStaffingAdd}
            />
          ) : (
            <SnhuBoard
              cards={universityCards}
              isLocked={isLocked}
              onMove={handleUniversityMove}
            />
          )}
        </main>

        <footer
          className="mt-8 text-center"
          style={{ fontSize: 12, color: "var(--text-dim)" }}
        >
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-dim)", textDecoration: "none" }}
          >
            Built with ♥ using caffeine.ai
          </a>
        </footer>
      </div>

      <UnlockModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlock={handleUnlock}
      />
    </>
  );
}
