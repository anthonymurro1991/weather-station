// RadarMap.js — Mappa radar Windy embed

import React from "react";

const STATION_LAT = parseFloat(process.env.REACT_APP_STATION_LAT) || 45.15;
const STATION_LON = parseFloat(process.env.REACT_APP_STATION_LON) || 9.65;

const WINDY_URL =
  `https://embed.windy.com/embed.html` +
  `?type=map&location=coordinates` +
  `&metricRain=default&metricTemp=default&metricWind=default` +
  `&zoom=11&overlay=radar&product=radar&level=surface` +
  `&lat=${STATION_LAT}&lon=${STATION_LON}&message=true`;

export default function RadarMap() {
  return (
    <div className="radar-card">
      <div className="radar-header">
        <span className="radar-title">Radar Precipitazioni</span>
      </div>
      <div className="radar-map-wrapper">
        <iframe
          src={WINDY_URL}
          title="Windy radar"
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
        />
      </div>
      <div className="radar-attribution">
        Powered by{" "}
        <a href="https://www.windy.com" target="_blank" rel="noreferrer">
          Windy.com
        </a>
      </div>
    </div>
  );
}
