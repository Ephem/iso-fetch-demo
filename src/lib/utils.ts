export const IS_SERVER = typeof window === "undefined";

export function withResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T | Promise<T>) => void;
  reject: (error: unknown) => void;
} {
  let resolve: (value: T | Promise<T>) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((aResolve, aReject) => {
    resolve = aResolve;
    reject = aReject;
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { promise, resolve: resolve!, reject: reject! };
}

export function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number | undefined
): Promise<T> {
  if (!timeout || timeout === -1) {
    return promise;
  }

  let timer: NodeJS.Timeout | undefined;
  const mainPromise = promise.finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
  const timeoutPromise_ = new Promise<T>((_, aReject) => {
    timer = setTimeout(() => {
      aReject(new Error("timeout"));
    }, timeout);
  });
  const result = Promise.race([mainPromise, timeoutPromise_]);
  return result;
}

export function defaultRequestToKey(...args: Array<unknown>) {
  return JSON.stringify(args);
}
