import { apiHeader, getData, postData } from "../utils/ApiHelper";
import {
  mapEthnicityTree,
  mapRaceTree,
  type RaceAndEthnicityPayload,
  type DemographicTreeNode,
  type EthnicityCategory,
  type RaceCategory,
} from "../data/demographics";

// Outcome of a scan-qr fetch. The caller branches on `status` so it can tell a
// genuine "this QR doesn't exist" (404) apart from a transient failure or a
// rate-limit — they need very different handling on the page.
export type ScanQrResult =
  | { status: "ok"; data: any }
  | { status: "not_found" } // 404 — invalid/expired slug, drop any cached page
  // 403 — the slug is valid but the QR is closed to responses right now
  // (paused / outside its schedule / response cap reached). `code` and
  // `message` come straight from the API so the page can show its reason.
  | { status: "closed"; code: string; message: string }
  | { status: "rate_limited" } // 429 — the global gate takes over
  | { status: "error" }; // network/5xx — keep whatever's cached

// GET /public/scan-qr/{slug}
export const getScanQr = async (slug: string): Promise<ScanQrResult> => {
  const response: any = await getData(
    `public/scan-qr/${encodeURIComponent(slug)}`,
    {},
    apiHeader(false),
  );

  const code = Number(response?.status);
  if (code === 200) return { status: "ok", data: response.data };
  if (code === 404) return { status: "not_found" };
  if (code === 403) {
    const body = response?.data ?? {};
    return {
      status: "closed",
      code: String(body.error ?? "SCAN_NOT_ACCEPTING"),
      message: String(
        body.message ?? "This QR code is not accepting responses right now.",
      ),
    };
  }
  if (code === 429) return { status: "rate_limited" };

  console.log("getScanQr failed:", response?.data?.message ?? response?.status);
  return { status: "error" };
};

// A reaction the customer can pick, configured per-vendor in the admin panel and
// delivered inline with the scan-qr payload (`data.reactions`). `type` is the
// stable identifier sent back on submit; `media_url` is a full CDN url and
// `background_color` a hex string applied as the chip's background.
export type ScanQrReaction = {
  reaction_id: string;
  type: string;
  label: string;
  media_url: string;
  background_color: string;
  display_order: number;
};

// A selectable business service/product offered to customers on a business QR.
// `image` is optional — it's set from the admin panel and may be absent.
export type ScanQrProduct = {
  product_id: string;
  name: string;
  image?: string | null;
};

// GET /public/scan-qr/{slug}/products  — the services a customer can pick from
// on a business QR. Returns [] on any non-200 so the caller can render the rest
// of the form regardless (the field just shows no options).
export const getScanQrProducts = async (
  slug: string,
): Promise<ScanQrProduct[]> => {
  const response: any = await getData(
    `public/scan-qr/${encodeURIComponent(slug)}/products`,
    {},
    apiHeader(false),
  );

  if (Number(response?.status) === 200) {
    // The endpoint may return a bare array or wrap it in { data: [...] }.
    const body = response?.data;
    const list = Array.isArray(body) ? body : body?.data;
    if (Array.isArray(list)) return list as ScanQrProduct[];
  }
  return [];
};

// Pull the category tree out of a demographics response. The endpoint returns
// the array under `data` ({ data: [...] }), but we also accept a bare array or
// a `tree` key so a backend shape tweak won't silently break the fields.
const extractTree = (body: any): DemographicTreeNode[] | null => {
  const list = Array.isArray(body) ? body : (body?.data ?? body?.tree);
  return Array.isArray(list) ? (list as DemographicTreeNode[]) : null;
};

// GET /public/ethnicity — ethnicity categories (+ sub-ethnicities as children).
// Returns [] on any non-200 so the caller can fall back to its defaults.
export const getEthnicities = async (): Promise<EthnicityCategory[]> => {
  const response: any = await getData("public/ethnicity", {}, apiHeader(false));
  if (Number(response?.status) === 200) {
    const tree = extractTree(response?.data);
    if (tree) return mapEthnicityTree(tree);
  }
  return [];
};

// GET /public/race — race categories (+ sub-races as children).
export const getRaces = async (): Promise<RaceCategory[]> => {
  const response: any = await getData("public/race", {}, apiHeader(false));
  if (Number(response?.status) === 200) {
    const tree = extractTree(response?.data);
    if (tree) return mapRaceTree(tree);
  }
  return [];
};

// POST /public/reviews  — vendor (business), product & survey feedback save

// vendor (business) & product feedback
export type QrReviewPayload = {
  kind: "business_qr" | "product_qr";
  qr_code_id: string;
  rating: number;
  reaction: string;
  description?: string;
  email?: string;
  gender?: string;
  age?: number;
  postal_code?: string;
  // IDs of the business services the customer selected (business QR only).
  product_ids?: string[];
  race_and_ethnicity?: RaceAndEthnicityPayload;
};

// per-question answer inside a survey submission
export type SurveyAnswer = {
  survey_question_id: string;
  rating: number | null;
  reaction: string | null;
  answer:
    | { type: "reaction"; value: string | null }
    | { type: "rating_1_5"; value: number | null }
    | { type: "open_text"; text: string }
    | { type: "multiple_choice"; selected: string[] };
};

// survey feedback
export type SurveyReviewPayload = {
  kind: "survey";
  survey_id: string;
  description?: string;
  email?: string;
  gender?: string;
  age?: number;
  postal_code?: string;
  race_and_ethnicity?: RaceAndEthnicityPayload;
  answers: SurveyAnswer[];
};

export type ReviewPayload = QrReviewPayload | SurveyReviewPayload;

export const submitReview = async (payload: ReviewPayload) => {
  const response: any = await postData(
    "public/reviews",
    payload,
    apiHeader(false),
  );
  return response;
};
