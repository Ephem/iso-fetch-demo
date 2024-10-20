# Isomorphic fetcher demo

This is a basic demo for a new way of fetching data during SSR. It was built as a quick and dirty proof of concept and is very much work in progress and still exploratory. There are many rough edges, beware.

Inspired by original idea and implementation by @dvoytenko.

This implementation aims to explore tweaking the original idea into a low level transport layer and:

* Only support Suspense
* Support React 18
* Not have any dependencies on specific frameworks or libraries

The public API is just two things (names can very much be improved).

* `<IsoFetchProvider serverConfig clientConfig ... />`
* `useIsoFetcher()`
  
You pass in a fetchFn for the server, and one for the client. These are wrapped and you call useIsoFetcher() to get that fetcher. The magic is that during SSR, any call made to this fetcher actually executes in a Server Component Context(!). This means the server fetchFn has access to cookies and can do auth etc.

The result is streamed back down to the SSR pass and the client. What this all means is that this just works (demo with React query):

```tsx
  const { id } = useParams<{ id: string }>();
  const fetcher = useIsoFetcher();

  const { data } = useSuspenseQuery({
    queryKey: ["key", id],
    queryFn: async () => {
      const result = await fetcher(`/api/${id}`);

      return result.data;
    },
  });
```