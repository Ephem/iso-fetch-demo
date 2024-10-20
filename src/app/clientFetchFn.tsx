"use client";

export async function clientFetchFn(url: string) {
  console.log(`Fetching ${url} on the client`);

  return fetch(url).then((res) => res.json());
}
