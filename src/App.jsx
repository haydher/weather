import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "./hooks/useLocation.js";
import { useGeocodeSearch } from "./hooks/useGeocodeSearch.js";
import { useNwsForecast } from "./hooks/useNwsForecast.js";
import { formatTime, formatDay } from "./lib/formatters.js";
import { getTimeGreeting } from "./lib/weatherUtils.js";
import { Starfield } from "./components/layout/Starfield.jsx";
import { SearchBar } from "./components/search/SearchBar.jsx";
import { ErrorBanner } from "./components/ui/ErrorBanner.jsx";
import { WeatherAlerts } from "./components/weather/WeatherAlerts.jsx";
import { HeroCard } from "./components/weather/HeroCard.jsx";
import { PrecipChart } from "./components/weather/PrecipChart.jsx";
import { HourlyStrip } from "./components/weather/HourlyStrip.jsx";
import { DayForecastList } from "./components/weather/DayForecastList.jsx";
import { LiveMapSection } from "./components/weather/LiveMapSection.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.jsx";

export default function App() {
  const [unitPrimary, setUnitPrimary] = useState(() => {
    try {
      return localStorage.getItem("unitPrimary") || "F";
    } catch {
      return "F";
    }
  });

  const handleUnitChange = (unit) => {
    setUnitPrimary(unit);
    try {
      localStorage.setItem("unitPrimary", unit);
    } catch {}
  };

  const { selectedPlace, setSelectedPlace, locationDetecting } = useLocation();
  const search = useGeocodeSearch(setSelectedPlace);
  const { forecast, forecastHourly, alerts, status, errorMessage, retry } = useNwsForecast(selectedPlace);

  useEffect(() => {
    if (!locationDetecting && !selectedPlace) {
      search.setSearchFocused(true);
    }
  }, [locationDetecting, selectedPlace, search.setSearchFocused]);

  const periods = forecast?.properties?.periods ?? [];
  const hourlyPeriods = forecastHourly?.properties?.periods ?? [];

  const { currentPeriod, todayHigh, todayLow, timeGreeting } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentHourly =
      hourlyPeriods.find((p) => now >= new Date(p.startTime) && now < new Date(p.endTime)) ?? hourlyPeriods[0];
    const currentDaily = periods.find((p) => now >= new Date(p.startTime) && now < new Date(p.endTime)) ?? periods[0];
    const current = currentHourly ? { ...currentDaily, ...currentHourly } : currentDaily;

    let dayPeriod, nightPeriod;
    for (const p of periods) {
      if (new Date(p.startTime).toDateString() !== todayStr) continue;
      if (p.isDaytime && !dayPeriod) dayPeriod = p;
      if (!p.isDaytime && !nightPeriod) nightPeriod = p;
      if (dayPeriod && nightPeriod) break;
    }

    const todayHigh =
      dayPeriod?.temperature ??
      Math.max(
        ...hourlyPeriods.filter((p) => new Date(p.startTime).toDateString() === todayStr).map((p) => p.temperature)
      );
    const todayLow =
      nightPeriod?.temperature ?? periods.find((p) => !p.isDaytime)?.temperature ?? currentHourly?.temperature;

    return {
      currentPeriod: current,
      todayHigh,
      todayLow,
      timeGreeting: getTimeGreeting(now, current, todayHigh),
    };
  }, [periods, hourlyPeriods]);

  const next24Hourly = useMemo(() => hourlyPeriods.slice(0, 24), [hourlyPeriods]);

  const precipPeak = useMemo(
    () =>
      next24Hourly.reduce((best, p) => {
        const val = p.probabilityOfPrecipitation?.value ?? 0;
        return val > (best?.val ?? 0) ? { period: p, val } : best;
      }, null),
    [next24Hourly]
  );

  const precipHeader =
    precipPeak?.val >= 20 ? `Rain expected at ${formatTime(precipPeak.period.startTime)}` : "Next 24 hours";

  const dayGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    const now = new Date();
    const isLateNight = now.getHours() < 5;
    const todayStr = isLateNight ? null : now.toDateString();

    for (const p of periods) {
      const day = new Date(p.startTime).toDateString();
      if (seen.has(day)) continue;
      seen.add(day);
      if (todayStr && day === todayStr) continue;
      const dayPeriod = periods.find((x) => new Date(x.startTime).toDateString() === day && x.isDaytime);
      const nightPeriod = periods.find((x) => new Date(x.startTime).toDateString() === day && !x.isDaytime);
      groups.push({ day, dayPeriod, nightPeriod, name: formatDay(dayPeriod?.startTime ?? nightPeriod?.startTime) });
      if (groups.length >= 10) break;
    }
    return groups;
  }, [periods]);

  const isLoading = (status === "loading" || locationDetecting) && !!selectedPlace;
  const isSuccess = status === "success" && !!currentPeriod && !locationDetecting;

  return (
    <>
      {/* <Starfield /> */}
      <motion.div
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <SearchBar
          query={search.query}
          setQuery={search.setQuery}
          searchFocused={search.searchFocused}
          setSearchFocused={search.setSearchFocused}
          selectedPlace={selectedPlace}
          locationDetecting={locationDetecting}
          geocodeResults={search.geocodeResults}
          dropdownOpen={search.dropdownOpen}
          formatPlaceDisplay={search.formatPlaceDisplay}
          handleSelectPlace={search.handleSelectPlace}
          dropdownRef={search.dropdownRef}
          searchInputRef={search.searchInputRef}
        />

        {status === "error" && <ErrorBanner message={errorMessage} onRetry={retry} />}

        <ErrorBoundary>
          {selectedPlace && (
            <AnimatePresence mode="wait">
              {isLoading && <HeroCard key="loading" isLoading />}
              {isSuccess && (
                <HeroCard
                  key="hero"
                  currentPeriod={currentPeriod}
                  todayHigh={todayHigh}
                  todayLow={todayLow}
                  unitPrimary={unitPrimary}
                  setUnitPrimary={handleUnitChange}
                  timeGreeting={timeGreeting}
                />
              )}
            </AnimatePresence>
          )}
        </ErrorBoundary>

        <ErrorBoundary>{status === "success" && alerts.length > 0 && <WeatherAlerts alerts={alerts} />}</ErrorBoundary>

        <ErrorBoundary>
          {selectedPlace && (next24Hourly.length > 0 || isLoading) && (
            <PrecipChart hourlyPeriods={next24Hourly} header={precipHeader} isLoading={isLoading} />
          )}
        </ErrorBoundary>

        <ErrorBoundary>
          {selectedPlace && (hourlyPeriods.length > 0 || isLoading) && (
            <HourlyStrip hourlyPeriods={hourlyPeriods} unitPrimary={unitPrimary} isLoading={isLoading} />
          )}
        </ErrorBoundary>

        <ErrorBoundary>
          {selectedPlace && (dayGroups.length > 0 || isLoading) && (
            <DayForecastList
              dayGroups={dayGroups}
              hourlyPeriods={hourlyPeriods}
              unitPrimary={unitPrimary}
              isLoading={isLoading}
            />
          )}
        </ErrorBoundary>

        <ErrorBoundary>
          {status === "success" && selectedPlace && (
            <LiveMapSection selectedPlace={selectedPlace} unitPrimary={unitPrimary} />
          )}
        </ErrorBoundary>

        {!selectedPlace && !locationDetecting && status === "idle" && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24 }}>
            Search a US city to get started.
          </p>
        )}
      </motion.div>
    </>
  );
}
