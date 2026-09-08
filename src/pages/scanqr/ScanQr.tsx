import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ExperienceHeader from "../../components/ExperienceHeader";
import BusinessDetails from "../../components/BusinessDetails";
import FeedbackForm from "../../components/FeedbackForm";
import SurveyForm from "../../components/SurveyForm";
import SmartImage from "../../components/SmartImage";
import SkeletonReaction from "../../components/SkeletonReaction";
import InvalidQr from "../../components/InvalidQr";
import ScanClosed from "../../components/ScanClosed";
import { toAbsoluteUrl } from "../../utils/Assets";
import { getScanQr } from "../../api";
import {
  getSubmission,
  getQrData,
  saveQrData,
  removeQrData,
} from "../../utils/SubmissionStore";
import { isRateLimited } from "../../utils/RateLimit";

const BLANK_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23f5f5f5'/><stop offset='100%25' stop-color='%23e5e5e5'/></linearGradient></defs><rect width='200' height='200' fill='url(%23bg)'/><g opacity='0.5'><circle cx='30' cy='30' r='3' fill='%23999999'/><circle cx='170' cy='40' r='2' fill='%23bbbbbb'/><circle cx='40' cy='170' r='2.5' fill='%23aaaaaa'/><circle cx='175' cy='165' r='3' fill='%23999999'/></g><g transform='translate(100 100)'><rect x='-46' y='-46' width='92' height='92' rx='16' fill='%23ffffff' opacity='0.9'/><rect x='-46' y='-46' width='92' height='92' rx='16' fill='none' stroke='%23111111' stroke-width='2.5'/><circle cx='-18' cy='-18' r='8' fill='%23111111'/><path d='M-46 18 L-20 -4 L0 12 L20 -8 L46 16 L46 38 L-46 38 Z' fill='%23111111' opacity='0.85'/></g></svg>";

const resolveSrc = (src: string) =>
  !src
    ? BLANK_IMAGE
    : /^(https?:)?\/\//i.test(src) || src.startsWith("data:")
      ? src
      : toAbsoluteUrl(src);

