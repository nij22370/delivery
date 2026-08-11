const INITIALS_MAX_CHARS = 2;
const METERS_PER_MILE = 1609.344;
const MILES_FRACTION_DIGITS = 1;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

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

export function formatCompletedDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDistanceMiles(distanceM: number): string {
  const miles = distanceM / METERS_PER_MILE;
  return `${miles.toFixed(MILES_FRACTION_DIGITS)} miles`;
}

export function formatArrivalTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEtaLabel(durationS: number): string {
  if (durationS < SECONDS_PER_MINUTE) {
    return "Arriving in under a minute";
  }

  const totalMinutes = Math.round(durationS / SECONDS_PER_MINUTE);
  if (totalMinutes < MINUTES_PER_HOUR) {
    return `Arriving in ${totalMinutes} mins`;
  }

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const hourLabel = `${hours} hr${hours === 1 ? "" : "s"}`;
  if (minutes === 0) return `Arriving in ${hourLabel}`;
  return `Arriving in ${hourLabel} ${minutes} min`;
}
