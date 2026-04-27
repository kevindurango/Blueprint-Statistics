"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Database, Download, RotateCcw, Upload } from "lucide-react";
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
  calcTotals,
  EventItem,
  formatInt,
  GROUPS,
  loadEvents,
  normalizeEvent,
  resetEvents,
  saveEvents,
} from "@/lib/events-store";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-blue-700 to-emerald-600" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ManagePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Data is synced to the cloud.");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const nextEvents = await loadEvents();
        if (mounted) {
          setEvents(nextEvents);
          setLoadError("");
          setMessage("Data is synced to the cloud.");
        }
      } catch (error) {
        if (mounted) {
          const nextError =
            error instanceof Error ? error.message : "Could not load cloud data.";
          setLoadError(nextError);
          setMessage(nextError);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
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
  const metricValue = (value: number) =>
    isLoading ? "..." : loadError ? "-" : formatInt(value);

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
    const form = event.currentTarget;
    const formData = new FormData(form);
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

    void persist([...events, next], "Event added to cloud data.");
    form.reset();
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
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <header className="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-4 rounded-md bg-blue-50 text-blue-800">
            Blueprint Statistics
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 lg:text-5xl">
            Manage Event Data
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Add, edit, import, and export event records. Changes are saved to
            the cloud database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void (async () => {
                const fresh = await resetEvents();
                setEvents(fresh);
                setMessage("Restored the original sample data in cloud.");
              })();
            }}
          >
            <RotateCcw />
            Reset to Original Data
          </Button>
        </div>
      </header>

      <nav className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <Button asChild size="sm" variant="ghost">
          <Link href="/">Dashboard</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/manage">Manage Data</Link>
        </Button>
      </nav>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Registrations"
          value={metricValue(totals.registrations)}
        />
        <MetricCard label="Total Attendees" value={metricValue(totals.attendees)} />
        <MetricCard label="Events" value={metricValue(events.length)} />
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-blue-700 to-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Storage
            </p>
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-slate-950">
              <Database className="size-4 text-blue-700" />
              {loadError ? "Cloud unavailable" : "Cloud"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-5 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_auto_auto_minmax(260px,2fr)] lg:items-center">
        <Input
          type="search"
          placeholder="Search event or group"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" onClick={onExport}>
          <Download />
          Export JSON
        </Button>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50">
          <Upload className="size-4" />
          Import JSON
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={onImport}
          />
        </label>
        <p className="text-sm font-medium text-slate-600" aria-live="polite">
          {message}
        </p>
      </section>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-2xl">Quick Add Event</CardTitle>
          <CardDescription>Create a new record and sync it to the cloud.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" onSubmit={onAddEvent}>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:col-span-2">
              Event Name
              <Input required name="name" type="text" placeholder="e.g., Sydney (June)" />
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Date
              <Input required name="date" type="date" />
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Group
              <Select required name="group" defaultValue={GROUPS[0]}>
                {GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
              <Select required name="status" defaultValue="completed">
                <option value="completed">Completed</option>
                <option value="upcoming">Upcoming</option>
              </Select>
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registrations
              <Input required min="0" name="registrations" type="number" placeholder="0" />
            </label>
            <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attendees
              <Input min="0" name="attendees" type="number" placeholder="0" />
            </label>
            <Button className="md:self-end" type="submit">
              Add Event
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Event Details</CardTitle>
          <CardDescription>
            Change values directly in the table. Updates save instantly.
          </CardDescription>
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
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                [...filtered]
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime(),
                  )
                  .map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Input
                          className="min-w-48"
                          value={event.name}
                          onChange={(e) =>
                            updateField(event.id, "name", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-36"
                          type="date"
                          value={event.date}
                          onChange={(e) =>
                            updateField(event.id, "date", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          className="min-w-56"
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
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          className="min-w-32"
                          value={event.status}
                          onChange={(e) =>
                            updateField(event.id, "status", e.target.value)
                          }
                        >
                          <option value="completed">Completed</option>
                          <option value="upcoming">Upcoming</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-28"
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
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-28"
                          type="number"
                          min={0}
                          value={event.attendees}
                          onChange={(e) =>
                            updateField(event.id, "attendees", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            persist(
                              events.filter((entry) => entry.id !== event.id),
                              "Event deleted from cloud data.",
                            )
                          }
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>No events match the current search.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
