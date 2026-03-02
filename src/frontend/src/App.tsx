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
import {
  Camera,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Unlock,
} from "lucide-react";
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
  // Assignment-specific fields (optional — course cards don't have these)
  assignmentTitle?: string;
  course?: string;
  dueDate?: string;
  week?: number; // 1–8 for the drop list
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
  { key: "cur", title: "Current Term", sections: null, dropKey: "cur_term" },
  { key: "up", title: "Upcoming Term", sections: null, dropKey: "up_term" },
  {
    key: "ca",
    title: "Current Assignments",
    sections: [
      { key: "ca_not_started", title: "Not Started" },
      { key: "ca_in_progress", title: "In Progress" },
    ],
  },
];

const WEEK_KEYS = [1, 2, 3, 4, 5, 6, 7, 8].map((w) => `ca_week_${w}`);

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
  const valid = new Set([
    "cur_term",
    "up_term",
    "ca_not_started",
    "ca_in_progress",
    ...WEEK_KEYS,
  ]);
  if (valid.has(oldCol)) return oldCol;
  // Old keys → new keys
  if (oldCol === "cur_pending" || oldCol === "cur_progress") return "cur_term";
  if (oldCol === "up_pending" || oldCol === "up_progress") return "up_term";
  if (oldCol === "snhu_na") return "ca_not_started";
  return "ca_not_started";
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const LOGIN_NAME = "migudavc";
const LS_STAFFING_KEY = `swb_staffing_${LOGIN_NAME}`;
const LS_UNIVERSITY_KEY = `swb_university_${LOGIN_NAME}`;

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
      col: "ca_not_started",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-ids105",
      title: "IDS 105: Awareness and Online Learning",
      term: "C-2 Term - March thru April 2026",
      col: "ca_not_started",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-eco202",
      title: "ECO 202: Macroeconomics",
      term: "C-3 Term - May thru June 2026",
      col: "ca_not_started",
      createdBy: LOGIN_NAME,
      createdAt: now,
    },
    {
      id: "snhu-phl260",
      title: "PHL 260: Ethical Decision-Making & Problem-Solving",
      term: "C-3 Term - May thru June 2026",
      col: "ca_not_started",
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
    result.push({ ...canon, col: existing?.col ?? "ca_not_started" });
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
  headCount: number;
}

function TopBar({
  activeBoard,
  onBoardChange,
  lastUpdated,
  isLocked,
  onLock,
  onRequestUnlock,
  headCount,
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

        {/* Right: lock/unlock + HC */}
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
          <div
            style={{
              fontSize: 16,
              color: "var(--text-muted)",
              fontWeight: 700,
              letterSpacing: "0.3px",
            }}
          >
            HC: {headCount}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── MiguelPhotoUpload ────────────────────────────────────────────────────────

const MIGUEL_PHOTO_KEY = "miguel_photo";

interface MiguelPhotoUploadProps {
  photoDataUrl: string | null;
  onPhotoChange: (dataUrl: string) => void;
}

function MiguelPhotoUpload({
  photoDataUrl,
  onPhotoChange,
}: MiguelPhotoUploadProps) {
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onPhotoChange(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={photoDataUrl ? "Click to change photo" : "Click to upload photo"}
      aria-label={
        photoDataUrl ? "Change profile photo" : "Upload profile photo"
      }
      style={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 12,
        border: photoDataUrl
          ? "1px solid rgba(255,255,255,0.18)"
          : "1.5px dashed rgba(255,255,255,0.30)",
        background: photoDataUrl ? "transparent" : "rgba(255,255,255,0.06)",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "border-color 0.15s, background 0.15s",
        padding: 0,
      }}
    >
      {photoDataUrl ? (
        <>
          <img
            src={photoDataUrl}
            alt="Miguel A Davalos"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "opacity 0.15s",
              opacity: hovered ? 0.55 : 1,
            }}
          />
          {hovered && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Camera size={18} style={{ color: "rgba(255,255,255,0.9)" }} />
            </div>
          )}
        </>
      ) : (
        <Camera
          size={20}
          style={{
            color: hovered
              ? "rgba(255,255,255,0.75)"
              : "rgba(255,255,255,0.40)",
            transition: "color 0.15s",
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label="Upload photo"
      />
    </button>
  );
}

// ─── StaffingCard ─────────────────────────────────────────────────────────────

interface StaffingCardViewProps {
  card: LocalStaffingCard;
  isLocked: boolean;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  miguelPhoto: string | null;
  onMiguelPhotoChange: (dataUrl: string) => void;
}

function StaffingCardView({
  card,
  isLocked,
  onDragStart,
  miguelPhoto,
  onMiguelPhotoChange,
}: StaffingCardViewProps) {
  const isMiguel = card.login === "migudavc";

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
      <div className="flex items-center justify-between gap-2">
        {/* Photo upload square — only for Miguel */}
        {isMiguel && (
          <div
            // Prevent drag from starting when clicking the photo area
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ flexShrink: 0 }}
          >
            <MiguelPhotoUpload
              photoDataUrl={miguelPhoto}
              onPhotoChange={onMiguelPhotoChange}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
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
  const isAssignment = Boolean(card.assignmentTitle);

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
        <div className="min-w-0 flex-1">
          <p
            className="font-bold m-0"
            style={{ fontSize: 14, color: "var(--text-primary)" }}
          >
            {isAssignment ? card.assignmentTitle : card.title}
          </p>
          {isAssignment ? (
            <div className="flex flex-col gap-0.5 mt-1">
              {card.course && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  Course: {card.course}
                </div>
              )}
              {card.term && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  Term: {card.term}
                </div>
              )}
              {card.dueDate && (
                <div style={{ fontSize: 12, color: "rgba(255,200,80,0.85)" }}>
                  Due: {card.dueDate}
                </div>
              )}
            </div>
          ) : (
            <div
              className="mt-1"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}
            >
              {card.term}
            </div>
          )}
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
            {count > 0 ? count : ""}
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

