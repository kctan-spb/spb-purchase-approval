// Placeholder SPB mark (red rounded square + "SPB"). Replace the body of this component with the
// official logo (e.g. an <Image src="/brand/spb-logo.svg" />) when the artwork is supplied;
// every screen uses this component, so nothing else needs to change.
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="SPB"
      className={className}
    >
      <rect width="48" height="48" rx="9" fill="#b01e23" />
      <rect x="3" y="3" width="42" height="42" rx="6.5" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="17"
        letterSpacing="0.5"
        fill="#ffffff"
      >
        SPB
      </text>
    </svg>
  );
}
