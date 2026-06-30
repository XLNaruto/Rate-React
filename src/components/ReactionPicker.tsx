import { useEffect, useRef, useState } from "react";
import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import type { ScanQrReaction } from "../api";

// Reaction media is a full CDN url from the API; fall back to resolving
// project-relative paths through the asset base just in case.
const resolveReactionSrc = (src: string) =>
  !src
    ? ""
    : /^(https?:)?\/\//i.test(src) || src.startsWith("data:")
      ? src
      : toAbsoluteUrl(src);

type ReactionPickerProps = {
  reactions: ScanQrReaction[];
  onSelect: (type: string) => void;
  /** How many reactions to show inline before the "more" trigger. */
  visibleCount?: number;
  /** Extra classes applied to every reaction circle (e.g. a white border). */
  circleClassName?: string;
};

const ReactionCircle = ({
  reaction,
  onClick,
  className = "",
}: {
  reaction: ScanQrReaction;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{ backgroundColor: reaction.background_color }}
    className={`group relative shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-transform duration-200 ease-out hover:scale-125 active:scale-110 ${className}`}
  >
    <SmartImage
      className="w-[26px] h-[26px] object-contain"
      wrapperClassName="rounded-full"
      src={resolveReactionSrc(reaction.media_url)}
      alt={reaction.label}
    />
  </button>
);

const ReactionPicker = ({
  reactions,
  onSelect,
  visibleCount = 4,
  circleClassName = "",
}: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasMore = reactions.length > visibleCount;
  const inline = hasMore ? reactions.slice(0, visibleCount) : reactions;

  // Close the picker on an outside click or the Escape key.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (type: string) => {
    setOpen(false);
    onSelect(type);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex items-center justify-between gap-1.5 sm:gap-2.5"
    >
      {inline.map((r) => (
        <ReactionCircle
          key={r.reaction_id}
          reaction={r}
          onClick={() => handleSelect(r.type)}
          className={circleClassName}
        />
      ))}

      {hasMore && (
        <>
          <button
            type="button"
            aria-label="More reactions"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center cursor-pointer border border-border-mute text-black/55 transition-colors hover:bg-surface-soft hover:text-black ${
              open ? "bg-surface-soft text-black" : "bg-white"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              {/* Smiley face — the right side is left open for the plus badge */}
              <path
                d="M21 12a9 9 0 1 0-9 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M8.5 14.5c.8 1 2 1.6 3.5 1.6.6 0 1.2-.1 1.7-.3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="9" cy="10" r="1.1" fill="currentColor" />
              <circle cx="15" cy="10" r="1.1" fill="currentColor" />
              {/* Plus badge */}
              <path
                d="M19 15.5v5M16.5 18h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute bottom-full right-0 mb-3 z-20 w-[260px] max-w-[80vw] rounded-3xl border border-border-mute bg-white p-3 shadow-xl origin-bottom-right animate-scale-in"
            >
              <div className="grid grid-cols-4 gap-2.5 justify-items-center max-h-[220px] overflow-y-auto nice-scrollbar py-1">
                {reactions.map((r) => (
                  <ReactionCircle
                    key={r.reaction_id}
                    reaction={r}
                    onClick={() => handleSelect(r.type)}
                    className={circleClassName}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReactionPicker;