// ─── AddCourseModal ───────────────────────────────────────────────────────────

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (
    card: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
}

function AddCourseModal({ open, onClose, onAdd }: AddCourseModalProps) {
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), term: term.trim() });
    setTitle("");
    setTerm("");
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
            Add Course
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Course Title *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MAT 140: Precalculus"
              required
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Term
            </Label>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. C-4 Term - July thru August 2026"
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

// ─── AddAssignmentModal ───────────────────────────────────────────────────────

interface AddAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (
    card: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
}

function AddAssignmentModal({ open, onClose, onAdd }: AddAssignmentModalProps) {
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [course, setCourse] = useState("");
  const [term, setTerm] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentTitle.trim()) return;
    onAdd({
      title: assignmentTitle.trim(), // keep title field for compatibility
      assignmentTitle: assignmentTitle.trim(),
      course: course.trim(),
      term: term.trim(),
      dueDate: dueDate.trim(),
    });
    setAssignmentTitle("");
    setCourse("");
    setTerm("");
    setDueDate("");
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
            Add Assignment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Assignment Title *
            </Label>
            <Input
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="e.g. Week 1 Discussion Post"
              required
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Course
            </Label>
            <Input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. ENG 190: Research and Persuasion"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Term
            </Label>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. C-2 Term - March thru April 2026"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Due Date
            </Label>
            <Input
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="e.g. March 15, 2026"
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
              Add Assignment
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── DeleteCourseModal ────────────────────────────────────────────────────────

interface DeleteCourseModalProps {
  open: boolean;
  cards: LocalUniversityCard[];
  onClose: () => void;
  onDelete: (cardId: string) => void;
}

function DeleteCourseModal({
  open,
  cards,
  onClose,
  onDelete,
}: DeleteCourseModalProps) {
  const [selectedId, setSelectedId] = useState("");

  function handleDelete() {
    if (!selectedId) return;
    onDelete(selectedId);
    setSelectedId("");
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    fontSize: 14,
    width: "100%",
    padding: "10px 12px",
    outline: "none",
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
            Delete Course
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Select course to delete
            </Label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Choose a course --</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
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
              type="button"
              onClick={handleDelete}
              disabled={!selectedId}
              className="rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: selectedId
                  ? "rgba(255,77,77,0.18)"
                  : "rgba(255,255,255,0.05)",
                border: selectedId
                  ? "1px solid rgba(255,77,77,0.4)"
                  : "1px solid rgba(255,255,255,0.10)",
                color: selectedId
                  ? "rgba(255,120,120,0.95)"
                  : "rgba(255,255,255,0.3)",
                padding: "8px 18px",
                cursor: selectedId ? "pointer" : "not-allowed",
              }}
            >
              Delete
            </button>
          </DialogFooter>
        </div>
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
  miguelPhoto: string | null;
  onMiguelPhotoChange: (dataUrl: string) => void;
}

