import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";
import RadarMap from "./RadarMap";
import StormTracker from "./StormTracker";
import {
  WiDaySunny,
  WiCloud,
  WiRain,
  WiHumidity,
  WiBarometer,
  WiThermometer,
  WiWindy,
  WiHot,
  WiSnowflakeCold,
  WiUmbrella,
  WiNightClear,
} from "react-icons/wi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MdShowChart } from "react-icons/md";

// Componente bussola vento
const WindCompass = ({ degrees, isLight }) => {
  if (degrees == null) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const label = dirs[Math.round(degrees / 45) % 8];

  const size = 140;
  const cx = size / 2,
    cy = size / 2,
    r = 52;
  const toRad = (deg) => (deg - 90) * (Math.PI / 180);
  const tipLen = 41,
    tailLen = 22,
    halfW = 8;

  const tipX = cx + tipLen * Math.cos(toRad(degrees));
  const tipY = cy + tipLen * Math.sin(toRad(degrees));
  const tailX = cx - tailLen * Math.cos(toRad(degrees));
  const tailY = cy - tailLen * Math.sin(toRad(degrees));
  const perpRad = toRad(degrees) + Math.PI / 2;

  // triangolo punta (bianco pieno)
  const blx = cx + halfW * Math.cos(perpRad);
  const bly = cy + halfW * Math.sin(perpRad);
  const brx = cx - halfW * Math.cos(perpRad);
  const bry = cy - halfW * Math.sin(perpRad);

  // triangolo coda (semi-trasparente)
  const btlx = tailX + halfW * 0.6 * Math.cos(perpRad);
  const btly = tailY + halfW * 0.6 * Math.sin(perpRad);
  const btrx = tailX - halfW * 0.6 * Math.cos(perpRad);
  const btry = tailY - halfW * 0.6 * Math.sin(perpRad);

  const c = isLight
    ? {
        ring: "rgba(71,85,105,0.15)",
        ringStroke: "rgba(71,85,105,0.4)",
        tick: "rgba(71,85,105,0.5)",
        labelN: "#475569",
        labelOther: "rgba(71,85,105,0.85)",
        arrow: "#475569",
        arrowBody: "rgba(71,85,105,0.45)",
        arrowTail: "rgba(71,85,105,0.35)",
        center: "#475569",
      }
    : {
        ring: "rgba(255,255,255,0.08)",
        ringStroke: "rgba(255,255,255,0.35)",
        tick: "rgba(255,255,255,0.45)",
        labelN: "white",
        labelOther: "rgba(255,255,255,0.85)",
        arrow: "white",
        arrowBody: "rgba(255,255,255,0.4)",
        arrowTail: "rgba(255,255,255,0.35)",
        center: "white",
      };

  return (
    <div className="wind-compass">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={c.ring}
          stroke={c.ringStroke}
          strokeWidth="1.5"
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const ar = ((a - 90) * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={cx + (r - 6) * Math.cos(ar)}
              y1={cy + (r - 6) * Math.sin(ar)}
              x2={cx + r * Math.cos(ar)}
              y2={cy + r * Math.sin(ar)}
              stroke={c.tick}
              strokeWidth="1"
            />
          );
        })}
        <text
          x={cx}
          y={cy - r + 13}
          textAnchor="middle"
          fill={c.labelN}
          fontSize="13"
          fontWeight="700"
        >
          N
        </text>
        <text
          x={cx}
          y={cy + r - 4}
          textAnchor="middle"
          fill={c.labelOther}
          fontSize="11"
          fontWeight="600"
        >
          S
        </text>
        <text
          x={cx + r - 5}
          y={cy + 4}
          textAnchor="middle"
          fill={c.labelOther}
          fontSize="11"
          fontWeight="600"
        >
          E
        </text>
        <text
          x={cx - r + 5}
          y={cy + 4}
          textAnchor="middle"
          fill={c.labelOther}
          fontSize="11"
          fontWeight="600"
        >
          O
        </text>
        {/* triangolo punta */}
        <polygon
          points={`${tipX},${tipY} ${blx},${bly} ${brx},${bry}`}
          fill={c.arrow}
        />
        {/* corpo ago */}
        <line
          x1={cx}
          y1={cy}
          x2={tailX}
          y2={tailY}
          stroke={c.arrowBody}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* triangolo coda */}
        <polygon
          points={`${tailX},${tailY} ${btlx},${btly} ${btrx},${btry}`}
          fill={c.arrowTail}
        />
        <circle
          cx={cx}
          cy={cy}
          r="7"
          fill={c.center}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
        />
      </svg>
      <div className="wind-compass-label">
        {label} {Math.round(degrees)}°
      </div>
    </div>
  );
};

