(function () {
  const STORAGE_KEY = "blueprint-ayb-dashboard-v1";

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

  function number(value) {
    return Number(value || 0);
  }

  function formatDate(isoDate) {
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

  function formatInt(value) {
    return new Intl.NumberFormat("en-AU").format(number(value));
  }

  async function loadEvents() {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const parsed = await response.json();
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error(
        "Failed to load from API, falling back to local seed data",
        err,
      );
    }
    const fresh = structuredClone(seedData);
    await saveEvents(fresh);
    return fresh;
  }

  async function saveEvents(events) {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      });
      // Optionally fallback to local storage if API fails, but we want a single source of truth now
    } catch (err) {
      console.error("Failed to save to API", err);
    }
  }

  function resetEvents() {
    const fresh = structuredClone(seedData);
    saveEvents(fresh);
    return fresh;
  }

  function calcTotals(events) {
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

    const attendeeRate = totals.registrations
      ? (totals.attendees / totals.registrations) * 100
      : 0;

    return {
      ...totals,
      attendeeRate,
    };
  }

  function calcGroupSummary(events) {
    const map = new Map();

    for (const event of events) {
      const key = event.group || "Other";
      const current = map.get(key) || 0;
      map.set(key, current + number(event.registrations));
    }

    return [...map.entries()].map(([group, registrations]) => ({
      group,
      registrations,
    }));
  }

  window.AYBStore = {
    loadEvents,
    saveEvents,
    resetEvents,
    calcTotals,
    calcGroupSummary,
    number,
    formatDate,
    formatInt,
  };
})();