function StaffingBoard({
  cards,
  isLocked,
  onMove,
  miguelPhoto,
  onMiguelPhotoChange,
}: StaffingBoardProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
                  {colCount > 0 ? colCount : ""}
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
                          miguelPhoto={miguelPhoto}
                          onMiguelPhotoChange={onMiguelPhotoChange}
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
                        miguelPhoto={miguelPhoto}
                        onMiguelPhotoChange={onMiguelPhotoChange}
                      />
                    ))}
                  </DropBucket>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── WeekSelector ────────────────────────────────────────────────────────────

interface WeekSelectorProps {
  selectedWeek: number | null;
  onSelect: (week: number | null) => void;
  buckets: Record<string, LocalUniversityCard[]>;
}

function WeekSelector({ selectedWeek, onSelect, buckets }: WeekSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "8px 4px 4px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Week
      </span>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 5,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => {
          const wKey = `ca_week_${w}`;
          const count = buckets[wKey]?.length ?? 0;
          const isActive = selectedWeek === w;
          return (
            <button
              key={w}
              type="button"
              onClick={() => onSelect(isActive ? null : w)}
              title={
                count > 0
                  ? `Week ${w} — ${count} item${count !== 1 ? "s" : ""}`
                  : `Week ${w}`
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: isActive
                  ? "1.5px solid rgba(29,185,84,0.6)"
                  : "1px solid rgba(255,255,255,0.14)",
                background: isActive
                  ? "rgba(29,185,84,0.18)"
                  : "rgba(255,255,255,0.05)",
                color: isActive
                  ? "rgba(29,220,100,0.95)"
                  : "rgba(255,255,255,0.70)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                position: "relative",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {w}
              {count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: isActive
                      ? "rgba(29,185,84,0.8)"
                      : "rgba(255,255,255,0.25)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SnhuBoard ────────────────────────────────────────────────────────────────

interface SnhuBoardProps {
  cards: LocalUniversityCard[];
  isLocked: boolean;
  onMove: (cardId: string, newCol: string) => void;
  onAdd: (
    card: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
  onAddAssignment: (
    card: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) => void;
  onDelete: (cardId: string) => void;
}

function SnhuBoard({
  cards,
  isLocked,
  onMove,
  onAdd,
  onAddAssignment,
  onDelete,
}: SnhuBoardProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addAssignOpen, setAddAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const buckets = useMemo(() => {
    const m: Record<string, LocalUniversityCard[]> = {
      cur_term: [],
      up_term: [],
      ca_not_started: [],
      ca_in_progress: [],
    };
    // initialize week buckets
    for (const wk of WEEK_KEYS) m[wk] = [];

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

  function renderCards(bucketKey: string) {
    return (buckets[bucketKey] ?? []).map((card) => (
      <UniversityCardView
        key={card.id}
        card={card}
        isLocked={isLocked}
        onDragStart={onDragStart}
      />
    ));
  }

  return (
    <>
      {/* Top action bar */}
      {!isLocked && (
        <div className="flex justify-end gap-2 mb-2 mt-3">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 text-xs rounded-xl transition-colors"
            style={{
              background: "rgba(255,77,77,0.14)",
              border: "1px solid rgba(255,77,77,0.35)",
              color: "rgba(255,120,120,0.9)",
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Delete Course
          </button>
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
            Add Course
          </button>
        </div>
      )}

      <div
        className="board-grid-3 mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          alignItems: "start",
        }}
      >
        {SNHU_COLS.map((col) => {
          const colCount = col.sections
            ? col.sections.reduce(
                (sum, s) => sum + (buckets[s.key]?.length ?? 0),
                0,
              )
            : (buckets[col.dropKey ?? ""]?.length ?? 0);

          const isCurrentAssignments = col.key === "ca";

          return (
            <div
              key={col.key}
              className="glass-panel rounded-2xl overflow-hidden flex flex-col"
              style={{ boxShadow: "var(--shadow-panel)", minHeight: 420 }}
            >
              {/* Column header — Add Assignment button inline for Current Assignments */}
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
                <div className="flex items-center gap-2">
                  {isCurrentAssignments && !isLocked && (
                    <button
                      type="button"
                      onClick={() => setAddAssignOpen(true)}
                      className="flex items-center gap-1 text-xs rounded-lg transition-colors"
                      style={{
                        background: "var(--btn-primary)",
                        border: "1px solid var(--btn-primary-border)",
                        color: "var(--btn-primary-text)",
                        padding: "4px 10px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={11} />
                      Add Assignment
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {colCount > 0 ? colCount : ""}
                  </span>
                </div>
              </div>

              <div
                className="flex flex-col gap-2 flex-1"
                style={{ padding: 12 }}
              >
                {col.sections ? (
                  <>
                    {/* Week selector toggle — centered between header and sections */}
                    <WeekSelector
                      selectedWeek={selectedWeek}
                      onSelect={setSelectedWeek}
                      buckets={buckets}
                    />

                    {col.sections.map((sec) => (
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
                        {renderCards(sec.key)}
                      </DropBucket>
                    ))}

                    {/* Selected week drop zone */}
                    {selectedWeek !== null && (
                      <DropBucket
                        key={`ca_week_${selectedWeek}`}
                        bucketKey={`ca_week_${selectedWeek}`}
                        label={`Week ${selectedWeek}`}
                        count={buckets[`ca_week_${selectedWeek}`]?.length ?? 0}
                        dragOverId={dragOverId}
                        isLocked={isLocked}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onDragLeave={() => setDragOverId(null)}
                      >
                        {renderCards(`ca_week_${selectedWeek}`)}
                      </DropBucket>
                    )}
                  </>
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
                    {renderCards(col.dropKey!)}
                  </DropBucket>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddCourseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAdd}
      />
      <AddAssignmentModal
        open={addAssignOpen}
        onClose={() => setAddAssignOpen(false)}
        onAdd={onAddAssignment}
      />
      <DeleteCourseModal
        open={deleteOpen}
        cards={cards}
        onClose={() => setDeleteOpen(false)}
        onDelete={onDelete}
      />
    </>
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
  const [miguelPhoto, setMiguelPhoto] = useState<string | null>(() =>
    localStorage.getItem(MIGUEL_PHOTO_KEY),
  );

  function handleMiguelPhotoChange(dataUrl: string) {
    setMiguelPhoto(dataUrl);
    localStorage.setItem(MIGUEL_PHOTO_KEY, dataUrl);
  }

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

        // Sync latest data into localStorage for offline fallback
        localStorage.setItem(LS_STAFFING_KEY, JSON.stringify(sCards));
        localStorage.setItem(LS_UNIVERSITY_KEY, JSON.stringify(uCards));

        setStaffingCards(sCards);
        setUniversityCards(uCards);
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load data from backend", err);
        // Try localStorage fallback before using hardcoded defaults
        try {
          const lsStaff = localStorage.getItem(LS_STAFFING_KEY);
          const lsUni = localStorage.getItem(LS_UNIVERSITY_KEY);

          let sCards: LocalStaffingCard[] = lsStaff
            ? (JSON.parse(lsStaff) as LocalStaffingCard[]).map((c) => ({
                ...c,
                col: migrateStaffingCol(c.col),
              }))
            : [miguelCard()];

          const hasMiguel = sCards.some(
            (c) =>
              c.login === "migudavc" &&
              c.personName.toLowerCase().includes("miguel"),
          );
          if (!hasMiguel) sCards = [miguelCard(), ...sCards];

          let uCards: LocalUniversityCard[] = lsUni
            ? (JSON.parse(lsUni) as LocalUniversityCard[]).map((c) => ({
                ...c,
                col: migrateSnhuCol(c.col),
              }))
            : [];
          uCards = normalizeSnhuCards(uCards);

          setStaffingCards(sCards);
          setUniversityCards(uCards);
        } catch {
          setStaffingCards([miguelCard()]);
          setUniversityCards(normalizeSnhuCards([]));
        }
        setLoaded(true);
      }
    }

    loadData();
  }, [actor, isFetching]);

  // Persist lock state
  useEffect(() => {
    localStorage.setItem(`swb_locked_${LOGIN_NAME}`, isLocked ? "1" : "0");
  }, [isLocked]);

  // Save helpers — localStorage is primary (immediate), backend is fire-and-forget
  const saveStaffing = useCallback(
    (cards: LocalStaffingCard[]) => {
      // 1. Persist to localStorage immediately — this is the source of truth
      localStorage.setItem(LS_STAFFING_KEY, JSON.stringify(cards));
      const stamp = nowStamp();
      setLastUpdated(stamp);
      localStorage.setItem("swb_lastUpdated", stamp);

      // 2. Fire-and-forget backend sync (no loading toast, no rollback on failure)
      if (!actor) return;
      actor
        .saveAllStaffingCards(
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
        )
        .then(() => actor.setLastUpdated(stamp))
        .catch(() => {
          toast.warning("Saved locally.", { id: "save-warn", duration: 2500 });
        });
    },
    [actor],
  );

  const saveUniversity = useCallback(
    (cards: LocalUniversityCard[]) => {
      // 1. Persist to localStorage immediately — this is the source of truth
      localStorage.setItem(LS_UNIVERSITY_KEY, JSON.stringify(cards));
      const stamp = nowStamp();
      setLastUpdated(stamp);
      localStorage.setItem("swb_lastUpdated", stamp);

      // 2. Fire-and-forget backend sync (no loading toast, no rollback on failure)
      if (!actor) return;
      actor
        .saveAllUniversityCards(
          cards.map((c) => ({
            id: encodeId(c.id),
            title: c.title,
            term: c.term,
            col: c.col,
            createdBy: c.createdBy,
            createdAt: c.createdAt,
          })),
        )
        .then(() => actor.setLastUpdated(stamp))
        .catch(() => {
          toast.warning("Saved locally.", { id: "save-warn", duration: 2500 });
        });
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

  // University card handlers
  function handleUniversityMove(cardId: string, newCol: string) {
    const next = universityCards.map((c) =>
      c.id === cardId ? { ...c, col: newCol } : c,
    );
    setUniversityCards(next);
    saveUniversity(next);
  }

  function handleUniversityAdd(
    data: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) {
    const newCard: LocalUniversityCard = {
      ...data,
      id: `snhu-${uid()}`,
      col: "ca_not_started",
      createdBy: LOGIN_NAME,
      createdAt: new Date().toISOString(),
    };
    const next = [...universityCards, newCard];
    setUniversityCards(next);
    toast.success("Course added.");
    saveUniversity(next);
  }

  function handleUniversityAddAssignment(
    data: Omit<LocalUniversityCard, "id" | "createdAt" | "col" | "createdBy">,
  ) {
    const newCard: LocalUniversityCard = {
      ...data,
      id: `assign-${uid()}`,
      col: "ca_not_started",
      createdBy: LOGIN_NAME,
      createdAt: new Date().toISOString(),
    };
    const next = [...universityCards, newCard];
    setUniversityCards(next);
    toast.success("Assignment added.");
    saveUniversity(next);
  }

  function handleUniversityDelete(cardId: string) {
    const next = universityCards.filter((c) => c.id !== cardId);
    setUniversityCards(next);
    toast.success("Course deleted.");
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
          headCount={
            activeBoard === "amazon"
              ? staffingCards.length
              : universityCards.length
          }
        />

        <main>
          {activeBoard === "amazon" ? (
            <StaffingBoard
              cards={staffingCards}
              isLocked={isLocked}
              onMove={handleStaffingMove}
              miguelPhoto={miguelPhoto}
              onMiguelPhotoChange={handleMiguelPhotoChange}
            />
          ) : (
            <SnhuBoard
              cards={universityCards}
              isLocked={isLocked}
              onMove={handleUniversityMove}
              onAdd={handleUniversityAdd}
              onAddAssignment={handleUniversityAddAssignment}
              onDelete={handleUniversityDelete}
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