// Componente sparkline pressione
const PressureSparkline = ({ data, isLight }) => {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({
    t: d.t?.substring(11, 16) ?? "",
    p: d.p,
  }));
  const values = formatted.map((d) => d.p);
  const minP = Math.min(...values);
  const maxP = Math.max(...values);
  const domain = [Math.floor(minP - 0.5), Math.ceil(maxP + 0.5)];
  // Mostra solo ogni 12 tick (ogni ~1 ora)
  const tickIndexes = formatted.map((d, i) => i).filter((i) => i % 12 === 0);

  return (
    <div className="pressure-sparkline">
      <div className="metric-header">
        <MdShowChart size={28} />
        <span>Pressione ultime 24h</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <AreaChart
          data={formatted}
          margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={
                  isLight ? "rgba(71,85,105,0.5)" : "rgba(255,255,255,0.6)"
                }
                stopOpacity={0.6}
              />
              <stop
                offset="95%"
                stopColor={
                  isLight ? "rgba(71,85,105,0)" : "rgba(255,255,255,0)"
                }
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            ticks={tickIndexes.map((i) => formatted[i]?.t)}
            tick={{
              fill: isLight ? "rgba(71,85,105,0.8)" : "rgba(255,255,255,0.7)",
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{
              fill: isLight ? "rgba(71,85,105,0.8)" : "rgba(255,255,255,0.7)",
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.6)",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontSize: 11,
            }}
            formatter={(v) => [`${v.toFixed(1)} hPa`, "Pressione"]}
            labelFormatter={(l) => `Ore ${l}`}
          />
          <Area
            type="monotone"
            dataKey="p"
            stroke={isLight ? "rgba(71,85,105,0.9)" : "rgba(255,255,255,0.9)"}
            strokeWidth={1.5}
            fill="url(#pressGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Componente sparkline umidità
const HumiditySparkline = ({ data, isLight }) => {
  if (!data || data.length === 0) return null;
  const formatted = data.map((d) => ({
    t: d.t?.substring(11, 16) ?? "",
    h: d.h,
  }));
  const tickIndexes = formatted.map((d, i) => i).filter((i) => i % 12 === 0);

  return (
    <div className="pressure-sparkline">
      <div className="metric-header">
        <WiHumidity size={28} />
        <span>Umidità ultime 24h</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <AreaChart
          data={formatted}
          margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={
                  isLight ? "rgba(71,85,105,0.5)" : "rgba(255,255,255,0.6)"
                }
                stopOpacity={0.6}
              />
              <stop
                offset="95%"
                stopColor={
                  isLight ? "rgba(71,85,105,0)" : "rgba(255,255,255,0)"
                }
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            ticks={tickIndexes.map((i) => formatted[i]?.t)}
            tick={{
              fill: isLight ? "rgba(71,85,105,0.8)" : "rgba(255,255,255,0.7)",
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{
              fill: isLight ? "rgba(71,85,105,0.8)" : "rgba(255,255,255,0.7)",
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.6)",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontSize: 11,
            }}
            formatter={(v) => [`${v.toFixed(0)}%`, "Umidità"]}
            labelFormatter={(l) => `Ore ${l}`}
          />
          <Area
            type="monotone"
            dataKey="h"
            stroke={isLight ? "rgba(71,85,105,0.9)" : "rgba(255,255,255,0.9)"}
            strokeWidth={1.5}
            fill="url(#humGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Componente per una singola metrica
const WeatherMetric = ({
  icon,
  label,
  value,
  unit,
  min,
  max,
  minTime,
  maxTime,
  minLabel = "Min",
  maxLabel = "Max",
  decimals = 0,
  showMin = true,
}) => {
  // Gestione più robusta dei valori nulli/undefined
  // Invece di non renderizzare, mostrerà "N/D" per i valori mancanti
  const isValidValue = (v) =>
    v !== null && v !== undefined && !isNaN(v) && isFinite(v);

  const fmt = (v) =>
    isValidValue(v) ? parseFloat(v).toFixed(decimals) : "N/D";

  const displayValue = fmt(value);

  // Mostra sempre la sezione statistiche, ma gestisci meglio i valori nulli o NaN
  // Usa il valore corrente come fallback se min o max non sono disponibili
  const displayMin = isValidValue(min)
    ? fmt(min)
    : isValidValue(value)
      ? fmt(value)
      : "N/D";

  const displayMax = isValidValue(max)
    ? fmt(max)
    : isValidValue(value)
      ? fmt(value)
      : "N/D";

  // Funzione per formattare il timestamp
  const formatTime = (timeString) => {
    if (!timeString) return "";
    try {
      return new Date(timeString).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="weather-metric">
      <div className="metric-header">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">
        {displayValue}
        {isValidValue(value) ? unit : ""}
      </div>
      <div className="metric-stats">
        {showMin && (
          <div>
            {minLabel}: {displayMin}
            {isValidValue(min) || (isValidValue(value) && !isValidValue(min))
              ? unit
              : ""}
            {minTime && (
              <span className="time-stamp">{formatTime(minTime)}</span>
            )}
          </div>
        )}
        <div>
          {maxLabel}: {displayMax}
          {isValidValue(max) || (isValidValue(value) && !isValidValue(max))
            ? unit
            : ""}
          {maxTime && <span className="time-stamp">{formatTime(maxTime)}</span>}
        </div>
      </div>
    </div>
  );
};

// Widget Alert Meteo
const ALERT_ICONS = {
  storm: "⚡",
  rain: "🌧",
  snow: "❄️",
  fog: "🌫",
  heat: "🌡",
  uv: "☀️",
  wind: "💨",
};

const AlertsWidget = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="weather-metric alerts-widget alerts-none">
        <div className="metric-header">
          <span>Allerte meteo</span>
        </div>
        <span className="alert-ok-label">Nessun alert previsto</span>
      </div>
    );
  }

  return (
    <div className="weather-metric alerts-widget">
      <div className="metric-header">
        <span>Allerte meteo</span>
      </div>
      <div className="alerts-list">
        {alerts.map((a, i) => (
          <div key={i} className={`alert-badge alert-${a.level}`}>
            <span className="alert-icon">{ALERT_ICONS[a.type] ?? "⚠️"}</span>
            <span className="alert-label">{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Widget Sole & Luna
const SunMoonWidget = ({ solar }) => {
  if (!solar) return null;
  const { sunrise, sunset, phaseName, illumination, emoji } = solar;

  // Calcola progresso arco solare (0..1) rispetto all'ora corrente
  let dayProgress = null;
  if (sunrise && sunset) {
    const now = new Date();
    const toMinutes = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const riseMin = toMinutes(sunrise);
    const setMin = toMinutes(sunset);
    dayProgress = Math.max(
      0,
      Math.min(1, (nowMin - riseMin) / (setMin - riseMin)),
    );
  }

  // Arc SVG: semicerchio da sinistra (alba) a destra (tramonto)
  const r = 44,
    cx = 56,
    cy = 56,
    strokeW = 5;
  const arcStart = { x: cx - r, y: cy };
  const arcEnd = { x: cx + r, y: cy };
  const arcD = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;
  const arcLen = Math.PI * r; // semicircumference

  // Posizione del sole sull'arco
  let sunX = null,
    sunY = null;
  if (dayProgress !== null) {
    const angle = Math.PI - dayProgress * Math.PI; // da π a 0 (sx→dx)
    sunX = cx + r * Math.cos(angle);
    sunY = cy - r * Math.sin(angle);
  }

  return (
    <div className="weather-metric sun-moon-widget">
      {/* Arco solare */}
      <div className="sun-arc-container">
        <svg width="112" height="62" viewBox="0 0 112 62">
          {/* traccia base */}
          <path
            d={arcD}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {/* traccia percorsa */}
          {dayProgress !== null && (
            <path
              d={arcD}
              fill="none"
              stroke="rgba(255,210,50,0.85)"
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={`${arcLen}`}
              strokeDashoffset={`${arcLen * (1 - dayProgress)}`}
            />
          )}
          {/* disco solare */}
          {sunX !== null && (
            <circle
              cx={sunX}
              cy={sunY}
              r="7"
              fill="#FFD700"
              filter="url(#sunGlow)"
            />
          )}
          <defs>
            <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Alba / Tramonto */}
      <div className="sun-times">
        <div className="sun-time-item">
          <span className="sun-label">Alba</span>
          <span className="sun-value">{sunrise ?? "—"}</span>
        </div>
        <div className="sun-time-item">
          <span className="sun-label">Tramonto</span>
          <span className="sun-value">{sunset ?? "—"}</span>
        </div>
      </div>

      {/* Fase lunare */}
      <div className="moon-phase">
        <span className="moon-emoji">{emoji}</span>
        <div className="moon-info">
          <span className="moon-name">{phaseName}</span>
          <span className="moon-illumination">{illumination}% visibile</span>
        </div>
      </div>
    </div>
  );
};

// Mappa iconName (calcolato dal backend) → componente React con stile
function renderWeatherIcon(iconName, temp) {
  const isDay = isDayTime();
  const base = {
    filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.5))",
    animation: "float 3s ease-in-out infinite",
  };
  const glow = {
    ...base,
    filter:
      "drop-shadow(0 6px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 0 2px rgba(255,255,255,0.3))",
    textShadow: "0 0 10px rgba(255,255,255,0.8)",
  };

  switch (iconName) {
    case "rain":
      return (
        <WiRain
          size={96}
          style={{ ...base, color: isDay ? "#74b9ff" : "#3498db" }}
        />
      );
    case "cloud":
      return (
        <WiCloud
          size={96}
          style={{ ...base, color: isDay ? "#ddd" : "#95a5a6" }}
        />
      );
    case "storm":
      return (
        <WiBarometer
          size={96}
          style={{ ...base, color: isDay ? "#34495e" : "#2c3e50" }}
        />
      );
    case "fog":
      return (
        <WiCloud
          size={96}
          style={{ ...base, color: isDay ? "#bdc3c7" : "#7f8c8d" }}
        />
      );
    case "snow":
      return (
        <WiSnowflakeCold size={96} style={{ ...base, color: "#a8d8ea" }} />
      );
    case "night":
      return <WiNightClear size={96} style={{ ...glow, color: "#f1c40f" }} />;
    default: // "sunny"
      return (
        <WiDaySunny
          size={96}
          style={{
            ...glow,
            color: temp > 30 ? "#FFD700" : temp > 20 ? "#FF8C00" : "#FFA500",
          }}
        />
      );
  }
}

// Funzione per determinare se è giorno o notte
function isDayTime() {
  const now = new Date();
  const hours = now.getHours();

  // Consideriamo giorno dalle 6:00 alle 19:59
  return hours >= 6 && hours < 20;
}

// Widget Statistiche Annuali
const YearlyStatsWidget = ({ yearlyStats, isLight }) => {
  if (!yearlyStats?.years?.length) return null;
  const textMuted = isLight ? "rgba(71,85,105,0.7)" : "rgba(255,255,255,0.6)";
  const textMain = isLight ? "#1e293b" : "white";
  const borderColor = isLight
    ? "rgba(71,85,105,0.15)"
    : "rgba(255,255,255,0.12)";

  const fmtDate = (d) => {
    if (!d) return null;
    const datePart = d.split(" ")[0];
    const [y, m, day] = datePart.split("-");
    return `${day}/${m}/${y}`;
  };

  const sorted = [...yearlyStats.years].sort((a, b) => a.year - b.year);

  return (
    <div className="weather-metric yearly-stats-widget">
      <div className="metric-header">
        <span>Statistiche Annuali</span>
      </div>
      <div className="yearly-stats-scroll">
        <table className="yearly-stats-table">
          <thead>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <th style={{ color: textMuted }}>Anno</th>
              <th style={{ color: textMuted }}>🌡 T. Max</th>
              <th style={{ color: textMuted }}>❄️ T. Min</th>
              <th style={{ color: textMuted }}>💨 Vento</th>
              <th style={{ color: textMuted }}>💨 Raffica</th>
              <th style={{ color: textMuted }}>🌧 Pioggia</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((y) => (
              <tr
                key={y.year}
                style={{ borderBottom: `1px solid ${borderColor}` }}
              >
                <td style={{ color: textMain, fontWeight: 600 }}>{y.year}</td>
                <td style={{ color: "#ff7675" }}>
                  {y.tempMax != null
                    ? `${parseFloat(y.tempMax).toFixed(1)}°C`
                    : "—"}
                  {y.tempMaxDate && (
                    <span className="yearly-stat-date">
                      {fmtDate(y.tempMaxDate)}
                    </span>
                  )}
                </td>
                <td style={{ color: "#74b9ff" }}>
                  {y.tempMin != null
                    ? `${parseFloat(y.tempMin).toFixed(1)}°C`
                    : "—"}
                  {y.tempMinDate && (
                    <span className="yearly-stat-date">
                      {fmtDate(y.tempMinDate)}
                    </span>
                  )}
                </td>
                <td style={{ color: textMain }}>
                  {y.windMax != null
                    ? `${parseFloat(y.windMax).toFixed(1)} km/h`
                    : "—"}
                  {y.windMaxDate && (
                    <span className="yearly-stat-date">
                      {fmtDate(y.windMaxDate)}
                    </span>
                  )}
                </td>
                <td style={{ color: textMain }}>
                  {y.windGustMax != null
                    ? `${parseFloat(y.windGustMax).toFixed(1)} km/h`
                    : "—"}
                  {y.windGustMaxDate && (
                    <span className="yearly-stat-date">
                      {fmtDate(y.windGustMaxDate)}
                    </span>
                  )}
                </td>
                <td style={{ color: "#74b9ff" }}>
                  {y.rainMax != null
                    ? `${parseFloat(y.rainMax).toFixed(1)} mm`
                    : "—"}
                  {y.rainMaxDate && (
                    <span className="yearly-stat-date">
                      {fmtDate(y.rainMaxDate)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [yearlyStats, setYearlyStats] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const weatherIconRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Usa il nuovo endpoint unificato con URL dinamico da variabili d'ambiente
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/weather/all`,
        );

        setWeatherData(response.data);
        setError(null);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        let errorMessage = "Impossibile caricare i dati meteo. ";

        if (
          err.code === "ECONNREFUSED" ||
          err.message.includes("Network Error")
        ) {
          errorMessage += `Il server non è raggiungibile. Assicurati che il server sia in esecuzione su ${process.env.REACT_APP_API_URL}`;
        } else if (err.response) {
          // Errore di risposta dal server (4xx, 5xx)
          errorMessage += `Errore del server: ${err.response.status} ${err.response.statusText}`;
        } else if (err.request) {
          // Nessuna risposta ricevuta
          errorMessage +=
            "Nessuna risposta dal server. Verifica la connessione di rete.";
        } else {
          // Altro tipo di errore
          errorMessage += `Dettagli: ${err.message}`;
        }

        setError(errorMessage);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 180000); // Aggiorna ogni 3 minuti
    return () => clearInterval(interval);
  }, []);

  // Fetch statistiche annuali (aggiornamento ogni 6 ore)
  useEffect(() => {
    const fetchYearly = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/weather/yearly-stats`,
        );
        setYearlyStats(response.data);
      } catch (err) {
        console.error("Errore statistiche annuali:", err);
      }
    };
    fetchYearly();
    const interval = setInterval(fetchYearly, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer per aggiornare l'orario corrente ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Aggiorna il favicon usando l'SVG dell'icona già renderizzata nel DOM
  useEffect(() => {
    if (!weatherIconRef.current) return;
    const svgEl = weatherIconRef.current.querySelector("svg");
    if (!svgEl) return;
    try {
      const serialized = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([serialized], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      let favicon = document.getElementById("favicon");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.id = "favicon";
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      const oldHref = favicon.href;
      favicon.type = "image/svg+xml";
      favicon.href = url;
      if (oldHref.startsWith("blob:")) URL.revokeObjectURL(oldHref);
    } catch (e) {
      console.warn("Impossibile aggiornare favicon dall'icona:", e);
    }
  }); // senza deps: esegue dopo ogni render, quando il DOM è aggiornato

  // Effetto immediato per impostare il favicon di default all'avvio
  useEffect(() => {
    // Imposta subito un favicon di default con un titolo fisso
    document.title = "Meteo AM - Bariano";

    // Ottieni l'elemento favicon o creane uno nuovo se non esiste
    let favicon = document.getElementById("favicon");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.id = "favicon";
      favicon.rel = "icon";
      favicon.type = "image/svg+xml"; // Importante specificare il tipo per SVG
      document.head.appendChild(favicon);
    }

    // Controlla se è giorno o notte
    const isDay = isDayTime();

    // Usa un percorso assoluto con process.env.PUBLIC_URL
    const iconPath = `${process.env.PUBLIC_URL}/favicons/svg/favicon-${isDay ? "sunny" : "night"}.svg?v=${new Date().getTime()}`;
    favicon.href = iconPath;

    // Esegui una pulizia rimuovendo qualsiasi favicon statico che potrebbe essere stato specificato in HTML
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]',
    );
    existingFavicons.forEach((link) => {
      if (link.id !== "favicon") {
        document.head.removeChild(link);
      }
    });

    // Verifica se l'icona esiste effettivamente (questo è asincrono)
    fetch(iconPath);
    fetch(iconPath).catch((error) => {
      console.error(
        `❌ Errore nel controllo del favicon iniziale: ${error.message}`,
      );
    });
  }, []);

  const current = weatherData?.current?.observations?.[0];
  const stats = weatherData?.stats;
  const metric = current?.metric;
  const isWarmSeason = new Date().getMonth() >= 3 && new Date().getMonth() <= 8;

  if (!current || !metric) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento dati meteo...</p>
          {error && (
            <div className="error-message">
              <p>
                <strong>Errore:</strong> {error}
              </p>
              <p>Suggerimenti:</p>
              <ul>
                <li>Verifica che il server sia in esecuzione</li>
                <li>
                  Controlla che non ci siano errori nella console del server
                </li>
                <li>
                  La connessione all'API meteo potrebbe essere temporaneamente
                  non disponibile
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const weatherCondition = current.conditions || "Clear";
  const weatherIcon = renderWeatherIcon(
    weatherData.iconName || "sunny",
    metric.temp,
  );
  const backgroundClass = weatherData.backgroundClass || "weather-bg-sunny";
  const isLight = [
    "weather-bg-sunny",
    "weather-bg-mild",
    "weather-bg-cloudy",
    "weather-bg-foggy",
  ].includes(backgroundClass);

  // Descrizione calcolata dal backend
  const weatherDescriptionText =
    weatherData.description || weatherCondition || "";

  const lastUpdatedTime = current.obsTimeLocal
    ? new Date(current.obsTimeLocal).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className={`App ${backgroundClass}`}>
      <main className="dashboard">
        <div className="main-weather-card">
          <div className="card-header">
            <h2>Stazione Meteo AM - Bariano</h2>
            <div className="last-updated">
              <div>Ultimo aggiornamento: {lastUpdatedTime}</div>
              <div className="current-clock">
                Ora:{" "}
                {currentTime.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          {current?.neighborhood && (
            <div className="weather-location">
              <div className="neighborhood-name">{current.neighborhood}</div>
            </div>
          )}

          <div className="main-info">
            <div className="weather-icon-large" ref={weatherIconRef}>
              {weatherIcon}
            </div>
            <div className="temperature-details">
              <div className="current-temp">
                {parseFloat(metric.temp).toFixed(1)}°C
              </div>
              {stats && (
                <div className="temp-min-max">
                  <span>
                    Min:{" "}
                    {stats.tempMin
                      ? parseFloat(stats.tempMin).toFixed(1)
                      : parseFloat(metric.temp).toFixed(1)}
                    °C
                    {stats.tempMinTime && (
                      <span className="time-stamp">
                        {new Date(stats.tempMinTime).toLocaleTimeString(
                          "it-IT",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    )}
                  </span>
                  <span>
                    Max:{" "}
                    {stats.tempMax
                      ? parseFloat(stats.tempMax).toFixed(1)
                      : parseFloat(metric.temp).toFixed(1)}
                    °C
                    {stats.tempMaxTime && (
                      <span className="time-stamp">
                        {new Date(stats.tempMaxTime).toLocaleTimeString(
                          "it-IT",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {current.conditions && (
                <div className="weather-condition">{current.conditions}</div>
              )}
            </div>
          </div>

          {/* Descrizione + trend previsionale nello stesso box */}
          <div className="weather-description">
            <div className="description-text">{weatherDescriptionText}</div>
            {weatherData?.trend && (
              <div className="weather-trend">
                <span
                  className={`trend-arrow trend-arrow--${weatherData.pressureTrend || "stable"}`}
                >
                  {{
                    "rising-fast": "⬆⬆",
                    rising: "⬆",
                    stable: "➡",
                    falling: "⬇",
                    "falling-fast": "⬇⬇",
                  }[weatherData.pressureTrend] || "➡"}
                </span>
                {weatherData.trend}
              </div>
            )}
          </div>

          {current?.imperial?.precipTotal > 0 && (
            <div className="weather-precipitation">
              Precipitazioni nelle ultime 24 ore: {metric.precipTotal} mm
            </div>
          )}
        </div>

        <div className="weather-grid">
          {weatherData?.pressureHistory?.length > 0 && (
            <PressureSparkline
              data={weatherData.pressureHistory}
              isLight={isLight}
            />
          )}
          {weatherData?.humidityHistory?.length > 0 && (
            <HumiditySparkline
              data={weatherData.humidityHistory}
              isLight={isLight}
            />
          )}
          <WeatherMetric
            icon={<WiHumidity />}
            label="Umidità"
            value={current.humidity || metric.humidity}
            unit="%"
            min={stats?.humidityMin}
            max={stats?.humidityMax}
            minTime={stats?.humidityMinTime}
            maxTime={stats?.humidityMaxTime}
            decimals={0}
          />
          <WeatherMetric
            icon={<WiBarometer />}
            label="Pressione"
            value={metric.pressure}
            unit=" hPa"
            min={stats?.pressureMin}
            max={stats?.pressureMax}
            minTime={stats?.pressureMinTime}
            maxTime={stats?.pressureMaxTime}
            decimals={1}
          />
          <div className="weather-metric">
            <div className="metric-header">
              <span>Direzione Vento</span>
            </div>
            <WindCompass degrees={current.winddir} isLight={isLight} />
          </div>
          <div className="weather-metric">
            <div className="metric-header">
              <WiWindy size={40} />
              <span>Vento</span>
            </div>
            <div className="metric-value">
              {parseFloat(metric.windSpeed).toFixed(1)} km/h
            </div>
            <div className="metric-stats">
              <div>
                Max:{" "}
                {stats?.windspeedMax != null
                  ? parseFloat(stats.windspeedMax).toFixed(1)
                  : "N/D"}{" "}
                km/h
                {stats?.windspeedMaxTime && (
                  <span className="time-stamp">
                    {new Date(stats.windspeedMaxTime).toLocaleTimeString(
                      "it-IT",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <WeatherMetric
            icon={<WiWindy />}
            label="Raffica"
            value={metric.windGust}
            unit=" km/h"
            max={stats?.windgustMax}
            maxTime={stats?.windgustMaxTime}
            showMin={false}
            decimals={1}
          />
          <WeatherMetric
            icon={<WiThermometer />}
            label="Punto di Rugiada"
            value={metric.dewpt}
            unit="°C"
            min={stats?.dewptMin}
            max={stats?.dewptMax}
            minTime={stats?.dewptMinTime}
            maxTime={stats?.dewptMaxTime}
            decimals={1}
          />
          <WeatherMetric
            icon={<WiUmbrella />}
            label="Pioggia Oggi"
            value={metric.precipTotal}
            unit=" mm"
            min={metric.precipRate}
            max={stats?.precipTotalMax}
            maxTime={stats?.precipTotalMaxTime}
            minLabel="Rate/h"
            maxLabel="Total"
            decimals={1}
          />
          {weatherData?.rainProbability != null && (
            <div className="weather-metric">
              <div className="metric-header">
                <WiRain size={40} />
                <span>Prob. Pioggia</span>
              </div>
              <div className="metric-value">{weatherData.rainProbability}%</div>
              <div className="metric-stats">
                {weatherData.rainProbability3h != null && (
                  <div>Entro 3 ore: {weatherData.rainProbability3h}%</div>
                )}
                {weatherData.rainProbability12h != null && (
                  <div>Entro 12 ore: {weatherData.rainProbability12h}%</div>
                )}
              </div>
            </div>
          )}
          <WeatherMetric
            icon={isWarmSeason ? <WiHot /> : <WiSnowflakeCold />}
            label="Temp. Percepita"
            value={isWarmSeason ? metric.heatIndex : metric.windChill}
            unit="°C"
            min={isWarmSeason ? stats?.heatindexMin : stats?.windchillMin}
            max={isWarmSeason ? stats?.heatindexMax : stats?.windchillMax}
            minTime={
              isWarmSeason ? stats?.heatindexMinTime : stats?.windchillMinTime
            }
            maxTime={
              isWarmSeason ? stats?.heatindexMaxTime : stats?.windchillMaxTime
            }
            decimals={1}
          />
          {weatherData?.solar && <SunMoonWidget solar={weatherData.solar} />}
          {yearlyStats?.years?.length > 0 && (
            <YearlyStatsWidget yearlyStats={yearlyStats} isLight={isLight} />
          )}
          <AlertsWidget alerts={weatherData?.alerts} />
        </div>

        <RadarMap />
        <StormTracker />
      </main>
    </div>
  );
}

export default App;
