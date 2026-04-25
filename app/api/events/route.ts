import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ??
  process.env.KV_REST_API_URL ??
  process.env.STORAGE_URL ??
  process.env.REDIS_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ??
  process.env.KV_REST_API_TOKEN ??
  process.env.STORAGE_TOKEN ??
  process.env.REDIS_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

const STORAGE_KEY = "blueprint-ayb-dashboard-v1";
const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

// Seed data as fallback when the database is empty
const seedData = [
  {
    id: crypto.randomUUID(),
    name: "Palmerston North NRoB",
    date: "2026-03-01",
    group: "Events Completed",
    status: "completed",
    registrations: 180,
    attendees: 53,
  },
  {
    id: crypto.randomUUID(),
    name: "Parramatta",
    date: "2026-03-16",
    group: "Events Completed",
    status: "completed",
    registrations: 386,
    attendees: 159,
  },
  {
    id: crypto.randomUUID(),
    name: "Sydney (20th)",
    date: "2026-03-20",
    group: "Events Completed",
    status: "completed",
    registrations: 703,
    attendees: 312,
  },
  {
    id: crypto.randomUUID(),
    name: "Gold Coast",
    date: "2026-03-24",
    group: "Events Completed",
    status: "completed",
    registrations: 460,
    attendees: 196,
  },
  {
    id: crypto.randomUUID(),
    name: "Brisbane (Mar)",
    date: "2026-03-26",
    group: "Events Completed",
    status: "completed",
    registrations: 701,
    attendees: 294,
  },
  {
    id: crypto.randomUUID(),
    name: "Melbourne (Mar)",
    date: "2026-03-27",
    group: "Events Completed",
    status: "completed",
    registrations: 752,
    attendees: 296,
  },
  {
    id: crypto.randomUUID(),
    name: "Sydney (30th)",
    date: "2026-03-30",
    group: "Events Completed",
    status: "completed",
    registrations: 510,
    attendees: 174,
  },
  {
    id: crypto.randomUUID(),
    name: "Deep Dive",
    date: "2026-04-29",
    group: "Upcoming Events",
    status: "upcoming",
    registrations: 132,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Melbourne",
    date: "2026-05-11",
    group: "AYB Tour 2026 (AU - May Events)",
    status: "upcoming",
    registrations: 244,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Adelaide",
    date: "2026-05-13",
    group: "AYB Tour 2026 (AU - May Events)",
    status: "upcoming",
    registrations: 141,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Perth",
    date: "2026-05-15",
    group: "AYB Tour 2026 (AU - May Events)",
    status: "upcoming",
    registrations: 190,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Brisbane (May)",
    date: "2026-05-19",
    group: "AYB Tour 2026 (AU - May Events)",
    status: "upcoming",
    registrations: 86,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Sydney (May)",
    date: "2026-05-22",
    group: "AYB Tour 2026 (AU - May Events)",
    status: "upcoming",
    registrations: 109,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Auckland North",
    date: "2026-04-30",
    group: "NZ AYB Tour",
    status: "upcoming",
    registrations: 308,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Queenstown",
    date: "2026-05-01",
    group: "NZ AYB Tour",
    status: "upcoming",
    registrations: 91,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Wellington",
    date: "2026-05-04",
    group: "NZ AYB Tour",
    status: "upcoming",
    registrations: 144,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Christchurch",
    date: "2026-05-05",
    group: "NZ AYB Tour",
    status: "upcoming",
    registrations: 218,
    attendees: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Auckland Central",
    date: "2026-05-07",
    group: "NZ AYB Tour",
    status: "upcoming",
    registrations: 211,
    attendees: 0,
  },
];

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured" },
        { status: 503, headers: noStoreHeaders },
      );
    }

    const data = await redis.get(STORAGE_KEY);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      await redis.set(STORAGE_KEY, seedData);
      return NextResponse.json(seedData, { headers: noStoreHeaders });
    }
    return NextResponse.json(data, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Error fetching from Redis:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured" },
        { status: 503, headers: noStoreHeaders },
      );
    }

    const events = await request.json();
    await redis.set(STORAGE_KEY, events);
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Error saving to Redis:", error);
    return NextResponse.json(
      { error: "Failed to save events" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
