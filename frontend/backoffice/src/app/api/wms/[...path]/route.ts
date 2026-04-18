import { proxy } from "@/lib/api-proxy";

// wms-api expose ses contrôleurs sous /api/* — on inclut /api dans la
// cible du proxy pour que /api/wms/producers hit wms:8080/api/producers.
const TARGET = () =>
  process.env.WMS_API_PROXY_TARGET ?? "http://localhost:8081/api";

export async function GET(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function POST(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function PUT(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function PATCH(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function DELETE(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function HEAD(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
export async function OPTIONS(req: Request, ctx: RouteContext<"/api/wms/[...path]">) {
  return proxy(req, ctx, TARGET());
}
