import { ClientProvider, FetchCacheItem } from "./ClientProvider";
import { createPromiseStream } from "./stream";
import { cache } from "react";
import { defaultRequestToKey } from "./utils";

declare global {
  // eslint-disable-next-line no-var
  var __ISO_FETCH_REGISTRY__: Record<
    number,
    {
      fetcher: (...args: Array<unknown>) => unknown;
      requestState?: {
        fetchCache: Map<string, FetchCacheItem>;
        streamCompleted: boolean;
      };
    }
  >;
}

let id = 0;
globalThis.__ISO_FETCH_REGISTRY__ = {};

type Props = {
  serverConfig: {
    fetchFn: (...args: any) => Promise<unknown>;
    requestToKey?: (...args: any) => string;
  };
  clientConfig: {
    fetchFn: (...args: any) => Promise<unknown>;
    requestToKey?: (...args: any) => string;
  };
  children: React.ReactNode;
  release: (cb: () => void) => void;
};
export function IsoFetchProvider({
  serverConfig,
  clientConfig,
  children,
  release,
}: Props) {
  const stream = createPromiseStream({
    onComplete: () => {},
  });
  const requestToKey = serverConfig.requestToKey ?? defaultRequestToKey;

  const fetcher = (...args: Array<unknown>) => {
    const key = requestToKey(...args);
    const promise = serverConfig.fetchFn(...args);

    stream.push({ key, value: promise });
  };

  id += 1;
  globalThis.__ISO_FETCH_REGISTRY__[id] = { fetcher };

  release(
    cache(() => {
      // TODO: Do we need to clean up other stuff here, like reject
      //       any existing promises in the fetchCache?
      delete globalThis.__ISO_FETCH_REGISTRY__[id];
    })
  );

  return (
    <ClientProvider
      fetcherId={id}
      stream={stream.initialPromise}
      clientConfig={clientConfig}
    >
      {children}
    </ClientProvider>
  );
}
