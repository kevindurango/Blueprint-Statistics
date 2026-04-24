const state = {
  events: [],
  filters: {
    search: "",
    group: "all",
    status: "all",
    sort: "date-asc",
  },
};

const eventsTableBody = document.getElementById("eventsTableBody");
const groupBars = document.getElementById("groupBars");
const upcomingList = document.getElementById("upcomingList");
const searchInput = document.getElementById("searchInput");
const groupFilter = document.getElementById("groupFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filterMeta = document.getElementById("filterMeta");
const tableHint = document.getElementById("tableHint");

const totalRegistrationsEl = document.getElementById("totalRegistrations");
const totalAttendeesEl = document.getElementById("totalAttendees");
const upcomingRegistrationsEl = document.getElementById(
  "upcomingRegistrations",
);
const attendeeRateEl = document.getElementById("attendeeRate");
const trackedEventsEl = document.getElementById("trackedEvents");
const nextEventMetricEl = document.getElementById("nextEventMetric");
const conversionValueEl = document.getElementById("conversionValue");
const conversionBarEl = document.getElementById("conversionBar");
const completedEventsEl = document.getElementById("completedEvents");
const upcomingEventsEl = document.getElementById("upcomingEvents");
const completedBarEl = document.getElementById("completedBar");
const upcomingBarEl = document.getElementById("upcomingBar");
const completedPercentEl = document.getElementById("completedPercent");
const upcomingPercentEl = document.getElementById("upcomingPercent");
const topEventNameEl = document.getElementById("topEventName");
const topEventMetaEl = document.getElementById("topEventMeta");
const statusPieWrap = document.getElementById("statusPieWrap");
const topEventsChart = document.getElementById("topEventsChart");
const monthlyChart = document.getElementById("monthlyChart");

function getFilteredEvents() {
  const search = state.filters.search.trim().toLowerCase();

  return state.events.filter((event) => {
    const matchesSearch =
      !search ||
      event.name.toLowerCase().includes(search) ||
      event.group.toLowerCase().includes(search);
    const matchesGroup =
      state.filters.group === "all" || event.group === state.filters.group;
    const matchesStatus =
      state.filters.status === "all" || event.status === state.filters.status;

    return matchesSearch && matchesGroup && matchesStatus;
  });
}

function sortEvents(events) {
  const sorted = [...events];
  const byDateAsc = (a, b) => new Date(a.date) - new Date(b.date);

  switch (state.filters.sort) {
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
    case "date-asc":
    default:
      sorted.sort(byDateAsc);
      break;
  }

  return sorted;
}

function updateStats() {
  const totals = window.AYBStore.calcTotals(state.events);
  const nextEvent = [...state.events]
    .filter((event) => event.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const completedCount = state.events.filter(
    (event) => event.status === "completed",
  ).length;
  const upcomingCount = state.events.filter(
    (event) => event.status === "upcoming",
  ).length;
  const totalEvents = state.events.length || 1;
  const completedPercent = (completedCount / totalEvents) * 100;
  const upcomingPercent = (upcomingCount / totalEvents) * 100;
  const topEvent = [...state.events].sort(
    (a, b) => b.registrations - a.registrations,
  )[0];

  totalRegistrationsEl.textContent = window.AYBStore.formatInt(
    totals.registrations,
  );
  totalAttendeesEl.textContent = window.AYBStore.formatInt(totals.attendees);
  upcomingRegistrationsEl.textContent = window.AYBStore.formatInt(
    totals.upcomingRegistrations,
  );
  attendeeRateEl.textContent = `${totals.attendeeRate.toFixed(1)}%`;
  trackedEventsEl.textContent = window.AYBStore.formatInt(state.events.length);
  nextEventMetricEl.textContent = nextEvent ? nextEvent.name : "-";

  conversionValueEl.textContent = `${totals.attendeeRate.toFixed(1)}%`;
  conversionBarEl.style.width = `${Math.min(Math.max(totals.attendeeRate, 0), 100)}%`;
  completedEventsEl.textContent = window.AYBStore.formatInt(completedCount);
  upcomingEventsEl.textContent = window.AYBStore.formatInt(upcomingCount);
  completedBarEl.style.width = `${completedPercent.toFixed(1)}%`;
  upcomingBarEl.style.width = `${upcomingPercent.toFixed(1)}%`;
  completedPercentEl.textContent = `${completedPercent.toFixed(1)}%`;
  upcomingPercentEl.textContent = `${upcomingPercent.toFixed(1)}%`;

  if (topEvent) {
    topEventNameEl.textContent = topEvent.name;
    topEventMetaEl.textContent = `${window.AYBStore.formatInt(topEvent.registrations)} registrations, ${window.AYBStore.formatInt(topEvent.attendees)} attendees`;
  } else {
    topEventNameEl.textContent = "-";
    topEventMetaEl.textContent = "No event data available yet.";
  }
}

function renderGroupOptions() {
  const current = groupFilter.value || "all";
  const groups = [...new Set(state.events.map((event) => event.group))].sort();

  groupFilter.replaceChildren(new Option("All groups", "all"));
  groups.forEach((group) => {
    groupFilter.appendChild(new Option(group, group));
  });
  groupFilter.value = groups.includes(current) ? current : "all";
  state.filters.group = groupFilter.value;
}

function renderGroupBars(events) {
  const groups = window.AYBStore.calcGroupSummary(events);
  const max = Math.max(...groups.map((g) => g.registrations), 1);

  groupBars.replaceChildren();

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No matching groups.";
    groupBars.appendChild(empty);
    return;
  }

  groups
    .sort((a, b) => b.registrations - a.registrations)
    .forEach((entry) => {
      const widthPercent = (entry.registrations / max) * 100;
      const row = document.createElement("div");
      const label = document.createElement("span");
      const track = document.createElement("div");
      const fill = document.createElement("div");
      const value = document.createElement("span");

      row.className = "bar-row";
      label.className = "bar-label";
      label.textContent = entry.group;
      track.className = "bar-track";
      fill.className = "bar-fill";
      fill.style.width = `${widthPercent}%`;
      value.className = "bar-value";
      value.textContent = window.AYBStore.formatInt(entry.registrations);

      track.appendChild(fill);
      row.append(label, track, value);
      groupBars.appendChild(row);
    });
}

function renderStatusPie(events) {
  statusPieWrap.replaceChildren();
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No data for current filters.";
    statusPieWrap.appendChild(empty);
    return;
  }

  const completed = events.filter(
    (event) => event.status === "completed",
  ).length;
  const upcoming = events.filter((event) => event.status === "upcoming").length;
  const total = completed + upcoming || 1;
  const completedAngle = (completed / total) * 360;

  const pie = document.createElement("div");
  pie.className = "pie-chart";
  pie.style.background = `conic-gradient(#8edac8 0deg ${completedAngle}deg, #ffbf97 ${completedAngle}deg 360deg)`;

  const center = document.createElement("div");
  center.className = "pie-center";
  center.textContent = `${Math.round((completed / total) * 100)}%`;
  pie.appendChild(center);

  const legend = document.createElement("div");
  legend.className = "pie-legend";
  legend.innerHTML = `
    <span><i class="dot completed"></i>Completed (${completed})</span>
    <span><i class="dot upcoming"></i>Upcoming (${upcoming})</span>
  `;

  statusPieWrap.append(pie, legend);
}

