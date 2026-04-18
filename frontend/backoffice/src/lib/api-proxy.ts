// Catch-all proxy utilitaire pour les routes API internes du back-office.
// Résout le target à chaque appel (évite le pièce à build time qui avait
// baked `localhost:8080` dans les rewrites Next.config).

type Ctx<T extends string> = {
  params: Promise<{ path: string[] }>;
} & (T extends string ? unknown : never);

// Headers qu'on ne doit PAS forwarder (gérés par fetch ou privés au runtime).
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "host",
  "content-length",
]);

function buildHeaders(req: Request): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

export async function proxy(
  req: Request,
  ctx: Ctx<string>,
  target: string,
): Promise<Response> {
  const { path } = await ctx.params;
  const subPath = (path ?? []).join("/");
  const incoming = new URL(req.url);
  const destination = new URL(`${target.replace(/\/$/, "")}/${subPath}`);
  destination.search = incoming.search;

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers: buildHeaders(req),
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(destination, init);
  } catch (err) {
    console.error(`[proxy] ${req.method} ${destination} failed`, err);
    return Response.json(
      { error: "upstream_unreachable", target: destination.toString() },
      { status: 502 },
    );
  }

  const respHeaders = new Headers(upstream.headers);
  // Supprime les headers que le runtime Next va reconstruire.
  HOP_BY_HOP.forEach((h) => respHeaders.delete(h));

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
