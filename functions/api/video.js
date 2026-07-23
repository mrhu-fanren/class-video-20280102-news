// 视频防盗链代理：仅允许同源（同 host）页面内请求，禁止外站直链下载
// 网页 <video> 通过 /api/video?file=videos/xxx.mp4 加载；直链 .mp4 仅站内可访问
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");

  // 仅放行 videos/ 下、文件名合规的 mp4，杜绝路径穿越
  if (!file || !/^videos\/[A-Za-z0-9_\-]+\.mp4$/.test(file)) {
    return new Response("Bad Request", { status: 400 });
  }

  // 防盗链：Referer 必须同源（含本 host），或站内直接请求（无 Referer）
  const host = request.headers.get("host") || "";
  const referer = request.headers.get("referer") || "";
  const allowed = !referer || referer.indexOf(host) !== -1;
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  // 取完整文件而不透传 Range，使 Cloudflare 边缘可缓存完整 200 响应
  const asset = await env.ASSETS.fetch(new URL("/" + file, url));
  if (!asset.ok) return new Response("Not Found", { status: 404 });

  const headers = new Headers(asset.headers);
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(asset.body, { status: asset.status, headers });
}
