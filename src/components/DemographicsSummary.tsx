import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import {
  hasRaceAndEthnicity,
  type RaceAndEthnicityPayload,
} from "../data/demographics";

type DemographicsSummaryProps = {
  // Name-bearing payload (the same shape saved to IndexedDB). The names are
  // rendered as-is — we never re-resolve ids against the live lists, so the
  // summary is correct even if those lists are slow, changed, or unavailable.
  value?: RaceAndEthnicityPayload;
};

const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((label) => (
      <span
        key={label}
        className="rounded-full bg-white border border-option-border text-brand text-[13px] font-medium px-3 py-1.5"
      >
        {label}
      </span>
    ))}
  </div>
);

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 font-semibold mb-1.5">
      <SmartImage
        wrapperClassName="block w-[18px] h-[18px] shrink-0"
        className="w-full h-full"
        src={toAbsoluteUrl("media/icons/gender.svg")}
        alt={title}
      />
      {title}:
    </div>
    {children}
  </div>
);

const DemographicsSummary = ({ value }: DemographicsSummaryProps) => {
  if (!hasRaceAndEthnicity(value)) return null;

  const ethnicity = value!.ethnicity;
  const subEthnicityNames = (ethnicity?.sub_ethnicities ?? []).map((s) => s.name);
  const raceNames = (value!.races ?? []).map((r) => r.name);
  const subRaceNames = (value!.races ?? []).flatMap((r) =>
    r.sub_races.map((s) => s.name)
  );
  const customRace = value!.custom_race?.trim() ?? "";

  return (
    <>
      {ethnicity && (
        <Row title="Ethnicity">
          <p className="text-[14px] text-muted">{ethnicity.name}</p>
        </Row>
      )}
      {subEthnicityNames.length > 0 && (
        <Row title="Sub-ethnicities">
          <Chips items={subEthnicityNames} />
        </Row>
      )}
      {raceNames.length > 0 && (
        <Row title="Races">
          <Chips items={raceNames} />
        </Row>
      )}
      {subRaceNames.length > 0 && (
        <Row title="Sub-races">
          <Chips items={subRaceNames} />
        </Row>
      )}
      {customRace !== "" && (
        <Row title="Custom race">
          <p className="text-[14px] text-muted">{customRace}</p>
        </Row>
      )}
    </>
  );
};

export default DemographicsSummary;
