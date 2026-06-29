import { forwardRef, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import type { ScanQrProduct } from "../api";

// Resolve a product image that may be relative (admin-uploaded), absolute, or a
// data URI. Returns "" when there's no image so the caller can show a fallback.
const resolveImage = (src?: string | null) => {
  if (!src) return "";
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:")
    ? src
    : toAbsoluteUrl(src);
};

// Square thumbnail for a product — only rendered when the admin set an image.
const ProductThumb = ({ product }: { product: ScanQrProduct }) => {
  const img = resolveImage(product.image);
  if (!img) return null;
  return (
    <SmartImage
      wrapperClassName="block w-9 h-9 rounded-lg overflow-hidden shrink-0"
      className="w-full h-full object-cover"
      src={img}
      alt={product.name}
    />
  );
};

// Rounded checkbox matching the rest of the picker — filled brand square with a
// white tick when checked, soft-bordered when not. Wraps a visually-hidden
// native input so it stays keyboard/accessibility friendly.
const CheckBox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <span className="relative inline-flex shrink-0">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
    />
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 ${
        checked ? "border-brand bg-brand" : "border-border-soft bg-white"
      }`}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="m5 10.5 3.5 3.5 6.5-7"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  </span>
);

type BusinessServiceFieldProps = {
  products: ScanQrProduct[];
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  error?: boolean;
};

// "Select services (products)" field: a pill that opens a modal listing the
// business's products (with search + select-all), letting the customer pick the
// services they're giving feedback about. Mirrors the admin "Select Services"
// picker. `value` / `onChange` hold the selected product_ids.
const BusinessServiceField = forwardRef<
  HTMLButtonElement,
  BusinessServiceFieldProps
>(({ products, value, onChange, required = false, error = false }, ref) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The modal edits a local draft; nothing is committed until "Apply".
  const [draft, setDraft] = useState<string[]>(value);

  const selectedProducts = useMemo(
    () => products.filter((p) => value.includes(p.product_id)),
    [products, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((p) => draft.includes(p.product_id));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const openModal = () => {
    setDraft(value);
    setSearch("");
    setOpen(true);
  };

  const toggle = (id: string) =>
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((p) => p.product_id));
      setDraft((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      setDraft((prev) => [
        ...prev,
        ...filtered
          .map((p) => p.product_id)
          .filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
        onClick={openModal}
        className={`w-full rounded-full border bg-white px-4 py-2.5 text-sm text-left flex items-center justify-between gap-2 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 ${
          open ? "border-black ring-2 ring-black/10" : "border-border-soft"
        } ${error ? "border-red-500 animate-blink-error" : ""}`}
      >
        <span className={selectedProducts.length === 0 ? "text-placeholder" : ""}>
          {selectedProducts.length === 0
            ? "Select services (products)"
            : `${selectedProducts.length} service${
                selectedProducts.length > 1 ? "s" : ""
              } selected`}
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 6.2v7.6M6.2 10h7.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {selectedProducts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedProducts.map((p) => (
            <span
              key={p.product_id}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand text-[13px] font-medium pl-3 pr-2 py-1"
            >
              {p.name}
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => remove(p.product_id)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-brand/70 hover:bg-brand/20 hover:text-brand transition"
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Select services"
        >
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-[480px] max-h-[85vh] flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)] animate-scale-in">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-5 top-5 text-muted hover:text-black transition"
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <h2 className="text-[20px] font-bold pr-8">Select Services</h2>
            <p className="text-[13px] text-placeholder mt-1">
              Choose the products you'd like to give feedback on.
            </p>

            <div className="relative mt-4">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M14 14l3 3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full rounded-full border border-border-soft bg-surface-soft pl-11 pr-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            <label className="mt-4 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3 cursor-pointer">
              <span className="flex items-center gap-3">
                <CheckBox checked={allFilteredSelected} onChange={toggleAll} />
                <span className="font-semibold text-[15px]">Select all</span>
              </span>
              <span className="text-[13px] text-placeholder">
                {draft.length} selected
              </span>
            </label>

            <div className="mt-2 -mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-placeholder">
                  No services found.
                </p>
              ) : (
                filtered.map((p) => {
                  const checked = draft.includes(p.product_id);
                  return (
                    <label
                      key={p.product_id}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 cursor-pointer transition ${
                        checked ? "bg-brand/5" : "hover:bg-surface"
                      }`}
                    >
                      <CheckBox
                        checked={checked}
                        onChange={() => toggle(p.product_id)}
                      />
                      <ProductThumb product={p} />
                      <span className="text-[15px] text-muted-dark">
                        {p.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border-soft px-6 py-3 text-sm font-medium hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-full bg-brand px-8 py-3 text-sm font-medium text-white hover:opacity-90 active:scale-[0.98] transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
});

BusinessServiceField.displayName = "BusinessServiceField";

export default BusinessServiceField;
