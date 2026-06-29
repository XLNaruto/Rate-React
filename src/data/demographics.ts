// Ethnicity & race reference data.
//
// These two lists currently hold STATIC sample data so the new demographic
// fields can be previewed/tested without a backend. The shape mirrors the API
// responses 1:1 (see the `ethnicities` / `races` payloads), so swapping to a
// live fetch later is just replacing the constants — no consumer changes.

export type SubEthnicity = { id: number; name: string };

export type EthnicityCategory = {
  categoryId: number;
  categoryName: string;
  subEthnicities: SubEthnicity[];
};

export type SubRace = { id: number; name: string };

export type RaceCategory = {
  categoryId: number;
  categoryName: string;
  subRaces: SubRace[];
};

// Raw node shape returned by GET /public/ethnicity and /public/race: a tree of
// categories (top level) each with their sub-items as `children`.
export type DemographicTreeNode = {
  id: number;
  type: string;
  parent_id: number | null;
  name: string;
  sort_order: number;
  children?: DemographicTreeNode[];
};

const bySortOrder = (a: DemographicTreeNode, b: DemographicTreeNode) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0);

// Map the API tree to the category/sub shapes the UI consumes, honouring the
// admin-defined `sort_order` at both levels.
export const mapEthnicityTree = (
  tree: DemographicTreeNode[]
): EthnicityCategory[] =>
  [...tree].sort(bySortOrder).map((n) => ({
    categoryId: n.id,
    categoryName: n.name,
    subEthnicities: [...(n.children ?? [])]
      .sort(bySortOrder)
      .map((c) => ({ id: c.id, name: c.name })),
  }));

export const mapRaceTree = (tree: DemographicTreeNode[]): RaceCategory[] =>
  [...tree].sort(bySortOrder).map((n) => ({
    categoryId: n.id,
    categoryName: n.name,
    subRaces: [...(n.children ?? [])]
      .sort(bySortOrder)
      .map((c) => ({ id: c.id, name: c.name })),
  }));

export const ETHNICITIES: EthnicityCategory[] = [
  {
    categoryId: 1,
    categoryName: "Hispanic or Latino",
    subEthnicities: [
      { id: 1, name: "Mexican" },
      { id: 2, name: "Cuban" },
      { id: 3, name: "Puerto Rican" },
      { id: 4, name: "South or Central American" },
    ],
  },
  {
    categoryId: 2,
    categoryName: "Not Hispanic or Latino",
    subEthnicities: [],
  },
];

export const RACES: RaceCategory[] = [
  {
    categoryId: 6,
    categoryName: "African",
    subRaces: [
      { id: 6, name: "Northern African" },
      { id: 7, name: "West African" },
      { id: 8, name: "South African" },
      { id: 9, name: "East African" },
    ],
  },
  {
    categoryId: 3,
    categoryName: "American Indian or Alaska Native",
    subRaces: [],
  },
  {
    categoryId: 4,
    categoryName: "Asian",
    subRaces: [
      { id: 1, name: "Indian" },
      { id: 2, name: "Chinese" },
      { id: 3, name: "Filipino" },
      { id: 4, name: "Vietnamese" },
      { id: 5, name: "Japanese" },
    ],
  },
  {
    categoryId: 2,
    categoryName: "Black or African American",
    subRaces: [],
  },
  {
    categoryId: 5,
    categoryName: "Native Hawaiian or Other Pacific Islander",
    subRaces: [],
  },
  {
    categoryId: 1,
    categoryName: "White",
    subRaces: [],
  },
];

// The value collected by <EthnicityRaceFields>. IDs reference the category/sub
// records above; `customRace` is free text. Everything is optional.
export type DemographicsValue = {
  ethnicityCategoryId: number | null;
  subEthnicityIds: number[];
  raceCategoryIds: number[];
  subRaceIds: number[];
  customRace: string;
};

export const emptyDemographics: DemographicsValue = {
  ethnicityCategoryId: null,
  subEthnicityIds: [],
  raceCategoryIds: [],
  subRaceIds: [],
  customRace: "",
};

// True when any demographic field has been filled — used to decide whether to
// render a summary block / include the data in a payload.
export const hasDemographics = (v: DemographicsValue): boolean =>
  v.ethnicityCategoryId != null ||
  v.subEthnicityIds.length > 0 ||
  v.raceCategoryIds.length > 0 ||
  v.subRaceIds.length > 0 ||
  v.customRace.trim() !== "";

// Which level of the ethnicity/race block a required-validation error belongs
// to, so the form can render the message under that exact section.
export type DemographicField =
  | "ethnicity"
  | "subEthnicity"
  | "race"
  | "subRace";

export type DemographicError = { field: DemographicField; message: string };

