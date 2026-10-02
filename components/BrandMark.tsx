// The official SPB logo (public/brand/spb-logo.png, 639x498). `size` is the rendered height in px;
// the width follows the logo's aspect ratio. Every screen uses this component.
const RATIO = 639 / 498;

export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/spb-logo.png"
      alt="SPB"
      height={size}
      width={Math.round(size * RATIO)}
      style={{ height: size, width: "auto" }}
      decoding="async"
      className={className}
    />
  );
}
