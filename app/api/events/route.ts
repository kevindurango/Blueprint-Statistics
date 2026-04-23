import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis from environment variables (KV_REST_API_URL and KV_REST_API_TOKEN)
// These will be automatically populated by Vercel when you link the KV database.
const redis = Redis.fromEnv();

const STORAGE_KEY = 'blueprint-ayb-dashboard-v1';

// Seed data as fallback when the database is empty
const seedData = [
  { id: crypto.randomUUID(), name: "Palmerston North NRoB", date: "2026-03-01", group: "Events Completed", status: "completed", registrations: 180, attendees: 53 },
  { id: crypto.randomUUID(), name: "Parramatta", date: "2026-03-16", group: "Events Completed", status: "completed", registrations: 386, attendees: 159 },
  { id: crypto.randomUUID(), name: "Sydney (20th)", date: "2026-03-20", group: "Events Completed", status: "completed", registrations: 703, attendees: 312 },
  { id: crypto.randomUUID(), name: "Gold Coast", date: "2026-03-24", group: "Events Completed", status: "completed", registrations: 460, attendees: 196 },
  { id: crypto.randomUUID(), name: "Brisbane (Mar)", date: "2026-03-26", group: "Events Completed", status: "completed", registrations: 701, attendees: 294 },
  { id: crypto.randomUUID(), name: "Melbourne (Mar)", date: "2026-03-27", group: "Events Completed", status: "completed", registrations: 752, attendees: 296 },
  { id: crypto.randomUUID(), name: "Sydney (30th)", date: "2026-03-30", group: "Events Completed", status: "completed", registrations: 510, attendees: 174 },
  { id: crypto.randomUUID(), name: "Deep Dive", date: "2026-04-29", group: "Upcoming Events", status: "upcoming", registrations: 132, attendees: 0 },
  { id: crypto.randomUUID(), name: "Melbourne", date: "2026-05-11", group: "AYB Tour 2026 (AU - May Events)", status: "upcoming", registrations: 244, attendees: 0 },
  { id: crypto.randomUUID(), name: "Adelaide", date: "2026-05-13", group: "AYB Tour 2026 (AU - May Events)", status: "upcoming", registrations: 141, attendees: 0 },
  { id: crypto.randomUUID(), name: "Perth", date: "2026-05-15", group: "AYB Tour 2026 (AU - May Events)", status: "upcoming", registrations: 190, attendees: 0 },
  { id: crypto.randomUUID(), name: "Brisbane (May)", date: "2026-05-19", group: "AYB Tour 2026 (AU - May Events)", status: "upcoming", registrations: 86, attendees: 0 },
  { id: crypto.randomUUID(), name: "Sydney (May)", date: "2026-05-22", group: "AYB Tour 2026 (AU - May Events)", status: "upcoming", registrations: 109, attendees: 0 },
  { id: crypto.randomUUID(), name: "Auckland North", date: "2026-04-30", group: "NZ AYB Tour", status: "upcoming", registrations: 308, attendees: 0 },
  { id: crypto.randomUUID(), name: "Queenstown", date: "2026-05-01", group: "NZ AYB Tour", status: "upcoming", registrations: 91, attendees: 0 },
  { id: crypto.randomUUID(), name: "Wellington", date: "2026-05-04", group: "NZ AYB Tour", status: "upcoming", registrations: 144, attendees: 0 },
  { id: crypto.randomUUID(), name: "Christchurch", date: "2026-05-05", group: "NZ AYB Tour", status: "upcoming", registrations: 218, attendees: 0 },
  { id: crypto.randomUUID(), name: "Auckland Central", date: "2026-05-07", group: "NZ AYB Tour", status: "upcoming", registrations: 211, attendees: 0 },
];

export async function GET() {
  try {
    const data = await redis.get(STORAGE_KEY);
    if (!data) {
      // If nothing exists in the database, return the seed data
      return NextResponse.json(seedData);
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Redis:', error);
    // Fallback to local data on error so the app doesn't crash
    return NextResponse.json(seedData);
  }
}

export async function POST(request: Request) {
  try {
    const events = await request.json();
    await redis.set(STORAGE_KEY, events);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving to Redis:', error);
    return NextResponse.json({ error: 'Failed to save events' }, { status: 500 });
  }
}
