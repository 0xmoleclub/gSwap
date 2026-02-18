const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000';

export async function fetchGraphQL<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  return json.data as T;
}
