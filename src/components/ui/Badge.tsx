const VARIANTS = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-backgroundAlt text-textSecondary",
  primary: "bg-primary-soft text-primary",
} as const;

interface Props {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
  onClick?: () => void;
}

// Renders as a <button> (with a hover state) when `onClick` is passed 
// e.g. the Published/Draft badge that toggles a course's publish state 
// otherwise a plain, non-interactive <span>.
export function Badge({ variant = "neutral", children, onClick }: Props) {
  const className = `inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold transition-opacity ${VARIANTS[variant]} ${
    onClick ? "cursor-pointer hover:opacity-80" : ""
  }`;
  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}
