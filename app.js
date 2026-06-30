const PLAN = {
  A: {
    label: "Giorno A",
    focus: "Upper 1",
    exercises: [
      { name: "Lat Machine", sets: 4, target: "6-8" },
      { name: "Chest Press inclinata", sets: 4, target: "8-10" },
      { name: "Rematore macchina (super rowing)", sets: 3, target: "8-10" },
      { name: "Shoulder Press macchina presa neutra", sets: 3, target: "8-10" },
      { name: "Alzate laterali manubri", sets: 4, target: "12-15" },
      { name: "Curl Manubri", sets: 3, target: "8-10" },
      { name: "French Press Cavo", sets: 3, target: "10-12" }
    ]
  },
  B: {
    label: "Giorno B",
    focus: "Upper 2",
    exercises: [
      { name: "Chest Press", sets: 4, target: "6-8" },
      { name: "Lat pull down", sets: 4, target: "6-8" },
      { name: "Distensioni rack (30°)", sets: 3, target: "8-10" },
      { name: "Pulley bilc. gommato Z", sets: 3, target: "8-10" },
      { name: "French machine", sets: 3, target: "10-12" },
      { name: "Curl manubri hummer", sets: 3, target: "10-12" },
      { name: "Push down sbarra", sets: 4, target: "12-15" }
    ]
  },
  C: {
    label: "Giorno C",
    focus: "Lower",
    exercises: [
      { name: "Squat libero", sets: 4, target: "6-8" },
      { name: "Leg Press", sets: 4, target: "8-10" },
      { name: "Leg Curling", sets: 3, target: "10-12" },
      { name: "Leg Extension", sets: 3, target: "10-12" },
      { name: "Calf in piedi macchina", sets: 4, target: "10-15" },
      { name: "Crunch machine", sets: 3, target: "15-20" }
    ]
  },
  D: {
    label: "Giorno D",
    focus: "Delts focus",
    exercises: [
      { name: "Shoulder Press al rack", sets: 4, target: "8-10" },
      { name: "Alzate laterali classica", sets: 4, target: "12-15" },
      { name: "Reverse Pec Deck", sets: 4, target: "12-15" },
      { name: "Laterali ai cavi alternato", sets: 3, target: "12-15" },
      { name: "Trazioni", sets: 3, target: "10-12" },
      { name: "Pushdown ai cavi mezzo triangolo", sets: 2, target: "12-15" }
    ]
  }
};

const STORAGE_KEY = "scheda-palestra-v1";
const $ = (selector) => document.querySelector(selector);

let activeDay = "A";
let deferredPrompt = null;

const tabsEl = $("#dayTabs");
const headerEl = $("#dayHeader");
const listEl = $("#exerciseList");
const dateEl = $("#workoutDate");
const savedCountEl = $("#savedCount");
const toastEl = $("#toast");

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function storage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function currentKey() {
  return `${dateEl.value}__${activeDay}`;
}

function getWorkout(date = dateEl.value, day = activeDay) {
  const data = storage();
  return data[`${date}__${day}`] || { date, day, exercises: {} };
}

function setWorkout(workout) {
  const data = storage();
  data[`${workout.date}__${workout.day}`] = workout;
  saveStorage(data);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function renderTabs() {
  tabsEl.innerHTML = Object.entries(PLAN).map(([key, day]) => `
    <button class="tab ${key === activeDay ? "active" : ""}" data-day="${key}" type="button">
      ${key}
      <span>${day.focus}</span>
    </button>
  `).join("");

  tabsEl.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDay = btn.dataset.day;
      render();
    });
  });
}

function renderHeader() {
  const day = PLAN[activeDay];
  headerEl.innerHTML = `
    <p class="eyebrow">${day.label}</p>
    <h2>${day.focus}</h2>
    <p>${day.exercises.length} esercizi · inserimento rapido serie per serie</p>
  `;
}

function renderExerciseCard(exercise, exerciseIndex, workout) {
  const existing = workout.exercises[exerciseIndex] || {};
  const sets = existing.sets || [];
  const fatigue = existing.fatigue || "";
  const note = existing.note || "";

  const setRows = Array.from({ length: exercise.sets }).map((_, setIndex) => {
    const set = sets[setIndex] || {};
    return `
      <div class="set-row">
        <div class="set-number">${setIndex + 1}</div>
        <input
          class="quick-input reps-input"
          inputmode="numeric"
          autocomplete="off"
          placeholder="Reps"
          value="${escapeHtml(set.reps || "")}"
          data-exercise="${exerciseIndex}"
          data-set="${setIndex}"
          aria-label="Ripetizioni serie ${setIndex + 1} ${exercise.name}"
        />
        <input
          class="quick-input weight-input"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Kg"
          value="${escapeHtml(set.weight || "")}"
          data-exercise="${exerciseIndex}"
          data-set="${setIndex}"
          aria-label="Peso serie ${setIndex + 1} ${exercise.name}"
        />
      </div>
    `;
  }).join("");

  const fatigueButtons = [1, 2, 3, 4, 5].map(value => `
    <button class="fatigue-btn ${Number(fatigue) === value ? "active" : ""}"
      type="button"
      data-exercise="${exerciseIndex}"
      data-fatigue="${value}">
      ${value}
    </button>
  `).join("");

  return `
    <article class="exercise-card" data-exercise-card="${exerciseIndex}">
      <div class="exercise-top">
        <h3 class="exercise-title">${escapeHtml(exercise.name)}</h3>
        <div class="exercise-meta">${exercise.sets}×${exercise.target}</div>
      </div>
      <div class="set-grid">${setRows}</div>
      <div class="fatigue-block">
        <div class="fatigue-label">
          <span>Stanchezza</span>
          <span>1 bassa · 5 alta</span>
        </div>
        <div class="fatigue-options">${fatigueButtons}</div>
      </div>
      <textarea
        class="note-area"
        placeholder="Nota veloce, fastidi, esecuzione..."
        data-note="${exerciseIndex}"
        aria-label="Note per ${exercise.name}"
      >${escapeHtml(note)}</textarea>
    </article>
  `;
}

