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

function formatVolume(value) {
  if (!value) return "—";
  return `${Math.round(value).toLocaleString("it-IT")} kg`;
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

function findPreviousExercise(exerciseIndex, exerciseName) {
  const selectedDate = dateEl.value;
  const entries = getAllWorkouts()
    .filter(entry => entry.date < selectedDate);

  const sameDay = entries.find(entry => {
    const ex = entry.exercises?.[exerciseIndex];
    return entry.day === activeDay && ex && (ex.name === exerciseName || PLAN[activeDay].exercises[exerciseIndex]?.name === exerciseName);
  });

  if (sameDay) {
    return {
      date: sameDay.date,
      day: sameDay.day,
      exercise: sameDay.exercises[exerciseIndex]
    };
  }

  const sameName = entries.find(entry => {
    return Object.values(entry.exercises || {}).some(ex => ex?.name === exerciseName);
  });

  if (sameName) {
    const exercise = Object.values(sameName.exercises || {}).find(ex => ex?.name === exerciseName);
    return {
      date: sameName.date,
      day: sameName.day,
      exercise
    };
  }

  return null;
}

function findPreviousWorkoutSameDay() {
  const selectedDate = dateEl.value;
  return getAllWorkouts().find(entry => entry.day === activeDay && entry.date < selectedDate) || null;
}

function getDayStats(workout) {
  const exercises = Object.values(workout?.exercises || {});
  let volume = 0;
  let filled = 0;
  let fatigueSum = 0;
  let fatigueCount = 0;

  exercises.forEach(ex => {
    const stats = getExerciseStats(ex);
    volume += stats.volume;
    if (stats.filledSets || stats.fatigue || stats.note) filled += 1;
    if (Number(ex.fatigue)) {
      fatigueSum += Number(ex.fatigue);
      fatigueCount += 1;
    }
  });

  return {
    volume,
    filled,
    avgFatigue: fatigueCount ? fatigueSum / fatigueCount : 0
  };
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
  if (!prev) return "Ultima volta: nessun dato salvato";

  const stats = getExerciseStats(prev.exercise);
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
  const current = getDayStats(getWorkout());
  const previous = findPreviousWorkoutSameDay();
  const previousStats = previous ? getDayStats(previous) : null;
  const volumeDelta = previousStats ? current.volume - previousStats.volume : 0;

  headerEl.innerHTML = `
    <p class="eyebrow">${day.label}</p>
    <h2>${day.focus}</h2>
    <p>${day.exercises.length} esercizi · apri un esercizio, compila e confronta con la volta precedente.</p>
    <div class="day-progress">
      <div class="progress-box">
        <span>Volume oggi</span>
        <strong>${formatVolume(current.volume)}</strong>
      </div>
      <div class="progress-box">
        <span>Vs ultima volta</span>
        <strong class="${previousStats ? deltaClass(volumeDelta) : "delta-neutral"}">${previousStats ? deltaLabel(Math.round(volumeDelta), "kg") : "nessun dato"}</strong>
      </div>
    </div>
  `;
}

function isExerciseFilled(exerciseData) {
  const stats = getExerciseStats(exerciseData);
  return Boolean(stats.filledSets || stats.fatigue || stats.note);
}

function renderExerciseCard(exercise, exerciseIndex, workout) {
  const existing = workout.exercises[exerciseIndex] || {};
  const sets = existing.sets || [];
  const fatigue = existing.fatigue || "";
  const note = existing.note || "";
  const filled = isExerciseFilled(existing);
  const currentStats = getExerciseStats(existing);
  const prev = findPreviousExercise(exerciseIndex, exercise.name);
  const prevStats = prev ? getExerciseStats(prev.exercise) : null;
  const topDelta = prevStats ? currentStats.topWeight - prevStats.topWeight : 0;
  const fatigueWidth = fatigue ? `${Number(fatigue) * 20}%` : "0%";

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
            <span>Progressione peso top</span>
            <span data-delta="${exerciseIndex}">${progressLabel}</span>
          </div>
        </div>

        <div class="set-grid">${setRows}</div>

        <div class="fatigue-block">
          <div class="fatigue-label">
            <span>Stanchezza percepita</span>
            <span data-fatigue-text="${exerciseIndex}">${fatigue ? `${fatigue}/5` : "non indicata"}</span>
          </div>
          <div class="fatigue-options">${fatigueButtons}</div>
          <div class="fatigue-status" data-fatigue-bar="${exerciseIndex}" style="--fatigue-width: ${fatigueWidth};"></div>
        </div>

        <textarea
          class="note-area"
          placeholder="Nota veloce, fastidi, esecuzione..."
          data-note="${exerciseIndex}"
          aria-label="Note per ${exercise.name}"
        >${escapeHtml(note)}</textarea>
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
      renderHeader();
    });
  });

  listEl.querySelectorAll(".fatigue-btn").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".exercise-card");
      card.querySelectorAll(".fatigue-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      persistFromUI();
      updateExerciseStats(Number(button.dataset.exercise));
      renderHeader();
    });
  });

  listEl.querySelectorAll(".note-area").forEach(input => {
    input.addEventListener("input", () => {
      persistFromUI();
      updateExerciseStats(Number(input.dataset.note));
      renderHeader();
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
  renderHistory();
}

function updateExerciseStats(exerciseIndex) {
  const workout = getWorkout();
  const exercise = PLAN[activeDay].exercises[exerciseIndex];
  const current = workout.exercises[exerciseIndex] || {};
  const currentStats = getExerciseStats(current);
  const prev = findPreviousExercise(exerciseIndex, exercise.name);
  const prevStats = prev ? getExerciseStats(prev.exercise) : null;
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
    fatigueText.textContent = currentStats.fatigue ? `${currentStats.fatigue}/5` : "non indicata";
  }

  const fatigueBar = listEl.querySelector(`[data-fatigue-bar="${exerciseIndex}"]`);
  if (fatigueBar) {
    fatigueBar.style.setProperty("--fatigue-width", currentStats.fatigue ? `${Number(currentStats.fatigue) * 20}%` : "0%");
  }
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
  const entries = getAllWorkouts().slice(0, 20);
  const content = $("#historyContent");

  if (!entries.length) {
    content.innerHTML = `<p class="exercise-subline">Nessun allenamento salvato.</p>`;
    return;
  }

  content.innerHTML = entries.map(entry => {
    const stats = getDayStats(entry);
    const day = PLAN[entry.day];
    const fatigue = stats.avgFatigue ? ` · fatica media ${stats.avgFatigue.toFixed(1).replace(".", ",")}/5` : "";
    return `
      <div class="history-item">
        <strong>${formatDate(entry.date)} · ${day?.label || entry.day} (${day?.focus || ""})</strong>
        <p>${stats.filled} esercizi compilati · volume ${formatVolume(stats.volume)}${fatigue}</p>
      </div>
    `;
  }).join("");
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

  $("#openAllBtn").addEventListener("click", () => {
    listEl.querySelectorAll(".exercise-card").forEach(card => card.open = true);
  });

  $("#closeAllBtn").addEventListener("click", () => {
    listEl.querySelectorAll(".exercise-card").forEach(card => card.open = false);
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
