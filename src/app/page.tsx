import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-screen-sm">
      <h1 className="font-bold text-lg mb-4">
        Streaming isomorphic fetcher demo
      </h1>
      <p className="mb-4">
        This is a basic demo for a new way of fetching data <i>during SSR</i>.
        It was built as a quick and dirty proof of concept and is very much work
        in progress and still exploratory. There are many rough edges, beware.
      </p>
      <p className="mb-4">
        Inspired by original idea and implementation by{" "}
        <a
          href="https://github.com/dvoytenko"
          target="_blank"
          className="underline"
        >
          @dvoytenko
        </a>
        .
      </p>
      <div className="mb-4">
        This implementation aims to explore tweaking the original idea into a
        low level transport layer and:
        <ul className="list-disc mt-2">
          <li className="ml-5">Only support Suspense</li>
          <li className="ml-5">Support React 18</li>
          <li className="ml-5">
            Not have any dependencies on specific frameworks or libraries
          </li>
        </ul>
      </div>
      <div className="mb-4">
        The public API is just two things (names can very much be improved).
        <ul className="list-disc mt-2 mb-4">
          <li className="ml-5">
            {"<IsoFetchProvider serverConfig clientConfig ... />"}
          </li>
          <li className="ml-5">{"useIsoFetcher()"}</li>
        </ul>
        You pass in a fetchFn for the server, and one for the client. These are
        wrapped and you call useIsoFetcher() to get that fetcher. The magic is
        that during SSR, any call made to this fetcher actually executes in a{" "}
        <i>Server Component Context(!)</i>. This means the server fetchFn has
        access to cookies and can do auth etc.
      </div>
      <p className="mb-4">
        The result is streamed back down to the SSR pass and the client. What
        this all means is that this just works (demo with React query):
      </p>
      <pre className="mb-4 text-sm">
        {`
  const { id } = useParams<{ id: string }>();
  const fetcher = useIsoFetcher();

  const { data } = useSuspenseQuery({
    queryKey: ["key", id],
    queryFn: async () => {
      const result = await fetcher(\`/api/\${id}\`);

      return result.data;
    },
  });
`}
      </pre>
      <div className="mb-4">
        You can see this in action by going to the next page. There are logs for
        when the server fetchFn and the client fetchFn runs, so open the
        console, click around, reload the page etc. The API call reads the
        cookie TEST_COOKIE, so try setting that to a value manually.
      </div>
      <div>
        <Link href="/1" className="underline font-bold">
          {">"} Goto first page
        </Link>
      </div>
    </div>
  );
}
