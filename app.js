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
let expandedHistory = {};

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

function historyKey(exerciseIndex) {
  return `${activeDay}_${exerciseIndex}`;
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

function parseNumber(value) {
  if (value === undefined || value === null) return 0;
  const normalized = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function getExerciseStats(exerciseData) {
  const sets = exerciseData?.sets || [];
  let topWeight = 0;
  let topReps = 0;
  let volume = 0;
  let filledSets = 0;

  sets.forEach(set => {
    const weight = parseNumber(set.weight);
    const reps = parseNumber(set.reps);

    if (weight || reps) filledSets += 1;
    if (weight && reps) volume += weight * reps;

    if (weight > topWeight || (weight === topWeight && reps > topReps)) {
      topWeight = weight;
      topReps = reps;
    }
  });

  return {
    topWeight,
    topReps,
    volume,
    filledSets,
    fatigue: exerciseData?.fatigue || "",
    note: exerciseData?.note || ""
  };
}

function formatKg(value) {
  if (!value) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} kg`;
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

function getAllWorkouts() {
  return Object.values(storage())
    .filter(entry => entry && entry.date && entry.day && entry.exercises)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function getExerciseHistory(exerciseIndex, exerciseName) {
  const selectedDate = dateEl.value;

  return getAllWorkouts()
    .filter(entry => entry.date < selectedDate)
    .map(entry => {
      let exercise = null;

      if (entry.day === activeDay && entry.exercises?.[exerciseIndex]) {
        exercise = entry.exercises[exerciseIndex];
      }

      if (!exercise) {
        exercise = Object.values(entry.exercises || {}).find(ex => ex?.name === exerciseName) || null;
      }

      if (!exercise) return null;

      return {
        date: entry.date,
        day: entry.day,
        exercise,
        stats: getExerciseStats(exercise)
      };
    })
    .filter(Boolean);
}

function findPreviousExercise(exerciseIndex, exerciseName) {
  return getExerciseHistory(exerciseIndex, exerciseName)[0] || null;
}

function deltaClass(delta) {
  if (delta > 0) return "delta-up";
  if (delta < 0) return "delta-down";
  return "delta-neutral";
}

function deltaLabel(delta, suffix = "kg") {
  if (!delta) return "pari";
  const sign = delta > 0 ? "+" : "";
  const value = Number.isInteger(delta) ? delta : delta.toFixed(1).replace(".", ",");
  return `${sign}${value} ${suffix}`;
}

function previousLine(exerciseIndex, exerciseName) {
  const prev = findPreviousExercise(exerciseIndex, exerciseName);
  if (!prev) return "Ultima volta: nessun dato";

  const stats = prev.stats;
  const fatigue = stats.fatigue ? ` · fatica ${stats.fatigue}/5` : "";
  const top = stats.topWeight ? `${formatKg(stats.topWeight)} × ${stats.topReps || "?"}` : "dato parziale";
  return `Ultima: ${top}${fatigue} · ${formatDate(prev.date)}`;
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
    <p>${day.exercises.length} esercizi · apri solo quello che stai eseguendo.</p>
  `;
}

function isExerciseFilled(exerciseData) {
  const stats = getExerciseStats(exerciseData);
  return Boolean(stats.filledSets || stats.fatigue || stats.note);
}

function fatigueLabel(value) {
  const labels = {
    "1": "leggera",
    "2": "gestibile",
    "3": "media",
    "4": "alta",
    "5": "massima"
  };
  return labels[String(value)] || "non indicata";
}

function setsSummary(sets = []) {
  const filled = sets
    .map((set, index) => {
      const reps = set.reps || "—";
      const weight = set.weight || "—";
      const hasData = set.reps || set.weight;
      return hasData ? `S${index + 1}: ${weight}kg × ${reps}` : null;
    })
    .filter(Boolean);

  return filled.length ? filled.join(" · ") : "Nessuna serie compilata";
}

function renderExerciseHistory(exerciseIndex, exerciseName) {
  const history = getExerciseHistory(exerciseIndex, exerciseName);
  const key = historyKey(exerciseIndex);
  const showAll = expandedHistory[key];
  const visible = showAll ? history : history.slice(0, 3);

  if (!history.length) {
    return `
      <details class="exercise-history">
        <summary class="history-summary">
          Storico esercizio
          <span>0</span>
        </summary>
        <div class="history-list">
          <p class="empty-history">Quando salverai altri allenamenti, li vedrai qui.</p>
        </div>
      </details>
    `;
  }

  const rows = visible.map(item => {
    const top = item.stats.topWeight ? `${formatKg(item.stats.topWeight)} × ${item.stats.topReps || "?"}` : "dato parziale";
    const fatigue = item.stats.fatigue ? `Fatica ${item.stats.fatigue}/5` : "Fatica n.d.";
    const note = item.stats.note ? `<div class="history-note">${escapeHtml(item.stats.note)}</div>` : "";

    return `
      <div class="history-row">
        <div class="history-row-main">
          <strong>${formatDate(item.date)}</strong>
          <span>${top} · ${fatigue}</span>
        </div>
        <div class="history-row-sets">${escapeHtml(setsSummary(item.exercise.sets))}</div>
        ${note}
      </div>
    `;
  }).join("");

  const moreButton = history.length > 3
    ? `<button class="show-more-history" type="button" data-history-toggle="${exerciseIndex}">
        ${showAll ? "Mostra meno" : `Mostra tutte (${history.length})`}
      </button>`
    : "";

  return `
    <details class="exercise-history">
      <summary class="history-summary">
        Storico esercizio
        <span>${history.length}</span>
      </summary>
      <div class="history-list" data-history-list="${exerciseIndex}">
        ${rows}
        ${moreButton}
      </div>
    </details>
  `;
}

function renderExerciseCard(exercise, exerciseIndex, workout) {
  const existing = workout.exercises[exerciseIndex] || {};
  const sets = existing.sets || [];
  const fatigue = existing.fatigue || "3";
  const savedFatigue = existing.fatigue || "";
  const note = existing.note || "";
  const filled = isExerciseFilled(existing);
  const currentStats = getExerciseStats(existing);
  const prev = findPreviousExercise(exerciseIndex, exercise.name);
  const prevStats = prev ? prev.stats : null;
  const topDelta = prevStats ? currentStats.topWeight - prevStats.topWeight : 0;

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

  const currentLabel = currentStats.topWeight
    ? `${formatKg(currentStats.topWeight)} × ${currentStats.topReps || "?"}`
    : "non compilato";

  const progressLabel = prevStats
    ? `<strong class="${deltaClass(topDelta)}">${currentStats.topWeight ? deltaLabel(topDelta, "kg") : "compila per confronto"}</strong>`
    : `<strong class="delta-neutral">nessun dato precedente</strong>`;

  return `
    <details class="exercise-card" data-exercise-card="${exerciseIndex}" ${filled ? "open" : ""}>
      <summary class="exercise-summary">
        <div class="summary-content">
          <div>
            <h3 class="exercise-title">${escapeHtml(exercise.name)}</h3>
            <p class="exercise-subline">Target: ${exercise.sets}×${exercise.target}</p>
            <p class="last-line" data-prev-line="${exerciseIndex}">${previousLine(exerciseIndex, exercise.name)}</p>
          </div>
          <div class="chevron">⌄</div>
        </div>
      </summary>

      <div class="exercise-body">
        <div class="exercise-meta-row">
          <div class="metric-pill">
            <span>Oggi</span>
            <strong data-current-top="${exerciseIndex}">${currentLabel}</strong>
          </div>
          <div class="metric-pill">
            <span>Vs ultima volta</span>
            <span data-delta="${exerciseIndex}">${progressLabel}</span>
          </div>
        </div>

        <div class="set-grid">${setRows}</div>

        <div class="fatigue-block">
          <div class="fatigue-label">
            <span>Stanchezza percepita</span>
            <span class="fatigue-value" data-fatigue-text="${exerciseIndex}">
              ${savedFatigue ? `${savedFatigue}/5 · ${fatigueLabel(savedFatigue)}` : "non indicata"}
            </span>
          </div>
          <div class="fatigue-slider-wrap">
            <input
              class="fatigue-slider"
              type="range"
              min="1"
              max="5"
              step="1"
              value="${escapeHtml(fatigue)}"
              data-fatigue-range="${exerciseIndex}"
              aria-label="Stanchezza percepita ${exercise.name}"
            />
            <div class="fatigue-scale" aria-hidden="true">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
        </div>

        <textarea
          class="note-area"
          placeholder="Nota veloce, fastidi, esecuzione..."
          data-note="${exerciseIndex}"
          aria-label="Note per ${exercise.name}"
        >${escapeHtml(note)}</textarea>

        ${renderExerciseHistory(exerciseIndex, exercise.name)}
      </div>
    </details>
  `;
}

function renderExercises() {
  const workout = getWorkout();
  listEl.innerHTML = PLAN[activeDay].exercises
    .map((exercise, index) => renderExerciseCard(exercise, index, workout))
    .join("");

  listEl.querySelectorAll(".reps-input, .weight-input").forEach(input => {
    input.addEventListener("input", () => {
      persistFromUI();
      updateExerciseStats(Number(input.dataset.exercise));
    });
  });

  listEl.querySelectorAll(".fatigue-slider").forEach(input => {
    input.addEventListener("input", () => {
      persistFromUI();
      updateExerciseStats(Number(input.dataset.fatigueRange));
    });
  });

  listEl.querySelectorAll(".note-area").forEach(input => {
    input.addEventListener("input", () => {
      persistFromUI();
      updateExerciseStats(Number(input.dataset.note));
    });
  });

  listEl.querySelectorAll("[data-history-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const exerciseIndex = Number(button.dataset.historyToggle);
      const key = historyKey(exerciseIndex);
      expandedHistory[key] = !expandedHistory[key];
      persistFromUI();
      renderExercises();
    });
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

    const fatigueInput = card.querySelector(`[data-fatigue-range="${exerciseIndex}"]`);
    const hasFatigueAlready = card.querySelector(`[data-fatigue-text="${exerciseIndex}"]`)?.textContent.includes("/5");
    const fatigue = fatigueInput && (hasFatigueAlready || fatigueInput.matches(":focus")) ? fatigueInput.value : (getWorkout().exercises?.[exerciseIndex]?.fatigue || "");
    const note = card.querySelector(".note-area")?.value.trim() || "";

    workout.exercises[exerciseIndex] = {
      name: exercise.name,
      target: `${exercise.sets}×${exercise.target}`,
      sets,
      fatigue,
      note
    };
  });

  setWorkout(workout);
  updateSavedCount();
}

