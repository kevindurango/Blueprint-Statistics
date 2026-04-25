export type EventStatus = "completed" | "upcoming";

export type EventItem = {
  id: string;
  name: string;
  date: string;
  group: string;
  status: EventStatus;
  registrations: number;
  attendees: number;
};

const seedBase = [
  [
    "Palmerston North NRoB",
    "2026-03-01",
    "Events Completed",
    "completed",
    180,
    53,
  ],
  ["Parramatta", "2026-03-16", "Events Completed", "completed", 386, 159],
  ["Sydney (20th)", "2026-03-20", "Events Completed", "completed", 703, 312],
  ["Gold Coast", "2026-03-24", "Events Completed", "completed", 460, 196],
  ["Brisbane (Mar)", "2026-03-26", "Events Completed", "completed", 701, 294],
  ["Melbourne (Mar)", "2026-03-27", "Events Completed", "completed", 752, 296],
  ["Sydney (30th)", "2026-03-30", "Events Completed", "completed", 510, 174],
  ["Deep Dive", "2026-04-29", "Upcoming Events", "upcoming", 132, 0],
  [
    "Melbourne",
    "2026-05-11",
    "AYB Tour 2026 (AU - May Events)",
    "upcoming",
    244,
    0,
  ],
  [
    "Adelaide",
    "2026-05-13",
    "AYB Tour 2026 (AU - May Events)",
    "upcoming",
    141,
    0,
  ],
  [
    "Perth",
    "2026-05-15",
    "AYB Tour 2026 (AU - May Events)",
    "upcoming",
    190,
    0,
  ],
  [
    "Brisbane (May)",
    "2026-05-19",
    "AYB Tour 2026 (AU - May Events)",
    "upcoming",
    86,
    0,
  ],
  [
    "Sydney (May)",
    "2026-05-22",
    "AYB Tour 2026 (AU - May Events)",
    "upcoming",
    109,
    0,
  ],
  ["Auckland North", "2026-04-30", "NZ AYB Tour", "upcoming", 308, 0],
  ["Queenstown", "2026-05-01", "NZ AYB Tour", "upcoming", 91, 0],
  ["Wellington", "2026-05-04", "NZ AYB Tour", "upcoming", 144, 0],
  ["Christchurch", "2026-05-05", "NZ AYB Tour", "upcoming", 218, 0],
  ["Auckland Central", "2026-05-07", "NZ AYB Tour", "upcoming", 211, 0],
] as const;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSeedData(): EventItem[] {
  return seedBase.map(
    ([name, date, group, status, registrations, attendees]) => ({
      id: createId(),
      name,
      date,
      group,
      status,
      registrations,
      attendees,
    }),
  );
}

export function number(value: unknown) {
  return Number(value || 0);
}

export function formatDate(isoDate: string) {
  if (!isoDate) {
    return "-";
  }
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatInt(value: unknown) {
  return new Intl.NumberFormat("en-AU").format(number(value));
}

function normalizeEvents(items: unknown) {
  if (!Array.isArray(items)) {
    return getSeedData();
  }

  try {
    return items.map((item) => normalizeEvent(item as Partial<EventItem>));
  } catch {
    return getSeedData();
  }
}

export async function loadEvents() {
  const response = await fetch("/api/events", { cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error || `Failed to load events: ${response.status}`,
    );
  }

  const parsed = await response.json();
  return normalizeEvents(parsed);
}

export async function saveEvents(events: EventItem[]) {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(events),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Failed to save events: ${response.status}`);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("blueprint-events-updated"));
  }
}

export async function resetEvents() {
  const fresh = getSeedData();
  await saveEvents(fresh);
  return fresh;
}

export function calcTotals(events: EventItem[]) {
  const totals = events.reduce(
    (acc, event) => {
      acc.registrations += number(event.registrations);
      acc.attendees += number(event.attendees);
      if (event.status === "upcoming") {
        acc.upcomingRegistrations += number(event.registrations);
      }
      return acc;
    },
    { registrations: 0, attendees: 0, upcomingRegistrations: 0 },
  );

  return {
    ...totals,
    attendeeRate: totals.registrations
      ? (totals.attendees / totals.registrations) * 100
      : 0,
  };
}

export function calcGroupSummary(events: EventItem[]) {
  const map = new Map<string, number>();
  for (const event of events) {
    const key = event.group || "Other";
    map.set(key, (map.get(key) || 0) + number(event.registrations));
  }

  return [...map.entries()].map(([group, registrations]) => ({
    group,
    registrations,
  }));
}

export function normalizeEvent(event: Partial<EventItem>): EventItem {
  return {
    id: String(event.id || createId()),
    name: String(event.name || "Untitled Event").trim(),
    date: String(event.date || ""),
    group: String(event.group || "Upcoming Events"),
    status: event.status === "completed" ? "completed" : "upcoming",
    registrations: Math.max(0, number(event.registrations)),
    attendees: Math.max(0, number(event.attendees)),
  };
}

export const GROUPS = [
  "Events Completed",
  "Upcoming Events",
  "AYB Tour 2026 (AU - May Events)",
  "NZ AYB Tour",
];