function renderExercises() {
  const workout = getWorkout();
  listEl.innerHTML = PLAN[activeDay].exercises
    .map((exercise, index) => renderExerciseCard(exercise, index, workout))
    .join("");

  listEl.querySelectorAll(".reps-input, .weight-input").forEach(input => {
    input.addEventListener("input", persistFromUI);
  });

  listEl.querySelectorAll(".fatigue-btn").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".exercise-card");
      card.querySelectorAll(".fatigue-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      persistFromUI();
    });
  });

  listEl.querySelectorAll(".note-area").forEach(input => {
    input.addEventListener("input", persistFromUI);
  });
}

function persistFromUI() {
  const workout = {
    date: dateEl.value,
    day: activeDay,
    updatedAt: new Date().toISOString(),
    exercises: {}
  };

  PLAN[activeDay].exercises.forEach((exercise, exerciseIndex) => {
    const card = listEl.querySelector(`[data-exercise-card="${exerciseIndex}"]`);
    if (!card) return;

    const sets = Array.from({ length: exercise.sets }).map((_, setIndex) => {
      const reps = card.querySelector(`.reps-input[data-set="${setIndex}"]`)?.value.trim() || "";
      const weight = card.querySelector(`.weight-input[data-set="${setIndex}"]`)?.value.trim() || "";
      return { reps, weight };
    });

    const activeFatigue = card.querySelector(".fatigue-btn.active")?.dataset.fatigue || "";
    const note = card.querySelector(".note-area")?.value.trim() || "";

    workout.exercises[exerciseIndex] = {
      name: exercise.name,
      target: `${exercise.sets}×${exercise.target}`,
      sets,
      fatigue: activeFatigue,
      note
    };
  });

  setWorkout(workout);
  updateSavedCount();
}

function updateSavedCount() {
  const workout = getWorkout();
  const completed = Object.values(workout.exercises || {}).filter(ex => {
    const hasSet = (ex.sets || []).some(set => set.reps || set.weight);
    return hasSet || ex.fatigue || ex.note;
  }).length;
  savedCountEl.textContent = `${completed} esercizi salvati`;
}

function clearCurrentDay() {
  const data = storage();
  delete data[currentKey()];
  saveStorage(data);
  render();
  showToast("Giorno svuotato");
}

function renderHistory() {
  const data = storage();
  const entries = Object.values(data)
    .sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date))
    .slice(0, 20);

  const content = $("#historyContent");

  if (!entries.length) {
    content.innerHTML = `<p class="small-muted">Nessun allenamento salvato.</p>`;
    return;
  }

  content.innerHTML = entries.map(entry => {
    const filled = Object.values(entry.exercises || {}).filter(ex =>
      (ex.sets || []).some(set => set.reps || set.weight) || ex.fatigue || ex.note
    ).length;
    const day = PLAN[entry.day];
    return `
      <div class="history-item">
        <strong>${formatDate(entry.date)} · ${day?.label || entry.day} (${day?.focus || ""})</strong>
        <p>${filled} esercizi compilati</p>
      </div>
    `;
  }).join("");
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  renderTabs();
  renderHeader();
  renderExercises();
  updateSavedCount();
  renderHistory();
}

function setupInstallPrompt() {
  const installBtn = $("#installBtn");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.remove("hidden");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add("hidden");
  });
}

function init() {
  dateEl.value = todayISO();

  dateEl.addEventListener("change", render);

  $("#saveAllBtn").addEventListener("click", () => {
    persistFromUI();
    showToast("Allenamento salvato");
  });

  $("#clearDayBtn").addEventListener("click", () => {
    const confirmClear = confirm("Vuoi svuotare i dati di questo giorno?");
    if (confirmClear) clearCurrentDay();
  });

  $("#toggleHistoryBtn").addEventListener("click", () => {
    const content = $("#historyContent");
    const span = $("#toggleHistoryBtn span");
    content.classList.toggle("hidden");
    span.textContent = content.classList.contains("hidden") ? "Apri" : "Chiudi";
    renderHistory();
  });

  setupInstallPrompt();
  render();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

init();
