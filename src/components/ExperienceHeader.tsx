type Variant = "intro" | "thanks";

type ExperienceHeaderProps = {
  variant?: Variant;
  title?: string;
  description?: string;
};

const presets: Record<
  Variant,
  { title: string; description: string; bg: string; descColor: string }
> = {
  intro: {
    title: "Tell us about your experience",
    description:
      "You scanned a Rate + React QR. Choose how you want to leave feedback",
    bg: "bg-black",
    descColor: "text-muted",
  },
  thanks: {
    title: "Thank you",
    description:
      "Your reaction and feedback have been recorded. In a real system this would now feed the vendor dashboard analytics automatically.",
    bg: "bg-success",
    descColor: "text-success-soft",
  },
};

const ExperienceHeader = ({
  variant = "intro",
  title,
  description,
}: ExperienceHeaderProps) => {
  const preset = presets[variant];
  return (
    <div
      key={variant}
      className={`${preset.bg} text-white p-6 rounded-[35px] mb-5 animate-fade-in-up transition-colors duration-300`}
    >
      <h1 className="text-[20px] leading-[1.1] font-bold mb-2">
        {title ?? preset.title}
      </h1>
      <p className={`${preset.descColor} text-[14px] leading-[1.1]`}>
        {description ?? preset.description}
      </p>
    </div>
  );
};

export default ExperienceHeader;
