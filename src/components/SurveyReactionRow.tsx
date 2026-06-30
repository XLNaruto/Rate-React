import { useLayoutEffect, useRef, useState } from "react";
import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import ReactionPicker from "./ReactionPicker";
import type { ScanQrReaction } from "../api";

// Reaction media is a full CDN url from the API; fall back to resolving
// project-relative paths through the asset base just in case.
const resolveReactionSrc = (src: string) =>
  !src
    ? ""
    : /^(https?:)?\/\//i.test(src) || src.startsWith("data:")
      ? src
      : toAbsoluteUrl(src);

const ratings = [1, 2, 3, 4, 5];

export type SurveyRateReactValue = {
  reaction: string | null;
  rating: number | null;
};

type Props = {
  value: SurveyRateReactValue;
  onChange: (next: SurveyRateReactValue) => void;
  reactions?: ScanQrReaction[];
};

const SurveyReactionRow = ({ value, onChange, reactions = [] }: Props) => {
  const { reaction: selectedReaction, rating: selectedRating } = value;
  const reactionList = [...reactions].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const rowRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [reactionLeft, setReactionLeft] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const [ratingBursts, setRatingBursts] = useState<Record<number, number>>({});
  const burstIdRef = useRef(0);

  const getBtnCenter = (idx: number) => {
    const btn = btnRefs.current[idx];
    const row = rowRef.current;
    if (!btn || !row) return null;
    const br = btn.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    return br.left - rr.left + br.width / 2;
  };

  const nearestRatingFromX = (x: number) => {
    let best = ratings[0];
    let bestDist = Infinity;
    ratings.forEach((n, i) => {
      const c = getBtnCenter(i);
      if (c == null) return;
      const d = Math.abs(c - x);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    });
    return best;
  };

  useLayoutEffect(() => {
    if (!selectedReaction) return;
    const row = rowRef.current;
    if (!row) return;

    const recompute = () => {
      if (selectedRating == null) {
        setReactionLeft(row.getBoundingClientRect().width + 8);
      } else {
        const c = getBtnCenter(ratings.indexOf(selectedRating));
        if (c != null) setReactionLeft(c);
      }
    };

    recompute();

    const ro = new ResizeObserver(recompute);
    ro.observe(row);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [selectedRating, selectedReaction]);

  const setRating = (n: number) => {
    onChange({ reaction: selectedReaction, rating: n });
    burstIdRef.current += 1;
    const id = burstIdRef.current;
    setRatingBursts((prev) => ({ ...prev, [n]: id }));
    window.setTimeout(() => {
      setRatingBursts((prev) => {
        if (prev[n] !== id) return prev;
        const next = { ...prev };
        delete next[n];
        return next;
      });
    }, 3000);
  };

  if (!selectedReaction) {
    return (
      <ReactionPicker
        reactions={reactionList}
        onSelect={(type) => onChange({ reaction: type, rating: null })}
        circleClassName="border-2 border-white"
      />
    );
  }

  const r = reactionList.find((x) => x.type === selectedReaction);
  if (!r) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    didDragRef.current = false;
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const row = rowRef.current;
    if (!row) return;
    if (
      dragStartXRef.current != null &&
      Math.abs(e.clientX - dragStartXRef.current) > 4
    ) {
      didDragRef.current = true;
    }
    const rawX = e.clientX - row.getBoundingClientRect().left;
    const firstC = getBtnCenter(0);
    const lastC = getBtnCenter(ratings.length - 1);
    const minX = firstC ?? 0;
    const maxX = lastC ?? row.getBoundingClientRect().width;
    const x = Math.max(minX, Math.min(maxX, rawX));
    setReactionLeft(x);
    const n = nearestRatingFromX(x);
    if (n !== selectedRating) setRating(n);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartXRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (selectedRating != null) {
      const c = getBtnCenter(ratings.indexOf(selectedRating));
      if (c != null) setReactionLeft(c);
    }
  };

  const style: React.CSSProperties = {
    left: reactionLeft ?? undefined,
    top: 0,
    transform: `translate(-30%, -60%)`,
    transition: isDragging
      ? "none"
      : "left 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    touchAction: "none",
    backgroundColor: r.background_color,
  };

  return (
    <div
      ref={rowRef}
      className="relative flex justify-between items-center mt-2"
    >
      <button
        type="button"
        aria-label="Drag to set rating, or tap to change reaction"
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          onChange({ reaction: null, rating: null });
          setRatingBursts({});
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={style}
        className={`absolute z-20 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing border-2 border-white shadow-md ${
          isDragging ? "scale-110" : ""
        } transition-transform duration-150 ease-out`}
      >
        <SmartImage
          className="w-[22px] h-[22px] object-contain pointer-events-none"
          wrapperClassName="rounded-full"
          src={resolveReactionSrc(r.media_url)}
          alt={r.label}
        />
      </button>
      {ratings.map((n, i) => {
        const active = selectedRating === n;
        const burst = ratingBursts[n];
        return (
          <button
            key={n}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => setRating(n)}
            className={`relative w-[40px] h-[40px] rounded-full flex items-center justify-center text-[18px] font-semibold cursor-pointer transition-colors ${
              active
                ? "bg-brand text-white"
                : "bg-surface-soft text-black hover:bg-brand hover:text-white"
            }`}
          >
            {n}
            {burst && (
              <span
                key={burst}
                className="pointer-events-none absolute left-1/2 -top-2 text-brand text-[20px] font-bold animate-float-up"
              >
                +{n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SurveyReactionRow;