function updateExerciseStats(exerciseIndex) {
  const workout = getWorkout();
  const exercise = PLAN[activeDay].exercises[exerciseIndex];
  const current = workout.exercises[exerciseIndex] || {};
  const currentStats = getExerciseStats(current);
  const prev = findPreviousExercise(exerciseIndex, exercise.name);
  const prevStats = prev ? prev.stats : null;
  const topDelta = prevStats ? currentStats.topWeight - prevStats.topWeight : 0;

  const topEl = listEl.querySelector(`[data-current-top="${exerciseIndex}"]`);
  if (topEl) {
    topEl.textContent = currentStats.topWeight
      ? `${formatKg(currentStats.topWeight)} × ${currentStats.topReps || "?"}`
      : "non compilato";
  }

  const deltaEl = listEl.querySelector(`[data-delta="${exerciseIndex}"]`);
  if (deltaEl) {
    if (!prevStats) {
      deltaEl.innerHTML = `<strong class="delta-neutral">nessun dato precedente</strong>`;
    } else if (!currentStats.topWeight) {
      deltaEl.innerHTML = `<strong class="delta-neutral">compila per confronto</strong>`;
    } else {
      deltaEl.innerHTML = `<strong class="${deltaClass(topDelta)}">${deltaLabel(topDelta, "kg")}</strong>`;
    }
  }

  const fatigueText = listEl.querySelector(`[data-fatigue-text="${exerciseIndex}"]`);
  if (fatigueText) {
    fatigueText.textContent = currentStats.fatigue
      ? `${currentStats.fatigue}/5 · ${fatigueLabel(currentStats.fatigue)}`
      : "non indicata";
  }
}

function updateSavedCount() {
  const workout = getWorkout();
  const completed = Object.values(workout.exercises || {}).filter(ex => {
    const hasSet = (ex.sets || []).some(set => set.reps || set.weight);
    return hasSet || ex.fatigue || ex.note;
  }).length;
  savedCountEl.textContent = `${completed} salvati`;
}

function clearCurrentDay() {
  const data = storage();
  delete data[currentKey()];
  saveStorage(data);
  render();
  showToast("Giorno svuotato");
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

  $("#openAllBtn").addEventListener("click", () => {
    listEl.querySelectorAll(".exercise-card").forEach(card => card.open = true);
  });

  $("#closeAllBtn").addEventListener("click", () => {
    listEl.querySelectorAll(".exercise-card").forEach(card => card.open = false);
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