function renderTopEventsChart(events) {
  topEventsChart.replaceChildren();
  const ranked = [...events]
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 6);

  if (!ranked.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No events to display.";
    topEventsChart.appendChild(empty);
    return;
  }

  const max = Math.max(...ranked.map((event) => event.registrations), 1);

  ranked.forEach((event) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const value = document.createElement("span");

    row.className = "bar-row";
    label.className = "bar-label";
    label.textContent = event.name;
    track.className = "bar-track";
    fill.className = "bar-fill";
    fill.style.width = `${(event.registrations / max) * 100}%`;
    value.className = "bar-value";
    value.textContent = window.AYBStore.formatInt(event.registrations);

    track.appendChild(fill);
    row.append(label, track, value);
    topEventsChart.appendChild(row);
  });
}

function renderMonthlyChart(events) {
  monthlyChart.replaceChildren();
  const monthlyMap = new Map();

  events.forEach((event) => {
    if (!event.date) {
      return;
    }
    const date = new Date(`${event.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = monthlyMap.get(key) || 0;
    monthlyMap.set(key, current + window.AYBStore.number(event.registrations));
  });

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, registrations]) => ({
      month,
      registrations,
    }));

  if (!monthly.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No monthly data to display.";
    monthlyChart.appendChild(empty);
    return;
  }

  const max = Math.max(...monthly.map((entry) => entry.registrations), 1);
  monthly.forEach((entry) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const value = document.createElement("span");
    const [year, month] = entry.month.split("-");
    const labelDate = new Date(
      Number(year),
      Number(month) - 1,
      1,
    ).toLocaleDateString("en-AU", { month: "short", year: "numeric" });

    row.className = "bar-row";
    label.className = "bar-label";
    label.textContent = labelDate;
    track.className = "bar-track";
    fill.className = "bar-fill";
    fill.style.width = `${(entry.registrations / max) * 100}%`;
    value.className = "bar-value";
    value.textContent = window.AYBStore.formatInt(entry.registrations);

    track.appendChild(fill);
    row.append(label, track, value);
    monthlyChart.appendChild(row);
  });
}

function renderUpcomingList() {
  const upcoming = [...state.events]
    .filter((event) => event.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  upcomingList.replaceChildren();

  if (!upcoming.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No upcoming events.";
    upcomingList.appendChild(empty);
    return;
  }

  upcoming.forEach((event) => {
    const item = document.createElement("article");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const count = document.createElement("span");

    item.className = "event-item";
    title.textContent = event.name;
    meta.textContent = `${window.AYBStore.formatDate(event.date)} - ${event.group}`;
    count.className = "event-count";
    count.textContent = window.AYBStore.formatInt(event.registrations);

    item.append(title, count, meta);
    upcomingList.appendChild(item);
  });
}

function buildTableRow(event) {
  const tr = document.createElement("tr");
  const name = document.createElement("td");
  const date = document.createElement("td");
  const group = document.createElement("td");
  const status = document.createElement("td");
  const registrations = document.createElement("td");
  const attendees = document.createElement("td");
  const pill = document.createElement("span");

  name.textContent = event.name;
  date.textContent = window.AYBStore.formatDate(event.date);
  group.textContent = event.group;
  pill.className = `status-pill ${event.status}`;
  pill.textContent = event.status;
  status.appendChild(pill);
  registrations.textContent = window.AYBStore.formatInt(event.registrations);
  attendees.textContent = window.AYBStore.formatInt(event.attendees);
  tr.append(name, date, group, status, registrations, attendees);

  return tr;
}

function renderTable(events) {
  eventsTableBody.replaceChildren();
  const orderedEvents = sortEvents(events);

  if (!orderedEvents.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No events match the current filters.";
    row.appendChild(cell);
    eventsTableBody.appendChild(row);
    tableHint.textContent = "Try clearing the filters or add a new event.";
    return;
  }

  orderedEvents.forEach((event) => {
    eventsTableBody.appendChild(buildTableRow(event));
  });

  tableHint.textContent = `${events.length} of ${state.events.length} events shown.`;
}

function rerender() {
  renderGroupOptions();
  const filteredEvents = getFilteredEvents();
  renderTable(filteredEvents);
  updateStats();
  renderGroupBars(filteredEvents);
  renderStatusPie(filteredEvents);
  renderTopEventsChart(filteredEvents);
  renderMonthlyChart(filteredEvents);
  renderUpcomingList();
  filterMeta.textContent = `Showing ${window.AYBStore.formatInt(filteredEvents.length)} event${filteredEvents.length === 1 ? "" : "s"}`;
}

searchInput.addEventListener("input", () => {
  state.filters.search = searchInput.value;
  rerender();
});

groupFilter.addEventListener("change", () => {
  state.filters.group = groupFilter.value;
  rerender();
});

statusFilter.addEventListener("change", () => {
  state.filters.status = statusFilter.value;
  rerender();
});

sortFilter.addEventListener("change", () => {
  state.filters.sort = sortFilter.value;
  rerender();
});

clearFiltersBtn.addEventListener("click", () => {
  state.filters = {
    search: "",
    group: "all",
    status: "all",
    sort: "date-asc",
  };
  searchInput.value = "";
  groupFilter.value = "all";
  statusFilter.value = "all";
  sortFilter.value = "date-asc";
  rerender();
});

window.addEventListener("storage", async (event) => {
  if (event.key) {
    state.events = await window.AYBStore.loadEvents();
    rerender();
  }
});

// Initial load
(async function init() {
  const loadingIndicator = document.createElement("div");
  loadingIndicator.style.cssText =
    "position:fixed; top:20px; right:20px; padding:10px 20px; background:var(--bg-card); color:var(--text-primary); border-radius:8px; box-shadow:var(--shadow-md); z-index:9999; font-weight:600; font-size:14px; border:1px solid var(--border-color);";
  loadingIndicator.innerText = "Syncing from cloud...";
  document.body.appendChild(loadingIndicator);

  state.events = await window.AYBStore.loadEvents();

  loadingIndicator.remove();
  rerender();
})();