const ScanQr = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  // Set when the API answers 403: the slug is valid but the QR isn't taking
  // responses right now. Takes precedence over any cached page below.
  const [closed, setClosed] = useState<{
    code: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Instant paint from IndexedDB: if we already cached this QR's page
      //    data and the user's submission, render right away — no skeleton.
      //    The leading await also keeps every setState below off the effect's
      //    synchronous path (react-hooks/set-state-in-effect).
      const [cached, saved] = await Promise.all([
        slug ? getQrData(slug) : Promise.resolve(null),
        slug ? getSubmission(slug) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (cached) {
        setData(cached);
        if (saved) {
          setSubmission(saved.payload);
          setSubmitted(true);
        }
        setLoading(false);
      }

      // 2) Revalidate from the network (stale-while-revalidate). On the very
      //    first visit there's no cache, so this is what hides the skeleton.
      //    Skip it entirely while a rate-limit window is open — the gate is
      //    already covering the page and the request would just 429 again.
      const result = slug && !isRateLimited() ? await getScanQr(slug) : null;
      if (cancelled) return;
      if (result?.status === "ok") {
        setData(result.data);
        saveQrData(slug, result.data);
        if (!cached && saved) {
          setSubmission(saved.payload);
          setSubmitted(true);
        }
      } else if (result?.status === "closed") {
        // Valid slug, but responses are off. Keep the cached page in IndexedDB
        // (it's still the right page once the business reopens) and show the
        // reason the API gave us instead of the form.
        setClosed({ code: result.code, message: result.message });
      } else if (result?.status === "not_found") {
        // The QR is genuinely gone: drop the stale cache so it can't keep
        // painting on later refreshes, and fall through to <InvalidQr/>.
        await removeQrData(slug);
        if (cancelled) return;
        setData(null);
      }
      // "rate_limited" / "error" / skipped: keep whatever we already have
      // (cached page or skeleton) and let the gate/retry handle it.
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <SkeletonReaction />;
  if (closed) return <ScanClosed code={closed.code} message={closed.message} />;
  if (!data) return <InvalidQr />;

  const { kind, qr, vendor, product, survey } = data;
  const logo = resolveSrc(vendor?.logo_url);
  const qrCodeId = data.qr_code_id ?? qr?.qr_code_id ?? qr?.id ?? "";
  const surveyId = data.survey_id ?? survey?.id ?? "";
  const handleSubmitted = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SURVEY
  if (kind === "survey" || kind === "survey_qr") {
    return (
      <div className="w-full p-4">
        <div className="sm:w-[370px] mx-auto">
          <ExperienceHeader variant={submitted ? "thanks" : "intro"} />
          <div className="mb-5 animate-fade-in-up [animation-delay:80ms]">
            <h5 className="text-center text-placeholder text-[14px] mb-2">
              Business
            </h5>
            <SmartImage
              wrapperClassName="block mx-auto w-[90px] h-[90px] rounded-full"
              className="w-full h-full object-cover rounded-full"
              src={logo}
              alt={vendor?.business_name}
            />
            <h1 className="text-[20px] font-bold text-center mt-2">
              {vendor?.business_name}
            </h1>
          </div>

          <div className="survey-card mb-5 animate-fade-in-up [animation-delay:160ms]">
            <h1 className="font-bold text-[18px] mb-4">Survey</h1>
            <div className="flex items-center gap-3">
              <SmartImage
                wrapperClassName="block w-[24px] h-[24px] shrink-0"
                className="w-full h-full"
                src={toAbsoluteUrl("media/icons/filter-mail-edit.svg")}
                alt="survey"
              />
              <p className="text-[14px]">{survey?.name}</p>
            </div>
          </div>

          <SurveyForm
            onSubmitted={handleSubmitted}
            surveyId={surveyId}
            slug={slug}
            initialSubmission={submission}
            questions={survey?.questions ?? []}
            userInfoModes={data.user_info_modes}
            reactions={data.reactions ?? []}
          />
        </div>
      </div>
    );
  }

  // PRODUCT
  if (kind === "product_qr" || qr?.type === "product") {
    return (
      <div className="w-full p-4">
        <div className="sm:w-[370px] mx-auto">
          <ExperienceHeader variant={submitted ? "thanks" : "intro"} />
          <BusinessDetails
            key={submitted ? "thanks" : "intro"}
            variant="product"
            logo={logo}
            name={vendor?.business_name}
            productImage={resolveSrc(product?.image)}
            productName={product?.name ?? qr.name}
          />
          <FeedbackForm
            onSubmitted={handleSubmitted}
            kind="product_qr"
            qrCodeId={qrCodeId}
            slug={slug}
            initialSubmission={submission}
            userInfoModes={data.user_info_modes}
            reactions={data.reactions ?? []}
            reviewQuestion={qr?.review_question}
          />
        </div>
      </div>
    );
  }

  // BUSINESS (default)
  return (
    <div className="w-full p-4">
      <div className="sm:w-[370px] mx-auto">
        <ExperienceHeader variant={submitted ? "thanks" : "intro"} />
        <BusinessDetails
          key={submitted ? "thanks" : "intro"}
          variant="business"
          logo={logo}
          name={vendor?.business_name}
          location={data.location_name ?? ""}
          about={vendor?.about_business ?? ""}
          website={vendor?.business_link ?? ""}
          socialLinks={vendor?.social_links ?? {}}
        />
        <FeedbackForm
          onSubmitted={handleSubmitted}
          kind="business_qr"
          qrCodeId={qrCodeId}
          slug={slug}
          initialSubmission={submission}
          userInfoModes={data.user_info_modes}
          reactions={data.reactions ?? []}
          reviewQuestion={qr?.review_question}
        />
      </div>
    </div>
  );
};

export default ScanQr;