// Validate the demographic selection when ethnicity/race is *required*. Each
// level is enforced only when it actually has options to pick: a sub-level is
// required only if the chosen parent exposes sub-items. Returns the first
// failing level (top-down) with its message, or null when everything is filled.
export const validateRequiredDemographics = (
  v: DemographicsValue,
  ethnicities: EthnicityCategory[],
  races: RaceCategory[]
): DemographicError | null => {
  // Ethnicity (+ its sub-ethnicities when the chosen ethnicity has any).
  if (v.ethnicityCategoryId == null)
    return { field: "ethnicity", message: "Please select your ethnicity." };
  const ethnicity = ethnicities.find(
    (e) => e.categoryId === v.ethnicityCategoryId
  );
  if (
    ethnicity &&
    ethnicity.subEthnicities.length > 0 &&
    !ethnicity.subEthnicities.some((s) => v.subEthnicityIds.includes(s.id))
  )
    return {
      field: "subEthnicity",
      message: "Please select your sub-ethnicity.",
    };

  // Race (at least one) + a sub-race for every chosen race that has sub-items.
  if (v.raceCategoryIds.length === 0)
    return { field: "race", message: "Please select your race." };
  const selectedRaces = races.filter((r) =>
    v.raceCategoryIds.includes(r.categoryId)
  );
  const missingSubRace = selectedRaces.some(
    (r) =>
      r.subRaces.length > 0 &&
      !r.subRaces.some((s) => v.subRaceIds.includes(s.id))
  );
  if (missingSubRace)
    return { field: "subRace", message: "Please select your sub-race." };

  return null;
};

// Like the above, but reports EVERY missing required level at once (not just
// the first) so each section can show its own inline message. Each level is
// still only enforced when it actually has options to pick.
export const collectRequiredDemographicErrors = (
  v: DemographicsValue,
  ethnicities: EthnicityCategory[],
  races: RaceCategory[]
): Partial<Record<DemographicField, string>> => {
  const errors: Partial<Record<DemographicField, string>> = {};

  // Ethnicity (+ its sub-ethnicities when the chosen ethnicity has any).
  if (v.ethnicityCategoryId == null) {
    errors.ethnicity = "Please select your ethnicity.";
  } else {
    const ethnicity = ethnicities.find(
      (e) => e.categoryId === v.ethnicityCategoryId
    );
    if (
      ethnicity &&
      ethnicity.subEthnicities.length > 0 &&
      !ethnicity.subEthnicities.some((s) => v.subEthnicityIds.includes(s.id))
    )
      errors.subEthnicity = "Please select your sub-ethnicity.";
  }

  // Race (at least one) + a sub-race for every chosen race that has sub-items.
  if (v.raceCategoryIds.length === 0) {
    errors.race = "Please select your race.";
  } else {
    const selectedRaces = races.filter((r) =>
      v.raceCategoryIds.includes(r.categoryId)
    );
    const missingSubRace = selectedRaces.some(
      (r) =>
        r.subRaces.length > 0 &&
        !r.subRaces.some((s) => v.subRaceIds.includes(s.id))
    );
    if (missingSubRace) errors.subRace = "Please select your sub-race.";
  }

  return errors;
};

// Shape sent to the API under `race_and_ethnicity`: full id+name objects (not
// just ids) so the backend stores readable labels alongside the references.
export type NamedItem = { id: number; name: string };

export type RaceAndEthnicityPayload = {
  ethnicity?: NamedItem & { sub_ethnicities: NamedItem[] };
  races?: Array<NamedItem & { sub_races: NamedItem[] }>;
  custom_race?: string;
};

// True when the name-bearing payload carries anything to show. Used by the
// summaries, which render straight from these stored names (no id lookup).
export const hasRaceAndEthnicity = (p?: RaceAndEthnicityPayload): boolean =>
  !!p &&
  (!!p.ethnicity ||
    !!(p.races && p.races.length) ||
    !!(p.custom_race && p.custom_race.trim() !== ""));

// Build the `race_and_ethnicity` payload, resolving the selected ids to their
// names via the reference lists. Empty parts are omitted; returns undefined
// when nothing was filled so callers can spread it conditionally.
export const buildRaceAndEthnicityPayload = (
  v: DemographicsValue,
  ethnicities: EthnicityCategory[],
  races: RaceCategory[]
): RaceAndEthnicityPayload | undefined => {
  if (!hasDemographics(v)) return undefined;

  const ethnicityCat = ethnicities.find(
    (e) => e.categoryId === v.ethnicityCategoryId
  );
  const ethnicity = ethnicityCat
    ? {
        id: ethnicityCat.categoryId,
        name: ethnicityCat.categoryName,
        sub_ethnicities: ethnicityCat.subEthnicities
          .filter((s) => v.subEthnicityIds.includes(s.id))
          .map((s) => ({ id: s.id, name: s.name })),
      }
    : undefined;

  const selectedRaces = races
    .filter((r) => v.raceCategoryIds.includes(r.categoryId))
    .map((r) => ({
      id: r.categoryId,
      name: r.categoryName,
      sub_races: r.subRaces
        .filter((s) => v.subRaceIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
    }));

  const custom = v.customRace.trim();

  return {
    ...(ethnicity ? { ethnicity } : {}),
    ...(selectedRaces.length ? { races: selectedRaces } : {}),
    ...(custom ? { custom_race: custom } : {}),
  };
};
