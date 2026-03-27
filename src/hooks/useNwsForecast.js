import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchForecastForLocation } from "../lib/nwsApi.js";

export function useNwsForecast(selectedPlace) {
  const [manualErrorMessage, setManualErrorMessage] = useState("");
  const hasSelectedPlace = Boolean(selectedPlace);

  const query = useQuery({
    queryKey: [
      "nws-forecast",
      selectedPlace?.lat ?? null,
      selectedPlace?.lon ?? null,
      selectedPlace?.name ?? selectedPlace?.display_name ?? null,
    ],
    enabled: hasSelectedPlace,
    queryFn: async () => fetchForecastForLocation(selectedPlace.lat, selectedPlace.lon),
    refetchInterval: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess || !hasSelectedPlace) {
      setManualErrorMessage("");
    }
  }, [query.isSuccess, hasSelectedPlace]);

  const status = !hasSelectedPlace ? "idle" : query.isError ? "error" : query.isPending ? "loading" : "success";

  const points = query.data?.points ?? null;
  const forecast = query.data?.forecast ?? null;
  const forecastHourly = query.data?.forecastHourly ?? null;
  const alerts = query.data?.alerts ?? [];
  const errorMessage = manualErrorMessage || query.error?.message || (query.isError ? "Something went wrong" : "");
  const refreshing = query.isRefetching;

  const refresh = useCallback(async () => {
    if (!hasSelectedPlace) return;
    setManualErrorMessage("");
    await query.refetch();
  }, [hasSelectedPlace, query]);

  const retry = useCallback(async () => {
    if (!hasSelectedPlace) return;
    setManualErrorMessage("");
    await query.refetch();
  }, [hasSelectedPlace, query]);

  return {
    points,
    forecast,
    forecastHourly,
    alerts,
    status,
    errorMessage,
    setErrorMessage: setManualErrorMessage,
    refreshing,
    refresh,
    retry,
  };
}
