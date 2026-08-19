const INITIALS_MAX_CHARS = 2;
const METERS_PER_MILE = 1609.344;
const MILES_FRACTION_DIGITS = 1;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_DAY = 86_400_000;
const TODAY_LABEL = "Today";
const YESTERDAY_LABEL = "Yesterday";

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

export function formatMessageTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getChatDateLabel(createdAt: string): string {
  const messageDate = new Date(createdAt);
  const todayStart = startOfDayTimestamp(new Date());
  const messageStart = startOfDayTimestamp(messageDate);
  const dayDifference = Math.round((todayStart - messageStart) / MILLISECONDS_PER_DAY);

  if (dayDifference === 0) return TODAY_LABEL;
  if (dayDifference === 1) return YESTERDAY_LABEL;
  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function isSameCalendarDay(firstIsoDate: string, secondIsoDate: string): boolean {
  const firstDate = new Date(firstIsoDate);
  const secondDate = new Date(secondIsoDate);
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function formatNpr(amount: number): string {
  return `NPR ${amount.toLocaleString("en-NP")}`;
}

export function formatShortDate(dateStrOrDate: string | Date): string {
  const date = typeof dateStrOrDate === "string" ? new Date(dateStrOrDate) : dateStrOrDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

