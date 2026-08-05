import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string | null;
  priority?: boolean;
  glow?: boolean;
};

export function Logo({
  className = "h-32 w-auto sm:h-40",
  href = "/",
  priority = false,
  glow = false,
}: LogoProps) {
  const image = (
    <Image
      src="/logo-transparent.png"
      alt="Trovaa — sua conversa, seu lugar"
      width={1024}
      height={1024}
      className={className}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
    />
  );

  const content = glow ? (
    <div className="relative inline-block">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-full bg-gradient-to-br from-fuchsia-400/25 via-violet-400/20 to-cyan-400/25 blur-2xl"
      />
      <div className="relative">{image}</div>
    </div>
  ) : (
    image
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-block transition hover:scale-[1.02] hover:opacity-95">
      {content}
    </Link>
  );
}
