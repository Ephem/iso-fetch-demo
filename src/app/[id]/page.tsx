"use client";

import { useIsoFetcher } from "@/lib";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";

function FetcherComponent() {
  const { id } = useParams<{ id: string }>();
  const fetcher = useIsoFetcher();

  const { data } = useSuspenseQuery({
    queryKey: ["key", id],
    queryFn: async () => {
      const result = await fetcher<{
        data: { message: string; latency: number };
      }>(`/api/${id}`);

      return result.data;
    },
  });

  return (
    <>
      <div>Message: {data.message}</div>
      <div>API simulated latency: {data.latency}</div>
    </>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <div className="flex justify-between pb-4">
        <div>
          {id !== "1" ? (
            <Link href={`/${Number(id) - 1}`} className="underline">
              Prev
            </Link>
          ) : (
            <Link href="/" className="underline">
              Back to start
            </Link>
          )}
        </div>
        <div>Page {id}</div>
        <div>
          <Link href={`/${Number(id) + 1}`} className="underline">
            Next
          </Link>
        </div>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <FetcherComponent />
      </Suspense>
    </>
  );
}
