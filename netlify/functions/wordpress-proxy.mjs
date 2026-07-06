import http from "node:http";
import { Readable } from "node:stream";

const originIp = process.env.WORDPRESS_ORIGIN_IP ?? "104.154.116.193";
const originHost = process.env.WORDPRESS_ORIGIN_HOST ?? "kaylinanorton.com";
const functionPath = "/.netlify/functions/wordpress-proxy";

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const getProxyPath = (request) => {
  const url = new URL(request.url);
  let pathname = url.pathname;

  if (pathname.startsWith(functionPath)) {
    pathname = pathname.slice(functionPath.length) || "/";
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return `${pathname}${url.search}`;
};

const requestHeaders = (request) => {
  const headers = {};

  for (const [name, value] of request.headers.entries()) {
    if (!value || hopByHopHeaders.has(name.toLowerCase())) {
      continue;
    }

    headers[name] = value;
  }

  headers.host = originHost;
  headers["x-forwarded-proto"] = "https";
  headers["x-forwarded-host"] = originHost;
  headers["accept-encoding"] = "identity";
  headers["user-agent"] =
    headers["user-agent"] ?? "KaylinaNortonNetlifyProxy/1.0";

  return headers;
};

const responseHeaders = (headers) => {
  const nextHeaders = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (!value || hopByHopHeaders.has(name.toLowerCase())) {
      continue;
    }

    nextHeaders.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }

  return nextHeaders;
};

const proxyRequest = async (request) => {
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : Buffer.from(await request.arrayBuffer());

  return new Promise((resolve, reject) => {
    const originRequest = http.request(
      {
        hostname: originIp,
        port: 80,
        method: request.method,
        path: getProxyPath(request),
        headers: requestHeaders(request),
        timeout: 15000,
      },
      (originResponse) => {
        resolve(
          new Response(Readable.toWeb(originResponse), {
            status: originResponse.statusCode ?? 502,
            headers: responseHeaders(originResponse.headers),
          }),
        );
      },
    );

    originRequest.on("timeout", () => {
      originRequest.destroy(new Error("WordPress origin request timed out."));
    });
    originRequest.on("error", reject);

    if (body) {
      originRequest.write(body);
    }

    originRequest.end();
  });
};

export default async function wordpressProxy(request) {
  try {
    return await proxyRequest(request);
  } catch (error) {
    console.error(error);

    return new Response("Unable to reach WordPress origin.", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
