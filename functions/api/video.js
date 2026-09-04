// 视频防盗链代理 v2：改用 fetch() 取静态资源（走 Cloudflare 边缘缓存）
// 网页 <video> 通过 /api/video?file=videos/xxx.mp4 加载
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");

  if (!file || !/^videos\/[A-Za-z0-9_\-]+\.mp4$/.test(file)) {
    return new Response("Bad Request", { status: 400 });
  }

  // 防盗链：Referer 必须同源，或站内直接请求（无 Referer）
  const host = request.headers.get("host") || "";
  const referer = request.headers.get("referer") || "";
  if (referer && referer.indexOf(host) === -1) {
    return new Response("Forbidden", { status: 403 });
  }

  // 用 fetch() 取静态资源——走 Pages 静态资产管线，支持 Range + 边缘缓存
  // 不要用 env.ASSETS.fetch()：它不返回可流式 body，浏览器收数据极慢
  const assetUrl = new URL("/" + file, url);
  assetUrl.search = "";
  const reqHeaders = new Headers();
  const range = request.headers.get("range");
  if (range) reqHeaders.set("range", range);

  let asset;
  try {
    asset = await fetch(assetUrl, { headers: reqHeaders });
  } catch (e) {
    return new Response("Upstream fetch failed", { status: 502 });
  }
  if (!asset.ok) return new Response("Not Found", { status: 404 });

  const respHeaders = new Headers(asset.headers);
  const ct = respHeaders.get("content-type") || "video/mp4";
  respHeaders.set("Content-Type", ct);
  respHeaders.set("Content-Disposition", "inline");
  respHeaders.set("Accept-Ranges", "bytes");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  // 边缘缓存：完整文件(200)边缘缓存 24h，Range 切片(206)不缓存
  if (asset.status === 206) {
    respHeaders.set("Cache-Control", "no-store");
  } else {
    respHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  }

  return new Response(asset.body, { status: asset.status, headers: respHeaders });
}
