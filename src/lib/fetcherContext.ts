"use client";

import { createContext, useContext } from "react";

export const fetcherContext = createContext<{
  fetcher: undefined | ((...args: Array<unknown>) => unknown);
}>({
  fetcher: undefined,
});

export function useIsoFetcher() {
  const isoFetcher = useContext(fetcherContext).fetcher;
  if (isoFetcher === undefined) {
    throw new Error(
      "You must configure the IsoFetchProvider before calling useIsoFetcher"
    );
  }

  return isoFetcher as <T>(...args: Array<unknown>) => Promise<T>;
}
