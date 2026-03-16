import { useState, useEffect, useCallback } from "react";
import { fetchForecastForLocation } from "../lib/nwsApi.js";

export function useNwsForecast(selectedPlace) {
  const [points, setPoints] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [forecastHourly, setForecastHourly] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!selectedPlace) {
      setPoints(null);
      setForecast(null);
      setForecastHourly(null);
      setAlerts([]);
      setStatus("idle");
      setErrorMessage("");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");
    (async () => {
      try {
        const {
          points: pointsData,
          forecast: forecastData,
          forecastHourly: hourlyData,
          alerts: alertsData,
        } = await fetchForecastForLocation(selectedPlace.lat, selectedPlace.lon);
        if (cancelled) return;
        setPoints(pointsData);
        setForecast(forecastData);
        setForecastHourly(hourlyData);
        setAlerts(alertsData);
        setStatus("success");
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e.message || "Something went wrong");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  const refresh = useCallback(async () => {
    if (!selectedPlace) return;
    setRefreshing(true);
    setErrorMessage("");
    try {
      const {
        points: pointsData,
        forecast: forecastData,
        forecastHourly: hourlyData,
        alerts: alertsData,
      } = await fetchForecastForLocation(selectedPlace.lat, selectedPlace.lon);
      setPoints(pointsData);
      setForecast(forecastData);
      setForecastHourly(hourlyData);
      setAlerts(alertsData);
      setStatus("success");
    } catch (_) {}
    setRefreshing(false);
  }, [selectedPlace]);

  const retry = useCallback(async () => {
    setErrorMessage("");
    if (!selectedPlace) return;
    setStatus("loading");
    try {
      const {
        points: pointsData,
        forecast: forecastData,
        forecastHourly: hourlyData,
        alerts: alertsData,
      } = await fetchForecastForLocation(selectedPlace.lat, selectedPlace.lon);
      setPoints(pointsData);
      setForecast(forecastData);
      setForecastHourly(hourlyData);
      setAlerts(alertsData);
      setStatus("success");
    } catch (e) {
      setErrorMessage(e.message || "Something went wrong");
      setStatus("error");
    }
  }, [selectedPlace]);

  return {
    points,
    forecast,
    forecastHourly,
    alerts,
    status,
    errorMessage,
    setErrorMessage,
    refreshing,
    refresh,
    retry,
  };
}
