type VipBadgeProps = {
  className?: string;
};

export function VipBadge({ className = "" }: VipBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
    >
      VIP
    </span>
  );
}
