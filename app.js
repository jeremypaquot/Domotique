// Endpoint public en lecture seule. Ne jamais ajouter la clé API d'écriture ici.
const API_URL = "https://api-esp32.jeremypaquotdesign.workers.dev/mesures";
const REFRESH_INTERVAL_MS = 30_000;

const elements = {
  connectionStatus: document.querySelector("#connectionStatus"),
  connectionText: document.querySelector("#connectionText"),
  refreshButton: document.querySelector("#refreshButton"),
  lastUpdate: document.querySelector("#lastUpdate"),
  headerTemperature: document.querySelector("#headerTemperature"),
  temperature: document.querySelector("#temperature"),
  temperatureNote: document.querySelector("#temperatureNote"),
  humidity: document.querySelector("#humidity"),
  humidityNote: document.querySelector("#humidityNote"),
  chartCanvas: document.querySelector("#historyChart"),
  emptyState: document.querySelector("#emptyState"),
  emptyTitle: document.querySelector("#emptyTitle"),
  emptyMessage: document.querySelector("#emptyMessage")
};

let historyChart = null;
let refreshInProgress = false;

function setConnectionState(state, label) {
  elements.connectionStatus.className = `status status-${state}`;
  elements.connectionText.textContent = label;
}

function parseApiDate(value) {
  if (!value) return null;

  // D1 CURRENT_TIMESTAMP renvoie généralement une date UTC sans suffixe de fuseau.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseApiDate(value);
  if (!date) return "date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatChartTime(value) {
  const date = parseApiDate(value);
  if (!date) return "--:--";

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function normalizeMeasurement(item) {
  if (!item || typeof item !== "object") return null;

  const temperature = Number(item.temperature);
  const humidity = Number(item.humidite);

  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return null;

  return {
    temperature,
    humidity,
    date: item.date_mesure ?? null
  };
}

function getComfortNote(type, value) {
  if (type === "temperature") {
    if (value < 18) return "Ambiance fraîche";
    if (value <= 24) return "Température confortable";
    return "Ambiance chaude";
  }

  if (value < 40) return "Air plutôt sec";
  if (value <= 60) return "Niveau confortable";
  return "Air plutôt humide";
}

function showEmptyState(title, message) {
  elements.emptyTitle.textContent = title;
  elements.emptyMessage.textContent = message;
  elements.emptyState.hidden = false;
  elements.chartCanvas.hidden = true;
}

function hideEmptyState() {
  elements.emptyState.hidden = true;
  elements.chartCanvas.hidden = false;
}

function resetMetrics(note = "En attente d’une mesure") {
  elements.headerTemperature.textContent = "--";
  elements.temperature.textContent = "--";
  elements.humidity.textContent = "--";
  elements.temperatureNote.textContent = note;
  elements.humidityNote.textContent = note;
  elements.lastUpdate.textContent = "Dernière mesure : aucune donnée disponible";
}

function updateMetrics(measurement) {
  const formattedTemperature = measurement.temperature.toLocaleString("fr-FR", {
    maximumFractionDigits: 1
  });
  elements.headerTemperature.textContent = formattedTemperature;
  elements.temperature.textContent = formattedTemperature;
  elements.humidity.textContent = measurement.humidity.toLocaleString("fr-FR", {
    maximumFractionDigits: 1
  });
  elements.temperatureNote.textContent = getComfortNote("temperature", measurement.temperature);
  elements.humidityNote.textContent = getComfortNote("humidity", measurement.humidity);
  elements.lastUpdate.textContent = `Dernière mesure : ${formatDate(measurement.date)}`;
}

function renderChart(measurements) {
  if (typeof Chart === "undefined") {
    showEmptyState(
      "Graphique indisponible",
      "La bibliothèque du graphique n’a pas pu être chargée. Les dernières valeurs restent visibles."
    );
    return;
  }

  hideEmptyState();
  const chronological = [...measurements].reverse();
  const labels = chronological.map((item) => formatChartTime(item.date));

  if (historyChart) {
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = chronological.map((item) => item.temperature);
    historyChart.data.datasets[1].data = chronological.map((item) => item.humidity);
    historyChart.update();
    return;
  }

  historyChart = new Chart(elements.chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Température (°C)",
          data: chronological.map((item) => item.temperature),
          borderColor: "#ffbd66",
          backgroundColor: "rgba(255, 189, 102, 0.12)",
          yAxisID: "temperatureAxis",
          tension: 0.36,
          borderWidth: 2,
          pointRadius: measurements.length < 12 ? 3 : 0,
          pointHoverRadius: 5,
          fill: true
        },
        {
          label: "Humidité (%)",
          data: chronological.map((item) => item.humidity),
          borderColor: "#59b7ff",
          backgroundColor: "rgba(89, 183, 255, 0.05)",
          yAxisID: "humidityAxis",
          tension: 0.36,
          borderWidth: 2,
          pointRadius: measurements.length < 12 ? 3 : 0,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#17282a",
          borderColor: "rgba(178, 216, 209, 0.18)",
          borderWidth: 1,
          padding: 11,
          titleColor: "#91a6a3",
          bodyColor: "#f4f8f7"
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#718784", maxTicksLimit: 8, maxRotation: 0 }
        },
        temperatureAxis: {
          position: "left",
          grid: { color: "rgba(178, 216, 209, 0.07)" },
          border: { display: false },
          ticks: { color: "#718784", callback: (value) => `${value}°` }
        },
        humidityAxis: {
          position: "right",
          min: 0,
          max: 100,
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#718784", callback: (value) => `${value}%` }
        }
      }
    }
  });
}

async function loadMeasurements() {
  if (refreshInProgress) return;

  refreshInProgress = true;
  elements.refreshButton.disabled = true;
  elements.refreshButton.classList.add("is-loading");
  setConnectionState("loading", "Connexion…");

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Format de réponse inattendu");
    }

    if (payload.length === 0) {
      resetMetrics();
      showEmptyState(
        "Aucune mesure disponible",
        "Les données apparaîtront ici dès que l’ESP32 en aura envoyé."
      );
      setConnectionState("online", "API connectée");
      return;
    }

    const measurements = payload.slice(0, 50).map(normalizeMeasurement).filter(Boolean);
    if (measurements.length === 0) {
      resetMetrics("Données reçues incomplètes");
      showEmptyState(
        "Données incomplètes",
        "L’API a répondu, mais aucune mesure ne contient une température et une humidité valides."
      );
      setConnectionState("error", "Données invalides");
      return;
    }

    updateMetrics(measurements[0]);
    renderChart(measurements);
    setConnectionState("online", "API connectée");
  } catch (error) {
    console.error("Impossible de charger les mesures :", error);
    setConnectionState("error", "API indisponible");
    showEmptyState(
      "Connexion impossible",
      `${error.message}. Une nouvelle tentative aura lieu automatiquement.`
    );
  } finally {
    refreshInProgress = false;
    elements.refreshButton.disabled = false;
    elements.refreshButton.classList.remove("is-loading");
  }
}

elements.refreshButton.addEventListener("click", loadMeasurements);
loadMeasurements();
window.setInterval(loadMeasurements, REFRESH_INTERVAL_MS);
