import { useEffect, useState } from "react";
import { getEthnicities, getRaces } from "../api";
import {
  ETHNICITIES,
  RACES,
  type EthnicityCategory,
  type RaceCategory,
} from "../data/demographics";

type DemographicsData = {
  ethnicities: EthnicityCategory[];
  races: RaceCategory[];
};

// Module-level cache so the two lists are fetched once per session and shared
// across every <EthnicityRaceFields> / <DemographicsSummary> on the page.
let cache: DemographicsData | null = null;
let inflight: Promise<DemographicsData> | null = null;

// Live ethnicity & race reference data. Falls back to the bundled static lists
// while loading or if the API returns nothing, so the form is never left with
// empty/unusable selectors.
export const useDemographicsData = (): DemographicsData => {
  const [data, setData] = useState<DemographicsData | null>(cache);

  useEffect(() => {
    if (cache) {
      setData(cache);
      return;
    }
    let cancelled = false;
    inflight ??= Promise.all([getEthnicities(), getRaces()]).then(
      ([ethnicities, races]) => {
        cache = { ethnicities, races };
        return cache;
      }
    );
    inflight.then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ethnicities: data?.ethnicities?.length ? data.ethnicities : ETHNICITIES,
    races: data?.races?.length ? data.races : RACES,
  };
};
