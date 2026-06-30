import { toAbsoluteUrl } from "../utils/Assets";
import SmartImage from "./SmartImage";
import DemographicsSummary from "./DemographicsSummary";
import type { RaceAndEthnicityPayload } from "../data/demographics";

type FeedbackSummaryProps = {
  reaction: string;
  // Resolved reaction display info (dynamic, per-vendor). `reaction` stays the
  // stable type identifier; these drive what the chip actually shows.
  reactionLabel?: string;
  reactionMediaUrl?: string;
  reactionBg?: string;
  rating: number;
  email?: string;
  age?: string;
  gender?: string;
  postalCode?: string;
  services?: string[];
  description?: string;
  raceAndEthnicity?: RaceAndEthnicityPayload;
};

const FeedbackSummary = ({
  reaction,
  reactionLabel,
  reactionMediaUrl,
  reactionBg,
  rating,
  email,
  age,
  gender,
  postalCode,
  services,
  description,
  raceAndEthnicity,
}: FeedbackSummaryProps) => {
  return (
    <div className="border border-success bg-success-tint rounded-[30px] p-5  animate-scale-in">
      <div className="inline-flex items-center border border-success rounded-full px-2 py-1.5 mb-5 animate-pop [animation-delay:200ms]">
        <span
          style={{ backgroundColor: reactionBg }}
          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 border-white"
        >
          {reactionMediaUrl && (
            <SmartImage
              className="w-[30px] h-[30px] object-contain"
              wrapperClassName="rounded-full"
              src={reactionMediaUrl}
              alt={reactionLabel ?? reaction}
            />
          )}
        </span>
        <span className="-ml-2 w-12 h-12 rounded-full flex items-center justify-center bg-chip text-black border-2 border-white text-[18px] font-semibold">
          {rating}
        </span>
      </div>

      {services && services.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 font-semibold mb-1.5">
            <SmartImage
              wrapperClassName="block w-[18px] h-[18px] shrink-0"
              className="w-full h-full"
              src={toAbsoluteUrl("media/icons/filter-mail-edit.svg")}
              alt="business service"
            />
            Business Service:
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((name) => (
              <span
                key={name}
                className="rounded-full bg-white border border-option-border text-brand text-[13px] font-medium px-3 py-1.5"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {email && (
        <div className="mb-5">
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
        <div className="mb-5">
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
        <div className="mb-5">
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
        <div className="mb-5">
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
        <div className="mb-5">
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

export default FeedbackSummary;
