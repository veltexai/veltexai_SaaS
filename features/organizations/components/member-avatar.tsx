import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string, email?: string | null) {
  const source = name.trim() || email?.trim() || "";
  if (!source) return "?";

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

interface MemberAvatarProps {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

/** Decorative avatar — the accessible name always comes from adjacent text. */
export function MemberAvatar({
  name,
  email,
  avatarUrl,
  className,
}: MemberAvatarProps) {
  return (
    <Avatar className={className} aria-hidden="true">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  );
}
