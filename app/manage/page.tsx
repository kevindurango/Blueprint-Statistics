"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  calcTotals,
  EventItem,
  formatInt,
  GROUPS,
  loadEvents,
  normalizeEvent,
  resetEvents,
  saveEvents,
} from "@/lib/events-store";

export default function ManagePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Data is synced to the cloud.");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const nextEvents = await loadEvents();
        if (mounted) {
          setEvents(nextEvents);
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load cloud data.",
          );
        }
      }
    };

    void refresh();
    const refreshInterval = window.setInterval(refresh, 10000);

    const onUpdate = () => {
      void refresh();
    };

    window.addEventListener("blueprint-events-updated", onUpdate);
    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("blueprint-events-updated", onUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.group.toLowerCase().includes(query),
    );
  }, [events, search]);

  const totals = useMemo(() => calcTotals(events), [events]);

  const persist = async (nextEvents: EventItem[], nextMessage: string) => {
    const previousEvents = events;
    setEvents(nextEvents);
    try {
      await saveEvents(nextEvents);
      setMessage(nextMessage);
    } catch (error) {
      setEvents(previousEvents);
      setMessage(
        error instanceof Error ? error.message : "Could not save cloud data.",
      );
    }
  };

  const updateField = (id: string, field: keyof EventItem, value: string) => {
    const nextEvents = events.map((event) => {
      if (event.id !== id) return event;
      if (field === "registrations" || field === "attendees") {
        return { ...event, [field]: Math.max(0, Number(value || 0)) };
      }
      return { ...event, [field]: value };
    });
    void persist(nextEvents, "Saved to cloud.");
  };

  const onAddEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = normalizeEvent({
      name: String(formData.get("name") || ""),
      date: String(formData.get("date") || ""),
      group: String(formData.get("group") || ""),
      status: String(formData.get("status") || "") as EventItem["status"],
      registrations: Number(formData.get("registrations") || 0),
      attendees: Number(formData.get("attendees") || 0),
    });
    if (!next.name || !next.date) {
      setMessage("Event name and date are required.");
      return;
    }
    void persist([...events, next], "Event added.");
    event.currentTarget.reset();
  };

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const [file] = e.target.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(parsed)) {
          throw new Error("Imported file must contain an array of events.");
        }
        void persist(
          parsed.map((item) => normalizeEvent(item)),
          "Imported JSON and replaced cloud data.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not import this JSON file.",
        );
      } finally {
        e.target.value = "";
      }
    });
    reader.readAsText(file);
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blueprint-statistics-events.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Exported the current cloud data as JSON.");
  };

  return (
    <main className="dashboard container-fluid px-3 px-lg-4">
      <header className="hero mb-4">
        <div>
          <p className="eyebrow">Blueprint Statistics</p>
          <h1 className="mb-2">Manage Event Data</h1>
          <p className="subtitle">
            Add, edit, import, and export event records. Changes are saved to
            the cloud.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn ghost" href="/">
            Back to Dashboard
          </Link>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              void (async () => {
                const fresh = await resetEvents();
                setEvents(fresh);
                setMessage("Restored the original sample data.");
              })();
            }}
          >
            Reset to Original Data
          </button>
        </div>
      </header>

      <nav className="page-nav mb-3" aria-label="Pages">
        <Link href="/">Dashboard</Link>
        <Link className="active" href="/manage">
          Manage Data
        </Link>
      </nav>

      <section
        className="card metrics manage-metrics"
        aria-label="Current data summary"
      >
        <article>
          <p className="metric-label">Total Registrations</p>
          <p className="metric-value">{formatInt(totals.registrations)}</p>
        </article>
        <article>
          <p className="metric-label">Total Attendees</p>
          <p className="metric-value">{formatInt(totals.attendees)}</p>
        </article>
        <article>
          <p className="metric-label">Events</p>
          <p className="metric-value">{formatInt(events.length)}</p>
        </article>
        <article>
          <p className="metric-label">Storage</p>
          <p className="metric-value compact">Cloud</p>
        </article>
      </section>

      <section className="toolbar-card" aria-label="Data tools">
        <label>
          Find Event
          <input
            className="form-control"
            type="search"
            placeholder="Search event or group"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="data-actions">
          <button className="btn" type="button" onClick={onExport}>
            Export JSON
          </button>
          <label className="file-btn">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={onImport}
            />
          </label>
        </div>
        <p className="hint data-message" aria-live="polite">
          {message}
        </p>
      </section>

      <section className="card">
        <h2>Quick Add Event</h2>
        <form className="form-grid" onSubmit={onAddEvent}>
          <label>
            Event Name
            <input
              className="form-control"
              required
              name="name"
              type="text"
              placeholder="e.g., Sydney (June)"
            />
          </label>
          <label>
            Date
            <input className="form-control" required name="date" type="date" />
          </label>
          <label>
            Group
            <select
              className="form-select"
              required
              name="group"
              defaultValue={GROUPS[0]}
            >
              {GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              className="form-select"
              required
              name="status"
              defaultValue="completed"
            >
              <option value="completed">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <label>
            Registrations
            <input
              className="form-control"
              required
              min="0"
              name="registrations"
              type="number"
              placeholder="0"
            />
          </label>
          <label>
            Attendees
            <input
              className="form-control"
              min="0"
              name="attendees"
              type="number"
              placeholder="0"
            />
          </label>
          <button className="btn" type="submit">
            Add Event
          </button>
        </form>
      </section>

      <section className="card" aria-label="Event table">
        <div className="table-head">
          <h2>Edit Event Details</h2>
          <p className="hint">
            Change values directly in the table. Updates save instantly.
          </p>
        </div>
        <div className="table-wrap">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Group</th>
                <th>Status</th>
                <th>Registrations</th>
                <th>Attendees</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                [...filtered]
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime(),
                  )
                  .map((event) => (
                    <tr key={event.id}>
                      <td>
                        <input
                          className="cell-input wide"
                          value={event.name}
                          onChange={(e) =>
                            updateField(event.id, "name", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input date"
                          type="date"
                          value={event.date}
                          onChange={(e) =>
                            updateField(event.id, "date", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="cell-input select"
                          value={event.group}
                          onChange={(e) =>
                            updateField(event.id, "group", e.target.value)
                          }
                        >
                          {GROUPS.map((groupName) => (
                            <option key={groupName} value={groupName}>
                              {groupName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="cell-input select"
                          value={event.status}
                          onChange={(e) =>
                            updateField(event.id, "status", e.target.value)
                          }
                        >
                          <option value="completed">Completed</option>
                          <option value="upcoming">Upcoming</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          type="number"
                          min={0}
                          value={event.registrations}
                          onChange={(e) =>
                            updateField(
                              event.id,
                              "registrations",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          type="number"
                          min={0}
                          value={event.attendees}
                          onChange={(e) =>
                            updateField(event.id, "attendees", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() =>
                            persist(
                              events.filter((entry) => entry.id !== event.id),
                              "Event deleted.",
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7}>No events match the current search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
