interface Env {
  CF_API_TOKEN: string;
  CF_ZONE_ID: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return new Response(JSON.stringify({ error: "Missing Cloudflare credentials" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Calculate the date for 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${env.CF_ZONE_ID}" }) {
          httpRequests1dGroups(
            limit: 1000,
            filter: { date_gt: "${dateStr}" }
          ) {
            sum {
              visits
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Cloudflare API Error", details: errorText }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = (await response.json()) as any;

    const zones = data?.data?.viewer?.zones;
    let visits = 0;

    if (zones && zones.length > 0) {
      const groups = zones[0].httpRequests1dGroups;
      if (groups && groups.length > 0) {
        visits = groups.reduce((acc: number, group: any) => acc + (group?.sum?.visits || 0), 0);
      }
    }

    return new Response(JSON.stringify({ monthlyVisitors: visits }), {
      headers: {
        "Content-Type": "application/json",
        // Cache the response on the edge and browser for 1 hour to prevent hitting CF API limits
        "Cache-Control": "public, max-age=3600, s-maxage=3600"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch stats" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
