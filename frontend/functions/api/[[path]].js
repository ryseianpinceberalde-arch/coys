export async function onRequest(context) {
  const { request, env, params } = context;
  const backendUrl = env.BACKEND_URL?.replace(/\/$/, "");

  if (!backendUrl) {
    return new Response("BACKEND_URL not configured", { status: 500 });
  }

  const path = params.path ? params.path.join("/") : "";
  const url = new URL(request.url);
  const targetUrl = `${backendUrl}/api/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
