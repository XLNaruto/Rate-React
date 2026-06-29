import SelectDropdown from "./SelectDropdown";
import { useDemographicsData } from "../hooks/useDemographicsData";
import {
  collectRequiredDemographicErrors,
  type DemographicsValue,
  type DemographicField,
  type EthnicityCategory,
  type RaceCategory,
} from "../data/demographics";

type EthnicityRaceFieldsProps = {
  value: DemographicsValue;
  onChange: (value: DemographicsValue) => void;
  // Optional overrides; when omitted the live API data (with static fallback)
  // is used via useDemographicsData().
  ethnicities?: EthnicityCategory[];
  races?: RaceCategory[];
  // Disambiguates input ids/labels when more than one instance is on a page.
  idPrefix?: string;
  // When true the block is mandatory (race_mode === "required"): the ethnicity,
  // sub-ethnicity, race and sub-race labels show the required marker. Custom
  // race stays optional (free text).
  required?: boolean;
  // Set after a failed submit; the message is shown under the exact level that
  // is missing (ethnicity / sub-ethnicity / race / sub-race), not at the end.
  error?: string;
};

const Pill = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
      active
        ? "bg-brand text-white"
        : "bg-surface-soft text-muted-dark border border-border-soft hover:border-brand"
    }`}
  >
    {label}
  </button>
);

const EthnicityRaceFields = ({
  value,
  onChange,
  ethnicities: ethnicitiesProp,
  races: racesProp,
  idPrefix = "demographics",
  required = false,
  error,
}: EthnicityRaceFieldsProps) => {
  const reqClass = required ? "required" : "";
  const live = useDemographicsData();
  const ethnicities = ethnicitiesProp ?? live.ethnicities;
  const races = racesProp ?? live.races;
  // After a failed submit (error set), show a message under EVERY missing
  // required level — not just the first — so each section flags itself.
  const fieldErrors: Partial<Record<DemographicField, string>> = error
    ? collectRequiredDemographicErrors(value, ethnicities, races)
    : {};
  const fieldError = (field: DemographicField) =>
    fieldErrors[field] ? (
      <p className="mt-1.5 text-xs text-red-500">{fieldErrors[field]}</p>
    ) : null;
  const selectedEthnicity = ethnicities.find(
    (e) => e.categoryId === value.ethnicityCategoryId
  );
  const selectedRaces = races.filter((r) =>
    value.raceCategoryIds.includes(r.categoryId)
  );
  // Sub-races available across every currently-selected race category.
  const availableSubRaces = selectedRaces.flatMap((r) => r.subRaces);

  const setEthnicity = (categoryId: number | null) => {
    // Switching ethnicity invalidates the prior sub-ethnicity picks.
    onChange({ ...value, ethnicityCategoryId: categoryId, subEthnicityIds: [] });
  };

  const toggleSubEthnicity = (id: number) => {
    const has = value.subEthnicityIds.includes(id);
    onChange({
      ...value,
      subEthnicityIds: has
        ? value.subEthnicityIds.filter((x) => x !== id)
        : [...value.subEthnicityIds, id],
    });
  };

  const toggleRace = (categoryId: number) => {
    const has = value.raceCategoryIds.includes(categoryId);
    if (has) {
      // Deselecting a race also drops any of its sub-races that were picked.
      const removed = races.find((r) => r.categoryId === categoryId);
      const removedSubIds = new Set((removed?.subRaces ?? []).map((s) => s.id));
      onChange({
        ...value,
        raceCategoryIds: value.raceCategoryIds.filter((x) => x !== categoryId),
        subRaceIds: value.subRaceIds.filter((x) => !removedSubIds.has(x)),
      });
    } else {
      onChange({
        ...value,
        raceCategoryIds: [...value.raceCategoryIds, categoryId],
      });
    }
  };

  const toggleSubRace = (id: number) => {
    const has = value.subRaceIds.includes(id);
    onChange({
      ...value,
      subRaceIds: has
        ? value.subRaceIds.filter((x) => x !== id)
        : [...value.subRaceIds, id],
    });
  };

  return (
    <>
      {/* Ethnicity — single select */}
      <div className="mb-5">
        <label className={`field-label ${reqClass}`}>Ethnicity</label>
        <SelectDropdown
          id={`${idPrefix}-ethnicity`}
          value={
            value.ethnicityCategoryId != null
              ? String(value.ethnicityCategoryId)
              : ""
          }
          onChange={(v) => setEthnicity(v ? Number(v) : null)}
          options={ethnicities.map((e) => ({
            label: e.categoryName,
            value: String(e.categoryId),
          }))}
          placeholder="Select your ethnicity"
        />
        {fieldError("ethnicity")}
      </div>

      {/* Sub-ethnicities — only when the picked ethnicity has them; multi select */}
      {selectedEthnicity && selectedEthnicity.subEthnicities.length > 0 && (
        <div className="mb-5">
          <label className={`field-label ${reqClass}`}>Sub-ethnicities</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedEthnicity.subEthnicities.map((s) => (
              <Pill
                key={s.id}
                label={s.name}
                active={value.subEthnicityIds.includes(s.id)}
                onClick={() => toggleSubEthnicity(s.id)}
              />
            ))}
          </div>
          {fieldError("subEthnicity")}
        </div>
      )}

      {/* Races — multi select */}
      <div className="mb-5">
        <label className={`field-label ${reqClass}`}>Races</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {races.map((r) => (
            <Pill
              key={r.categoryId}
              label={r.categoryName}
              active={value.raceCategoryIds.includes(r.categoryId)}
              onClick={() => toggleRace(r.categoryId)}
            />
          ))}
        </div>
        {fieldError("race")}
      </div>

      {/* Sub-races — only when a selected race has them; multi select */}
      {availableSubRaces.length > 0 && (
        <div className="mb-5">
          <label className={`field-label ${reqClass}`}>Sub-races</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableSubRaces.map((s) => (
              <Pill
                key={s.id}
                label={s.name}
                active={value.subRaceIds.includes(s.id)}
                onClick={() => toggleSubRace(s.id)}
              />
            ))}
          </div>
          {fieldError("subRace")}
        </div>
      )}

      {/* Custom race — free text */}
      <div className="mb-5">
        <label className="field-label" htmlFor={`${idPrefix}-custom-race`}>
          Custom race
        </label>
        <input
          id={`${idPrefix}-custom-race`}
          type="text"
          placeholder="Custom race"
          value={value.customRace}
          onChange={(e) => onChange({ ...value, customRace: e.target.value })}
          className="field-input"
        />
      </div>
    </>
  );
};

export default EthnicityRaceFields;
