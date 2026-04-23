"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calcGroupSummary,
  calcTotals,
  EventItem,
  formatDate,
  formatInt,
  loadEvents,
  number,
} from "@/lib/events-store";

type SortMode =
  | "date-asc"
  | "date-desc"
  | "registrations-desc"
  | "attendees-desc"
  | "name-asc";

export default function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortMode>("date-asc");

  useEffect(() => {
    setEvents(loadEvents());
    const onStorage = () => setEvents(loadEvents());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const groupOptions = useMemo(
    () => [...new Set(events.map((event) => event.group))].sort(),
    [events],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchSearch =
        !q ||
        event.name.toLowerCase().includes(q) ||
        event.group.toLowerCase().includes(q);
      const matchGroup = group === "all" || event.group === group;
      const matchStatus = status === "all" || event.status === status;
      return matchSearch && matchGroup && matchStatus;
    });
  }, [events, group, search, status]);

  const ordered = useMemo(() => {
    const sorted = [...filtered];
    const byDateAsc = (a: EventItem, b: EventItem) =>
      new Date(a.date).getTime() - new Date(b.date).getTime();
    switch (sort) {
      case "date-desc":
        sorted.sort((a, b) => byDateAsc(b, a));
        break;
      case "registrations-desc":
        sorted.sort((a, b) => b.registrations - a.registrations || byDateAsc(a, b));
        break;
      case "attendees-desc":
        sorted.sort((a, b) => b.attendees - a.attendees || byDateAsc(a, b));
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted.sort(byDateAsc);
    }
    return sorted;
  }, [filtered, sort]);

  const totals = useMemo(() => calcTotals(events), [events]);
  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => event.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0],
    [events],
  );

  const completedCount = events.filter((event) => event.status === "completed").length;
  const upcomingCount = events.filter((event) => event.status === "upcoming").length;
  const totalEvents = events.length || 1;
  const completedPercent = (completedCount / totalEvents) * 100;
  const upcomingPercent = (upcomingCount / totalEvents) * 100;
  const topEvent = [...events].sort((a, b) => b.registrations - a.registrations)[0];

  const groupBars = useMemo(() => {
    const list = calcGroupSummary(filtered).sort(
      (a, b) => b.registrations - a.registrations,
    );
    const max = Math.max(...list.map((g) => g.registrations), 1);
    return { list, max };
  }, [filtered]);

  const topEvents = useMemo(() => {
    const list = [...filtered].sort((a, b) => b.registrations - a.registrations).slice(0, 6);
    return { list, max: Math.max(...list.map((event) => event.registrations), 1) };
  }, [filtered]);

  const monthly = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    filtered.forEach((event) => {
      if (!event.date) return;
      const date = new Date(`${event.date}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + number(event.registrations));
    });
    const list = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, registrations]) => ({ month, registrations }));
    return { list, max: Math.max(...list.map((entry) => entry.registrations), 1) };
  }, [filtered]);

  const upcomingFocus = useMemo(
    () =>
      [...events]
        .filter((event) => event.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5),
    [events],
  );

  const completedAngle =
    ((filtered.filter((event) => event.status === "completed").length /
      Math.max(filtered.length, 1)) *
      360) || 0;

  const clearFilters = () => {
    setSearch("");
    setGroup("all");
    setStatus("all");
    setSort("date-asc");
  };

  return (
    <main className="dashboard container-fluid px-3 px-lg-4">
      <header className="hero mb-4">
        <div>
          <p className="eyebrow">Blueprint Statistics</p>
          <h1 className="mb-2">AYB Event Rego Dashboard</h1>
          <p className="subtitle">
            Live browser snapshot of registrations, attendees, and upcoming event demand.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn" href="/manage">
            Manage Data
          </Link>
        </div>
      </header>

      <nav className="page-nav mb-3" aria-label="Pages">
        <Link className="active" href="/">
          Dashboard
        </Link>
        <Link href="/manage">Manage Data</Link>
      </nav>

      <section className="card metrics" aria-label="Key metrics">
        <article>
          <p className="metric-label">Total Registrations</p>
          <p className="metric-value">{formatInt(totals.registrations)}</p>
        </article>
        <article>
          <p className="metric-label">Total Attendees</p>
          <p className="metric-value">{formatInt(totals.attendees)}</p>
        </article>
        <article>
          <p className="metric-label">Upcoming Registrations</p>
          <p className="metric-value">{formatInt(totals.upcomingRegistrations)}</p>
        </article>
        <article>
          <p className="metric-label">Attendee Rate</p>
          <p className="metric-value">{totals.attendeeRate.toFixed(1)}%</p>
        </article>
        <article>
          <p className="metric-label">Tracked Events</p>
          <p className="metric-value">{formatInt(events.length)}</p>
        </article>
        <article>
          <p className="metric-label">Next Event</p>
          <p className="metric-value compact">{nextEvent ? nextEvent.name : "-"}</p>
        </article>
      </section>

      <section className="card overview-card" aria-label="Statistics overview">
        <div className="table-head">
          <h2>Statistics Overview</h2>
          <p className="hint">Quick visual view of conversion and event mix.</p>
        </div>
        <div className="overview-grid">
          <article className="overview-block">
            <p className="metric-label">Attendance Conversion</p>
            <p className="overview-value">{totals.attendeeRate.toFixed(1)}%</p>
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(Math.max(totals.attendeeRate, 0), 100)}%` }}
              />
            </div>
            <p className="hint">Attendees vs total registrations</p>
          </article>
          <article className="overview-block">
            <p className="metric-label">Completed vs Upcoming Events</p>
            <p className="overview-value">
              <span>{completedCount}</span> / <span>{upcomingCount}</span>
            </p>
            <div className="split-track" aria-hidden="true">
              <div className="split-fill completed" style={{ width: `${completedPercent}%` }} />
              <div className="split-fill upcoming" style={{ width: `${upcomingPercent}%` }} />
            </div>
            <p className="hint">
              <span>{completedPercent.toFixed(1)}%</span> completed,{" "}
              <span>{upcomingPercent.toFixed(1)}%</span> upcoming
            </p>
          </article>
          <article className="overview-block">
            <p className="metric-label">Highest Registration Event</p>
            <p className="overview-value compact">{topEvent?.name || "-"}</p>
            <p className="hint">
              {topEvent
                ? `${formatInt(topEvent.registrations)} registrations, ${formatInt(topEvent.attendees)} attendees`
                : "No event data available yet."}
            </p>
          </article>
        </div>
      </section>

      <section className="grid-two chart-grid" aria-label="Visual analytics">
        <section className="card">
          <h2>Event Status Split (Pie)</h2>
          <div className="chart-wrap">
            {filtered.length ? (
              <>
                <div
                  className="pie-chart"
                  style={{
                    background: `conic-gradient(#8edac8 0deg ${completedAngle}deg, #7abce5 ${completedAngle}deg 360deg)`,
                  }}
                >
                  <div className="pie-center">
                    {Math.round((filtered.filter((event) => event.status === "completed").length / filtered.length) * 100)}
                    %
                  </div>
                </div>
                <div className="pie-legend">
                  <span>
                    <i className="dot completed" />
                    Completed ({filtered.filter((event) => event.status === "completed").length})
                  </span>
                  <span>
                    <i className="dot upcoming" />
                    Upcoming ({filtered.filter((event) => event.status === "upcoming").length})
                  </span>
                </div>
              </>
            ) : (
              <p className="empty-state">No data for current filters.</p>
            )}
          </div>
        </section>
        <section className="card">
          <h2>Top Events by Registrations (Bar)</h2>
          <div className="bars chart-bars">
            {topEvents.list.length ? (
              topEvents.list.map((event) => (
                <div className="bar-row" key={event.id}>
                  <span className="bar-label">{event.name}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(event.registrations / topEvents.max) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatInt(event.registrations)}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No events to display.</p>
            )}
          </div>
        </section>
      </section>

      <section className="card" aria-label="Monthly trend">
        <h2>Monthly Registrations (Bar)</h2>
        <div className="bars chart-bars">
          {monthly.list.length ? (
            monthly.list.map((entry) => {
              const [year, month] = entry.month.split("-");
              const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
                "en-AU",
                { month: "short", year: "numeric" },
              );
              return (
                <div className="bar-row" key={entry.month}>
                  <span className="bar-label">{label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(entry.registrations / monthly.max) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatInt(entry.registrations)}</span>
                </div>
              );
            })
          ) : (
            <p className="empty-state">No monthly data to display.</p>
          )}
        </div>
      </section>

      <section className="toolbar-card" aria-label="Dashboard filters">
        <label>
          Search
          <input
            className="form-control"
            type="search"
            placeholder="Search event or group"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Group
          <select className="form-select" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {groupOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </label>
        <label>
          Sort by
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="date-asc">Date (Oldest first)</option>
            <option value="date-desc">Date (Newest first)</option>
            <option value="registrations-desc">Registrations (High to low)</option>
            <option value="attendees-desc">Attendees (High to low)</option>
            <option value="name-asc">Name (A-Z)</option>
          </select>
        </label>
        <button id="clearFiltersBtn" className="btn ghost" type="button" onClick={clearFilters}>
          Clear Filters
        </button>
        <p className="filter-meta">Showing {formatInt(filtered.length)} events</p>
      </section>

      <section className="grid-two">
        <section className="card">
          <h2>Registrations by Event Group</h2>
          <div className="bars" aria-label="Registrations by group">
            {groupBars.list.length ? (
              groupBars.list.map((entry) => (
                <div className="bar-row" key={entry.group}>
                  <span className="bar-label">{entry.group}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(entry.registrations / groupBars.max) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatInt(entry.registrations)}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No matching groups.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Upcoming Focus</h2>
          <div className="event-stack" aria-label="Upcoming events">
            {upcomingFocus.length ? (
              upcomingFocus.map((event) => (
                <article className="event-item" key={event.id}>
                  <strong>{event.name}</strong>
                  <span className="event-count">{formatInt(event.registrations)}</span>
                  <span>
                    {formatDate(event.date)} - {event.group}
                  </span>
                </article>
              ))
            ) : (
              <p className="empty-state">No upcoming events.</p>
            )}
          </div>
        </section>
      </section>

      <section className="card" aria-label="Event table">
        <div className="table-head">
          <h2>Event Details</h2>
          <p className="hint">
            {ordered.length
              ? `${ordered.length} of ${events.length} events shown.`
              : "Try clearing the filters or add a new event."}
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
              </tr>
            </thead>
            <tbody>
              {ordered.length ? (
                ordered.map((event) => (
                  <tr key={event.id}>
                    <td>{event.name}</td>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.group}</td>
                    <td>
                      <span className={`status-pill ${event.status}`}>{event.status}</span>
                    </td>
                    <td>{formatInt(event.registrations)}</td>
                    <td>{formatInt(event.attendees)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No events match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
