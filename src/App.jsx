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
import { HeroCard } from "./components/weather/HeroCard.jsx";
import { PrecipChart } from "./components/weather/PrecipChart.jsx";
import { HourlyStrip } from "./components/weather/HourlyStrip.jsx";
import { DayForecastList } from "./components/weather/DayForecastList.jsx";
import { LiveMapSection } from "./components/weather/LiveMapSection.jsx";

export default function App() {
  const [unitPrimary, setUnitPrimary] = useState("F");
  const { selectedPlace, setSelectedPlace, locationDetecting } = useLocation();
  const search = useGeocodeSearch(setSelectedPlace);
  const { forecast, forecastHourly, status, errorMessage, retry } = useNwsForecast(selectedPlace);

  // When geolocation fails or user is outside US, focus search so they can pick a place
  useEffect(() => {
    if (!locationDetecting && !selectedPlace) {
      search.setSearchFocused(true);
    }
  }, [locationDetecting, selectedPlace]);

  const periods = forecast?.properties?.periods ?? [];
  const hourlyPeriods = forecastHourly?.properties?.periods ?? [];
  const now = new Date();

  const currentPeriod =
    periods.find((p) => {
      const start = new Date(p.startTime);
      const end = new Date(p.endTime);
      return now >= start && now < end;
    }) || periods[0];

  const todayDayPeriod = periods.find(
    (p) => p.isDaytime && new Date(p.startTime).toDateString() === now.toDateString()
  );
  const todayNightPeriod = periods.find(
    (p) => !p.isDaytime && new Date(p.startTime).toDateString() === now.toDateString()
  );
  const todayHigh = todayDayPeriod?.temperature ?? currentPeriod?.temperature;
  const todayLow =
    todayNightPeriod?.temperature ?? periods.find((p) => !p.isDaytime)?.temperature ?? currentPeriod?.temperature;

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
    precipPeak && precipPeak.val >= 20
      ? `Rain expected at ${formatTime(precipPeak.period.startTime)}`
      : "Next 24 hours";

  const dayGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    for (const p of periods) {
      const day = new Date(p.startTime).toDateString();
      if (seen.has(day)) continue;
      seen.add(day);
      const dayPeriod = periods.filter((x) => new Date(x.startTime).toDateString() === day && x.isDaytime)[0];
      const nightPeriod = periods.filter((x) => new Date(x.startTime).toDateString() === day && !x.isDaytime)[0];
      groups.push({ day, dayPeriod, nightPeriod, name: formatDay(dayPeriod?.startTime || nightPeriod?.startTime) });
      if (groups.length >= 10) break;
    }
    return groups;
  }, [periods]);

  const timeGreeting = getTimeGreeting(now, currentPeriod);
  const heroLoading = (status === "loading" || locationDetecting) && selectedPlace;
  const heroSuccess = status === "success" && currentPeriod && !locationDetecting;

  return (
    <>
      <Starfield />

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

        {selectedPlace && (
          <AnimatePresence mode="wait">
            {heroLoading && <HeroCard isLoading />}
            {heroSuccess && (
              <HeroCard
                currentPeriod={currentPeriod}
                todayHigh={todayHigh}
                todayLow={todayLow}
                unitPrimary={unitPrimary}
                setUnitPrimary={setUnitPrimary}
                timeGreeting={timeGreeting}
              />
            )}
          </AnimatePresence>
        )}

        {status === "success" && next24Hourly.length > 0 && (
          <PrecipChart hourlyPeriods={next24Hourly} header={precipHeader} />
        )}

        {status === "success" && hourlyPeriods.length > 0 && (
          <HourlyStrip hourlyPeriods={hourlyPeriods} unitPrimary={unitPrimary} />
        )}

        {status === "success" && dayGroups.length > 0 && (
          <DayForecastList dayGroups={dayGroups} hourlyPeriods={hourlyPeriods} unitPrimary={unitPrimary} />
        )}

        {status === "success" && selectedPlace && <LiveMapSection selectedPlace={selectedPlace} />}

        {!selectedPlace && !locationDetecting && status === "idle" && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24 }}>
            Search a US city to get started.
          </p>
        )}
      </motion.div>
    </>
  );
}
