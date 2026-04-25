const GROUPS = [
  "Events Completed",
  "Upcoming Events",
  "AYB Tour 2026 (AU - May Events)",
  "NZ AYB Tour",
];

const state = {
  events: [],
  search: "",
  pendingRegistrationUpdates: new Set(),
};

const eventsTableBody = document.getElementById("eventsTableBody");
const addEventForm = document.getElementById("addEventForm");
const resetDataBtn = document.getElementById("resetDataBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataInput = document.getElementById("importDataInput");
const manageSearchInput = document.getElementById("manageSearchInput");
const dataMessage = document.getElementById("dataMessage");
const manageRegistrations = document.getElementById("manageRegistrations");
const manageAttendees = document.getElementById("manageAttendees");
const manageEvents = document.getElementById("manageEvents");
const saveChangesBtn = document.getElementById("saveChangesBtn");

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFilteredEvents() {
  const search = state.search.trim().toLowerCase();
  if (!search) {
    return state.events;
  }

  return state.events.filter(
    (event) =>
      event.name.toLowerCase().includes(search) ||
      event.group.toLowerCase().includes(search),
  );
}

function showMessage(message) {
  dataMessage.textContent = message;
}

function setUpdateButtonState(hasPendingUpdates) {
  saveChangesBtn.disabled = !hasPendingUpdates;
  if (hasPendingUpdates) {
    saveChangesBtn.classList.add("pulse");
  } else {
    saveChangesBtn.classList.remove("pulse");
  }
}

function updateSummary() {
  const totals = window.AYBStore.calcTotals(state.events);
  manageRegistrations.textContent = window.AYBStore.formatInt(
    totals.registrations,
  );
  manageAttendees.textContent = window.AYBStore.formatInt(totals.attendees);
  manageEvents.textContent = window.AYBStore.formatInt(state.events.length);
}

function createInput(event, field, type = "text") {
  const input = document.createElement("input");
  input.className = "cell-input";
  input.dataset.field = field;
  input.type = type;
  input.value = event[field] || "";

  if (type === "number") {
    input.min = "0";
    input.value = window.AYBStore.number(event[field]);
  }

  if (field === "name") {
    input.classList.add("wide");
  }

  if (field === "date") {
    input.classList.add("date");
  }

  return input;
}

function createSelect(event, field, options) {
  const select = document.createElement("select");
  select.className = "cell-input select";
  select.dataset.field = field;

  options.forEach((option) => {
    select.appendChild(new Option(option.label, option.value));
  });

  select.value = event[field];
  return select;
}

function buildTableRow(event) {
  const tr = document.createElement("tr");
  const name = document.createElement("td");
  const date = document.createElement("td");
  const group = document.createElement("td");
  const status = document.createElement("td");
  const registrations = document.createElement("td");
  const attendees = document.createElement("td");
  const action = document.createElement("td");
  const actionWrap = document.createElement("div");
  const updateBtn = document.createElement("button");
  const deleteBtn = document.createElement("button");

  tr.dataset.id = event.id;
  name.appendChild(createInput(event, "name"));
  date.appendChild(createInput(event, "date", "date"));
  group.appendChild(
    createSelect(
      event,
      "group",
      GROUPS.map((groupName) => ({ label: groupName, value: groupName })),
    ),
  );
  status.appendChild(
    createSelect(event, "status", [
      { label: "Completed", value: "completed" },
      { label: "Upcoming", value: "upcoming" },
    ]),
  );
  registrations.appendChild(createInput(event, "registrations", "number"));
  attendees.appendChild(createInput(event, "attendees", "number"));

  updateBtn.type = "button";
  updateBtn.className = "link-btn update-btn";
  if (!state.pendingRegistrationUpdates.has(event.id)) {
    updateBtn.classList.add("is-hidden");
  }
  updateBtn.dataset.action = "update-registration";
  updateBtn.textContent = "Update";

  deleteBtn.type = "button";
  deleteBtn.className = "link-btn";
  deleteBtn.dataset.action = "delete";
  deleteBtn.textContent = "Delete";

  actionWrap.className = "manage-table-actions";
  actionWrap.append(updateBtn, deleteBtn);
  action.appendChild(actionWrap);

  tr.append(name, date, group, status, registrations, attendees, action);
  return tr;
}

function renderTable() {
  const events = getFilteredEvents();
  eventsTableBody.replaceChildren();

  if (!events.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No events match the current search.";
    row.appendChild(cell);
    eventsTableBody.appendChild(row);
    return;
  }

  [...events]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((event) => {
      eventsTableBody.appendChild(buildTableRow(event));
    });
}

async function saveAndRender(message = "Saved changes to cloud.") {
  await window.AYBStore.saveEvents(state.events);
  renderTable();
  updateSummary();
  showMessage(message);
}

function updateEventField(
  eventId,
  field,
  rawValue,
  options = { persist: false },
) {
  const event = state.events.find((entry) => entry.id === eventId);
  if (!event) {
    return;
  }

  if (field === "registrations" || field === "attendees") {
    event[field] = Math.max(0, window.AYBStore.number(rawValue));
  } else {
    event[field] = String(rawValue || "").trim();
  }

  updateSummary();

  if (field === "registrations") {
    state.pendingRegistrationUpdates.add(eventId);
    setUpdateButtonState(true);
    showMessage("Registration edited. Click Update Registrations to sync.");
    return;
  }

  if (options.persist) {
    void saveAndRender("Changes synced to cloud.");
  }
}

function normalizeEvent(event) {
  return {
    id: String(event.id || createId()),
    name: String(event.name || "Untitled Event").trim(),
    date: String(event.date || ""),
    group: String(event.group || "Upcoming Events"),
    status: event.status === "completed" ? "completed" : "upcoming",
    registrations: Math.max(0, window.AYBStore.number(event.registrations)),
    attendees: Math.max(0, window.AYBStore.number(event.attendees)),
  };
}

saveChangesBtn.addEventListener("click", () => {
  if (!state.pendingRegistrationUpdates.size) {
    return;
  }

  state.pendingRegistrationUpdates.clear();
  setUpdateButtonState(false);
  void saveAndRender("Registration counts synced to cloud.");
});

eventsTableBody.addEventListener("input", (e) => {
  const target = e.target;
  if (
    !(target instanceof HTMLInputElement) ||
    !target.dataset.field ||
    target.dataset.field !== "registrations"
  ) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  updateEventField(row.dataset.id, target.dataset.field, target.value);
  const updateBtn = row.querySelector('[data-action="update-registration"]');
  if (updateBtn instanceof HTMLButtonElement) {
    updateBtn.classList.remove("is-hidden");
  }
});

eventsTableBody.addEventListener("change", (e) => {
  const target = e.target;
  if (!(target instanceof Element)) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  if (target instanceof HTMLInputElement && target.dataset.field) {
    if (target.dataset.field === "registrations") {
      return;
    }
    updateEventField(row.dataset.id, target.dataset.field, target.value, {
      persist: true,
    });
    return;
  }

  if (!(target instanceof HTMLSelectElement) || !target.dataset.field) {
    return;
  }

  updateEventField(row.dataset.id, target.dataset.field, target.value, {
    persist: true,
  });
});

eventsTableBody.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  if (target.dataset.action === "update-registration") {
    if (!state.pendingRegistrationUpdates.size) {
      return;
    }
    state.pendingRegistrationUpdates.clear();
    setUpdateButtonState(false);
    void saveAndRender("Registration counts synced to cloud.");
    return;
  }

  if (target.dataset.action === "delete") {
    state.pendingRegistrationUpdates.delete(row.dataset.id);
    setUpdateButtonState(Boolean(state.pendingRegistrationUpdates.size));
    state.events = state.events.filter((event) => event.id !== row.dataset.id);
    void saveAndRender("Event deleted from cloud data.");
  }
});

addEventForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(addEventForm);
  const newEvent = normalizeEvent({
    id: createId(),
    name: formData.get("name"),
    date: formData.get("date"),
    group: formData.get("group"),
    status: formData.get("status"),
    registrations: formData.get("registrations"),
    attendees: formData.get("attendees"),
  });

  if (!newEvent.name || !newEvent.date) {
    showMessage("Event name and date are required.");
    return;
  }

  state.events.push(newEvent);
  addEventForm.reset();
  void saveAndRender("Event added to cloud data.");
});

manageSearchInput.addEventListener("input", () => {
  state.search = manageSearchInput.value;
  renderTable();
});

exportDataBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.events, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "blueprint-statistics-events.json";
  link.click();
  URL.revokeObjectURL(url);
  showMessage("Exported the current cloud data as JSON.");
});

importDataInput.addEventListener("change", () => {
  const [file] = importDataInput.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) {
        throw new Error("Imported file must contain an array of events.");
      }

      state.events = parsed.map(normalizeEvent);
      void saveAndRender("Imported JSON and replaced the cloud data.");
    } catch (error) {
      showMessage(error.message || "Could not import this JSON file.");
    } finally {
      importDataInput.value = "";
    }
  });
  reader.readAsText(file);
});

resetDataBtn.addEventListener("click", () => {
  void (async () => {
    state.events = await window.AYBStore.resetEvents();
    await saveAndRender("Restored the original sample data in cloud.");
  })();
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
  renderTable();
  updateSummary();
  setUpdateButtonState(false);
})();
