"use client";

import { useMemo, useState } from "react";
import { defaultRequestToKey, IS_SERVER, withResolvers } from "./utils";
import { consumeStream, StreamEmit, StreamItem } from "./stream";
import { fetcherContext } from "./fetcherContext";

export type FetchCacheItem = {
  promise: Promise<unknown>;
  resolve: undefined | ((value: unknown) => void);
  reject: undefined | ((error: unknown) => void);
  // We use this value only on the client to know whether a query has
  // ever been consumed. This is used to determine whether we should
  // trigger an uncached client fetch.
  consumedOnClient?: boolean;
};

let globalState: {
  fetchCache: Map<string, FetchCacheItem>;
  streamCompleted: boolean;
};

function getGlobalState(fetcherId: number) {
  if (IS_SERVER) {
    // On the server, we use the fact that we already have a per request-object.
    // This is important so the fetchCache is not shared across users.
    return globalThis?.__ISO_FETCH_REGISTRY__?.[fetcherId]?.requestState;
  } else {
    // On the client, we can use a module scoped variable instead and because
    // it's not shared between users, there is no need to connect it to the id
    return globalState;
  }
}

function initGlobalState(
  fetcherId: number,
  cache: Map<string, FetchCacheItem>
) {
  if (IS_SERVER) {
    if (globalThis?.__ISO_FETCH_REGISTRY__?.[fetcherId]) {
      globalThis.__ISO_FETCH_REGISTRY__[fetcherId].requestState = {
        fetchCache: cache,
        streamCompleted: false,
      };
    } else {
      throw new Error("No shared isomorphic fetch registry found");
    }
  } else {
    globalState = { fetchCache: cache, streamCompleted: false };
  }
}

type Props = {
  fetcherId: number;
  stream: Promise<StreamEmit | "done">;
  clientConfig: {
    fetchFn: (...args: Array<unknown>) => Promise<unknown>;
    requestToKey?: (...args: Array<unknown>) => string;
  };
  children: React.ReactNode;
};
export function ClientProvider({
  fetcherId,
  stream,
  children,
  clientConfig,
}: Props) {
  /*
    This useState has two parts, both a bit cursed.

    First, we use it as a way to initialize a global state and start
    listening to the stream. This needs to happen in render or it wouldn't
    work during SSR, and listening to the stream can only happen once.
    We don't trust the useState to be stable, so we keep the actual globalState
    value outside. We do this in the useState initalizer just to avoid running
    it on every render, but read it as if it happens in render.

    The second part constructs a fetcher. This does not have to be stable so
    it doesn't matter if the initializer reruns.
  */
  const [{ fetcher }] = useState<{
    fetcher: (...args: Array<unknown>) => Promise<unknown>;
  }>(() => {
    const requestToKey = clientConfig.requestToKey ?? defaultRequestToKey;
    const serverFetcher =
      globalThis?.__ISO_FETCH_REGISTRY__?.[fetcherId].fetcher;
    let globalState = getGlobalState(fetcherId);

    if (!globalState) {
      initGlobalState(fetcherId, new Map<string, FetchCacheItem>());
      globalState = getGlobalState(fetcherId);

      if (!globalState) {
        // Satisy TS
        throw new Error("Unexpected error - No global state initialised");
      }

      // Start listening to stream
      consumeStream(stream, (streamItem: StreamItem) => {
        if (!globalState) {
          return;
        }

        const key = streamItem.key;

        if (globalState.fetchCache.has(key)) {
          const value = globalState.fetchCache.get(key);
          if (value?.resolve) {
            value.resolve(streamItem.value);
            value.resolve = undefined;
            value.reject = undefined;
          }
        } else {
          globalState.fetchCache.set(key, {
            promise: streamItem.value,
            resolve: undefined,
            reject: undefined,
          });
        }
      }).then(() => {
        // This shouldn't happen, but if it does (release runs before stream
        // finishes for example), we trust that it's already been cleaned up
        if (!globalState) {
          return;
        }

        globalState.streamCompleted = true;

        for (const [, value] of globalState.fetchCache) {
          if (value.reject) {
            value.reject(new Error("Value was not provided by stream"));
            value.resolve = undefined;
            value.reject = undefined;
          }
        }
      });
    }

    const fetcher = (...args: Array<unknown>): Promise<unknown> => {
      const key = requestToKey(...args);

      const cacheItem = globalState.fetchCache.get(key);

      if (IS_SERVER) {
        if (cacheItem) {
          return cacheItem.promise;
        } else {
          if (globalState.streamCompleted) {
            const { promise, resolve, reject } = withResolvers();

            globalState.fetchCache.set(key, { promise, resolve, reject });
            reject(
              new Error("Stream completed before serverFetcher could trigger")
            );

            return promise;
          } else {
            const { promise, resolve, reject } = withResolvers();
            globalState.fetchCache.set(key, { promise, resolve, reject });

            // This makes the fetch on the RSC side, later streamed in
            // and resolved via the stream resolver
            serverFetcher(...args);
            return promise;
          }
        }
      } else {
        if (cacheItem) {
          if (cacheItem.consumedOnClient && globalState.streamCompleted) {
            // Uncached client fetch
            return clientConfig.fetchFn(...args);
          } else {
            // TODO: Maybe this needs some kind of TTL too?
            // If not, a fetch that is made 10 minutes after page load will
            // still resolve with the original value provided in the stream
            globalState.fetchCache.set(key, {
              ...cacheItem,
              consumedOnClient: true,
            });
            return cacheItem.promise;
          }
        } else {
          if (globalState.streamCompleted) {
            // Uncached client fetch
            return clientConfig.fetchFn(...args);
          } else {
            const { promise, resolve, reject } = withResolvers();
            globalState.fetchCache.set(key, {
              promise,
              resolve,
              reject,
              consumedOnClient: true,
            });
            return promise;
          }
        }
      }
    };

    return { fetcher };
  });

  const contextValue = useMemo(() => ({ fetcher }), [fetcher]);

  return (
    <fetcherContext.Provider value={contextValue}>
      {children}
    </fetcherContext.Provider>
  );
}
