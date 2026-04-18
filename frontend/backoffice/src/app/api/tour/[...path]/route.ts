import { proxy } from "@/lib/api-proxy";

const TARGET = () =>
  process.env.TOUR_API_PROXY_TARGET ?? "http://localhost:8080";

export async function GET(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function POST(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function PUT(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function PATCH(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function DELETE(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function HEAD(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function OPTIONS(req: Request, ctx: RouteContext<"/api/tour/[...path]">) {
  return proxy(req, ctx, TARGET());
}
