import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import type { SurveyQuestion } from "./SurveyForm";
import type { SurveyRateReactValue } from "./SurveyReactionRow";
import DemographicsSummary from "./DemographicsSummary";
import {
  hasRaceAndEthnicity,
  type RaceAndEthnicityPayload,
} from "../data/demographics";

const reactionMap: Record<string, { gif: string; bg: string; size: number }> = {
  like: { gif: "media/reactions/like.gif", bg: "bg-react-like", size: 25 },
  love: { gif: "media/reactions/love.gif", bg: "bg-react-love", size: 30 },
  fire: { gif: "media/reactions/fire.gif", bg: "bg-react-fire", size: 32 },
  sad: { gif: "media/reactions/sad.gif", bg: "bg-react-sad", size: 32 },
  haha: { gif: "media/reactions/haha.gif", bg: "bg-react-haha", size: 34 },
  wow: { gif: "media/reactions/wow.gif", bg: "bg-react-wow", size: 34 },
  angry: { gif: "media/reactions/angry.gif", bg: "bg-react-angry", size: 34 },
};

type SurveySummaryProps = {
  questions: SurveyQuestion[];
  answers: Record<string, any>;
  rrAnswers: Record<string, SurveyRateReactValue>;
  email?: string;
  age?: string;
  gender?: string;
  postalCode?: string;
  description?: string;
  raceAndEthnicity?: RaceAndEthnicityPayload;
};

const SectionDivider = () => <div className="h-[1px] bg-[#D8F4E8] my-5" />;

const RateReactPill = ({
  reaction,
  rating,
}: {
  reaction: string;
  rating: number | null;
}) => {
  const r = reactionMap[reaction];
  if (!r) return null;
  return (
    <div className="inline-flex items-center border border-success rounded-full px-2 py-1.5">
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-white ${r.bg}`}
      >
        <SmartImage
          style={{ width: r.size, height: r.size }}
          className="object-contain"
          wrapperClassName="rounded-full"
          src={toAbsoluteUrl(r.gif)}
          alt={reaction}
        />
      </span>
      {rating != null && (
        <span className="-ml-2 w-10 h-10 rounded-full flex items-center justify-center bg-chip text-black border-2 border-white text-[16px] font-semibold">
          {rating}
        </span>
      )}
    </div>
  );
};

const SurveySummary = ({
  questions,
  answers,
  rrAnswers,
  email,
  age,
  gender,
  postalCode,
  description,
  raceAndEthnicity,
}: SurveySummaryProps) => {
  return (
    <div className="border border-success bg-success-tint rounded-[30px] p-5 animate-scale-in">
      <h1 className="text-[20px] font-bold mb-5">Thanks! Here's Your Response</h1>

      {questions.map((q, idx) => {
        const a = answers[q.id];
        const rr = rrAnswers[q.id];
        return (
          <div key={q.id}>
            {idx > 0 && <SectionDivider />}
            <div>
              <p className="font-semibold text-[14px] mb-1.5">
                Question {idx + 1}
              </p>
              <p className="text-placeholder text-[14px] mb-3">{q.text}</p>

              {q.type === "multiple_choice" && Array.isArray(a) && a.length > 0 && (
                <div className="space-y-2 mb-3">
                  {a.map((c: string) => (
                    <div
                      key={c}
                      className="rounded-full bg-white border border-option-border text-brand text-[14px] font-medium px-4 py-2.5"
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}

              {q.type === "open_text" && typeof a === "string" && a.trim() !== "" && (
                <div className="rounded-2xl bg-white border border-option-border text-option-text text-[13px] px-4 py-3 leading-normal mb-3">
                  {a}
                </div>
              )}

              {rr?.reaction && (
                <RateReactPill reaction={rr.reaction} rating={rr.rating ?? null} />
              )}
            </div>
          </div>
        );
      })}

      {(email ||
        age ||
        gender ||
        postalCode ||
        description ||
        hasRaceAndEthnicity(raceAndEthnicity)) && <SectionDivider />}

      {email && (
        <div className="mb-4">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/mail-at-sign.svg")}
              alt="email"
            />
            Email:
          </div>
          <p className="text-[14px] text-muted">{email}</p>
        </div>
      )}

      {age && (
        <div className="mb-4">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/age.svg")}
              alt="age"
            />
            Age:
          </div>
          <p className="text-[14px] text-muted">{age}</p>
        </div>
      )}

      {gender && (
        <div className="mb-4">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/gender.svg")}
              alt="gender"
            />
            Gender:
          </div>
          <p className="text-[14px] text-muted capitalize">{gender}</p>
        </div>
      )}

      {postalCode && (
        <div className="mb-4">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/age.svg")}
              alt="postal code"
            />
            Postal Code:
          </div>
          <p className="text-[14px] text-muted">{postalCode}</p>
        </div>
      )}

      {description && (
        <div>
          <div className="flex items-center gap-2 font-semibold mb-1">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/quill-write.svg")}
              alt="description"
            />
            Description:
          </div>
          <p className="text-[14px] text-muted">{description}</p>
        </div>
      )}

      {raceAndEthnicity && <DemographicsSummary value={raceAndEthnicity} />}
    </div>
  );
};

export default SurveySummary;
