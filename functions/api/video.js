// 视频防盗链代理：支持 Range 请求（流式播放 + 拖拽进度条）+ 边缘缓存
// 网页 <video> 通过 /api/video?file=videos/xxx.mp4 加载
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");

  if (!file || !/^videos\/[A-Za-z0-9_\-]+\.mp4$/.test(file)) {
    return new Response("Bad Request", { status: 400 });
  }

  // 防盗链：Referer 必须同源，或站内直接请求
  const host = request.headers.get("host") || "";
  const referer = request.headers.get("referer") || "";
  if (referer && referer.indexOf(host) === -1) {
    return new Response("Forbidden", { status: 403 });
  }

  // 构造请求：透传 Range 头，使浏览器可流式播放 / 拖拽进度条
  const assetUrl = new URL("/" + file, url);
  const reqHeaders = new Headers();
  const range = request.headers.get("range");
  if (range) reqHeaders.set("range", range);

  const asset = await env.ASSETS.fetch(assetUrl, { headers: reqHeaders });
  if (!asset.ok) return new Response("Not Found", { status: 404 });

  const respHeaders = new Headers(asset.headers);
  const contentType = respHeaders.get("content-type") || "video/mp4";
  respHeaders.set("Content-Type", contentType);
  respHeaders.set("Content-Disposition", "inline");
  respHeaders.set("Accept-Ranges", "bytes");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  // 边缘缓存策略：
  //   200（完整文件）→ 边缘缓存 1 小时，全站共享
  //   206（Range 切片）→ 不缓存（每个 range 不同），浏览器本地缓存 60s
  if (asset.status === 206) {
    respHeaders.set("Cache-Control", "private, max-age=60");
  } else {
    respHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  }

  return new Response(asset.body, { status: asset.status, headers: respHeaders });
}
