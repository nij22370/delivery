const INITIALS_MAX_CHARS = 2;

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, INITIALS_MAX_CHARS)
    .toUpperCase();
}

export function formatAppliedDate(createdAt: string): string {
  const date = new Date(createdAt);
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
}
