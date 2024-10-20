import { IsoFetchProvider } from "@/lib/server";
import type { Metadata } from "next";
import { clientFetchFn } from "./clientFetchFn";
import "./globals.css";
import { RQProvider } from "./RQProvider";
import { Suspense } from "react";
import { cookies } from "next/headers";

async function serverFetchFn(url: string) {
  console.log(`Fetching ${url} on the server`);

  const c = await cookies();

  // Need to add base path on the server
  return fetch(`http://localhost:3000/${url}`, {
    headers: {
      // Pass along cookies (!)
      cookie: c.toString(),
    },
  }).then((res) => res.json());
}

export const metadata: Metadata = {
  title: "Isomorphic SC <-> CC fetch demo",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased p-4">
        <IsoFetchProvider
          serverConfig={{ fetchFn: serverFetchFn }}
          clientConfig={{ fetchFn: clientFetchFn }}
          release={(cb) => {
            // This is not great.
            // If on Next 15 unstable_after can be used instead, but that seems
            // to not always call, so might also want some of timeout as backup.
            setTimeout(cb, 5000);
          }}
        >
          <RQProvider>
            <Suspense fallback="Loading...">{children}</Suspense>
          </RQProvider>
        </IsoFetchProvider>
      </body>
    </html>
  );
}
