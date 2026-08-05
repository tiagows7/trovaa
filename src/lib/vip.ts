import type { Profile } from "@/types/database";

export function isProfileVip(
  profile: Pick<Profile, "is_vip" | "vip_until"> | null | undefined
) {
  if (!profile?.is_vip) return false;
  if (!profile.vip_until) return true;
  return new Date(profile.vip_until) > new Date();
}
