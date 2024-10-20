import { timeoutPromise, withResolvers } from "./utils";

// This could easily be made into a Generic to make the entire
// stream implementation, well, generic..
export type StreamItem = {
  key: string;
  value: Promise<unknown>;
};

export type StreamEmit = {
  item: StreamItem;
  nextPromise: Promise<StreamEmit | "done">;
};

// ----- Create stream -----

// This creates a stream implemented on promises. The initial promise resolves to
// an item and a nextPromise. That nextPromise resolves to a new item and
// nextPromise etc. This goes on until nextPromise resolves to "done".
export function createPromiseStream({
  onComplete,
  // If no new values have been pushed in this time, the stream closes
  // This is very much a rough edge, I'd love to come up with some other approach
  // Idea: Maybe close the stream from the outside, and as long as a fetch is
  // running we don't close. This timeout would apply "between" active fetches,
  // that is, only to the rendering.
  // Maybe if we do that, we could also use it for the release somehow?
  timeout = 500,
}: {
  onComplete?: () => void;
  timeout?: number;
}): {
  push: (streamItem: StreamItem) => void;
  initialPromise: Promise<StreamEmit | "done">;
} {
  let done = false;
  let nextPromise:
    | ReturnType<typeof withResolvers<StreamEmit | "done">>
    | undefined = withResolvers<StreamEmit | "done">();

  function wrapWithTimeout(promise: Promise<StreamEmit | "done">) {
    timeoutPromise(promise, timeout).catch(() => {
      done = true;
      nextPromise?.resolve("done");
      nextPromise = undefined;
      onComplete?.();
    });
  }

  wrapWithTimeout(nextPromise.promise);

  function push(streamItem: StreamItem) {
    const { key, value } = streamItem;
    const newNextPromise = withResolvers<StreamEmit | "done">();

    wrapWithTimeout(newNextPromise.promise);

    if (nextPromise) {
      nextPromise.resolve({
        item: { key, value },
        nextPromise: newNextPromise.promise,
      });
      nextPromise = newNextPromise;
    }
  }

  return { push, initialPromise: nextPromise.promise };
}

// ----- Consume stream -----

async function* promiseStreamToAsyncIterable(
  initialPromise: Promise<StreamEmit | "done">
): AsyncIterable<StreamItem> {
  let nextPromise = initialPromise;

  while (true) {
    // TODO: Does this need some kind of backup timeout if
    //       the server close fails for whatever reason?
    const result = await nextPromise;
    if (result === "done") {
      break;
    } else {
      nextPromise = result.nextPromise;
      yield result.item;
    }
  }
}

// This takes the inital promise of a promise-stream and calls the callback for
// each item. Since it's a promise you can .then() it to know when it's completed.
export async function consumeStream(
  stream: Promise<StreamEmit | "done">,
  cb: (item: StreamItem) => void
): Promise<void> {
  const asyncIterator = promiseStreamToAsyncIterable(stream);

  for await (const streamItem of asyncIterator) {
    cb(streamItem);
  }
}
