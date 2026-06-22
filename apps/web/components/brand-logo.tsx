import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  size?: number;
};

export function BrandLogo({ className = "", size = 32 }: BrandLogoProps) {
  return (
    <Image
      alt=""
      aria-hidden
      className={className}
      height={size}
      priority
      src="/soreya-logo-mark.png"
      width={size}
    />
  );
}
