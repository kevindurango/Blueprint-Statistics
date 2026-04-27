"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Database, FilterX, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-blue-700 to-emerald-600" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-2 truncate text-3xl font-extrabold text-slate-950">
          {value}
        </p>
        {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortMode>("date-asc");
  const [message, setMessage] = useState("Syncing cloud data...");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const nextEvents = await loadEvents();
        if (mounted) {
          setEvents(nextEvents);
          setMessage("Synced with cloud database.");
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error ? error.message : "Could not load cloud data.",
          );
        }
      }
    };

    void refresh();
    const refreshInterval = window.setInterval(refresh, 10000);
    const onUpdate = () => void refresh();
    window.addEventListener("blueprint-events-updated", onUpdate);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("blueprint-events-updated", onUpdate);
    };
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
        sorted.sort(
          (a, b) => b.registrations - a.registrations || byDateAsc(a, b),
        );
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
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )[0],
    [events],
  );
  const completedCount = events.filter(
    (event) => event.status === "completed",
  ).length;
  const upcomingCount = events.filter(
    (event) => event.status === "upcoming",
  ).length;
  const topEvent = [...events].sort(
    (a, b) => b.registrations - a.registrations,
  )[0];
  const completedPercent =
    (filtered.filter((event) => event.status === "completed").length /
      Math.max(filtered.length, 1)) *
    100;

  const groupBars = useMemo(() => {
    const list = calcGroupSummary(filtered).sort(
      (a, b) => b.registrations - a.registrations,
    );
    return { list, max: Math.max(...list.map((g) => g.registrations), 1) };
  }, [filtered]);

  const topEvents = useMemo(() => {
    const list = [...filtered]
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 6);
    return {
      list,
      max: Math.max(...list.map((event) => event.registrations), 1),
    };
  }, [filtered]);

  const monthly = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    filtered.forEach((event) => {
      if (!event.date) return;
      const date = new Date(`${event.date}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(
        key,
        (monthlyMap.get(key) || 0) + number(event.registrations),
      );
    });
    const list = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, registrations]) => ({ month, registrations }));
    return {
      list,
      max: Math.max(...list.map((entry) => entry.registrations), 1),
    };
  }, [filtered]);

  const upcomingFocus = useMemo(
    () =>
      [...events]
        .filter((event) => event.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5),
    [events],
  );

  const clearFilters = () => {
    setSearch("");
    setGroup("all");
    setStatus("all");
    setSort("date-asc");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <header className="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-4 rounded-md bg-blue-50 text-blue-800">
            Blueprint Statistics
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 lg:text-5xl">
            AYB Event Rego Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{message}</p>
        </div>
        <Button asChild>
          <Link href="/manage">
            <Settings />
            Manage Data
          </Link>
        </Button>
      </header>

      <nav className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <Button asChild size="sm">
          <Link href="/">Dashboard</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/manage">Manage Data</Link>
        </Button>
      </nav>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total Registrations" value={formatInt(totals.registrations)} />
        <MetricCard label="Total Attendees" value={formatInt(totals.attendees)} />
        <MetricCard
          label="Upcoming Registrations"
          value={formatInt(totals.upcomingRegistrations)}
        />
        <MetricCard label="Attendee Rate" value={`${totals.attendeeRate.toFixed(1)}%`} />
        <MetricCard label="Tracked Events" value={formatInt(events.length)} />
        <MetricCard label="Next Event" value={nextEvent ? nextEvent.name : "-"} />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Conversion</CardTitle>
            <CardDescription>Attendees vs total registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-slate-950">
              {totals.attendeeRate.toFixed(1)}%
            </p>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-blue-700"
                style={{ width: `${Math.min(Math.max(totals.attendeeRate, 0), 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed vs Upcoming</CardTitle>
            <CardDescription>Current event mix</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-slate-950">
              {completedCount} / {upcomingCount}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-2 bg-emerald-600"
                style={{
                  width: `${(completedCount / Math.max(events.length, 1)) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Highest Registration Event</CardTitle>
            <CardDescription>Top event by demand</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="truncate text-2xl font-extrabold text-slate-950">
              {topEvent?.name || "-"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {topEvent
                ? `${formatInt(topEvent.registrations)} registrations, ${formatInt(topEvent.attendees)} attendees`
                : "No event data available yet."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-5 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-6">
        <Input
          className="lg:col-span-2"
          type="search"
          placeholder="Search event or group"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">All groups</option>
          {groupOptions.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="upcoming">Upcoming</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
          <option value="date-asc">Date oldest first</option>
          <option value="date-desc">Date newest first</option>
          <option value="registrations-desc">Registrations high to low</option>
          <option value="attendees-desc">Attendees high to low</option>
          <option value="name-asc">Name A-Z</option>
        </Select>
        <Button type="button" variant="outline" onClick={clearFilters}>
          <FilterX />
          Clear
        </Button>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Events by Registrations</CardTitle>
            <CardDescription>Showing {formatInt(filtered.length)} filtered events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEvents.list.map((event) => (
              <div className="grid grid-cols-[minmax(0,1fr)_2fr_64px] items-center gap-3" key={event.id}>
                <span className="truncate text-sm font-medium text-slate-700">{event.name}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-700"
                    style={{ width: `${(event.registrations / topEvents.max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-slate-500">
                  {formatInt(event.registrations)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Focus</CardTitle>
            <CardDescription>Next events by date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingFocus.map((event) => (
              <div
                className="grid min-h-14 grid-cols-[minmax(0,1fr)_64px_minmax(180px,1fr)] items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                key={event.id}
              >
                <strong className="truncate text-sm text-slate-900">{event.name}</strong>
                <Badge variant="outline" className="justify-center bg-blue-50 font-mono text-blue-800">
                  {formatInt(event.registrations)}
                </Badge>
                <span className="truncate text-right text-sm text-slate-500">
                  {formatDate(event.date)} - {event.group}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrations by Group</CardTitle>
            <CardDescription>Group-level demand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupBars.list.map((entry) => (
              <div className="grid grid-cols-[minmax(0,1fr)_2fr_64px] items-center gap-3" key={entry.group}>
                <span className="truncate text-sm font-medium text-slate-700">{entry.group}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-600"
                    style={{ width: `${(entry.registrations / groupBars.max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-slate-500">
                  {formatInt(entry.registrations)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Registrations</CardTitle>
            <CardDescription>Registration totals by month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthly.list.map((entry) => {
              const [year, month] = entry.month.split("-");
              const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AU", {
                month: "short",
                year: "numeric",
              });
              return (
                <div className="grid grid-cols-[96px_2fr_64px] items-center gap-3" key={entry.month}>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-700"
                      style={{ width: `${(entry.registrations / monthly.max) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-slate-500">
                    {formatInt(entry.registrations)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              {ordered.length ? `${ordered.length} of ${events.length} events shown.` : "No matching events."}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            <Database className="mr-1 size-3" />
            Cloud
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Attendees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium text-slate-950">{event.name}</TableCell>
                  <TableCell>{formatDate(event.date)}</TableCell>
                  <TableCell>{event.group}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === "completed" ? "success" : "secondary"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatInt(event.registrations)}</TableCell>
                  <TableCell>{formatInt(event.attendees)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
