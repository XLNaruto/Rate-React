"use strict";

/**
 * Lambda@Edge — dynamic link-preview (Open Graph) tags for the Rate + React SPA.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site is a client-side React SPA on S3 + CloudFront. Social crawlers
 * (WhatsApp, Facebook/Messenger, iMessage, Telegram, Slack, LinkedIn, X) do NOT
 * run JavaScript — they fetch the raw HTML at https://review.rateandreact.com/{slug}
 * and read the <meta property="og:*"> tags. Since every route serves the same
 * static index.html, without this function every shared link shows the same
 * generic preview. This function injects the per-slug vendor logo / product
 * image so each shared link previews correctly.
 *
 * TRIGGER: attach to the CloudFront distribution's **viewer-request** event.
 *   - Non-crawler requests are returned unchanged → CloudFront serves the SPA
 *     exactly as before (this adds only a cheap User-Agent regex check).
 *   - Crawler requests get a small HTML document containing the correct OG tags
 *     plus a <meta http-equiv="refresh"> so any human who lands on it still
 *     reaches the real app.
 *
 * CONSTRAINTS (AWS): must be deployed in us-east-1, no environment variables in
 * Lambda@Edge (config is hardcoded below), viewer-request cap is 5s / 128MB and
 * the generated body must stay under ~40KB — all satisfied here.
 */

// ---- config (Lambda@Edge cannot use env vars, so keep it here) -------------
var SITE_ORIGIN = "https://review.rateandreact.com";
var API_BASE = "https://api.rateandreact.com/"; // trailing slash
var DEFAULT_IMAGE = SITE_ORIGIN + "/media/social/share-default.png";
var SITE_NAME = "Rate + React";
var API_TIMEOUT_MS = 1500; // keep well under the 5s viewer-request budget

var https = require("https");

// Matches the crawlers that fetch link previews. Kept broad on purpose — a
// false positive just means a bot-shaped client gets the (correct) OG page.
var BOT_UA =
  /(facebookexternalhit|facebot|twitterbot|slackbot|slack-imgproxy|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|skypeuripreview|googlebot|bingbot|applebot|ia_archiver|bitlybot|nuzzel|flipboard|tumblr|bufferbot|opengraph|metainspector|iframely)/i;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Crawlers cannot render SVG previews (WhatsApp/Facebook/iMessage), so an SVG or
// data: source is not usable. Try each candidate in order and return the first
// usable raster URL; if none qualify, fall back to the branded default.
function pickImage() {
  for (var i = 0; i < arguments.length; i++) {
    var url = arguments[i];
    if (!url) continue;
    var u = String(url);
    if (/^data:/i.test(u)) continue;
    if (/\.svg(\?|#|$)/i.test(u)) continue;
    if (/^https?:\/\//i.test(u)) return u;
    // relative path from the API's asset host
    return API_BASE.replace(/\/$/, "") + "/" + u.replace(/^\//, "");
  }
  return DEFAULT_IMAGE;
}

function fetchJson(url) {
  return new Promise(function (resolve) {
    var settled = false;
    var done = function (v) {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    var req = https.get(url, { timeout: API_TIMEOUT_MS }, function (res) {
      if (res.statusCode !== 200) {
        res.resume();
        return done(null);
      }
      var body = "";
      res.setEncoding("utf8");
      res.on("data", function (c) {
        body += c;
        if (body.length > 1_000_000) {
          req.destroy();
          done(null);
        }
      });
      res.on("end", function () {
        try {
          done(JSON.parse(body));
        } catch (e) {
          done(null);
        }
      });
    });
    req.on("error", function () {
      done(null);
    });
    req.on("timeout", function () {
      req.destroy();
      done(null);
    });
  });
}

function buildMeta(slug, data) {
  var vendor = (data && data.vendor) || {};
  var product = (data && data.product) || {};
  var qr = (data && data.qr) || {};

  var business = vendor.business_name || SITE_NAME;
  var productName = product.name || "";
  var title = productName ? business + " · " + productName : business;
  var description = productName
    ? "Rate your experience with " + productName + " at " + business + "."
    : "Rate and react to your experience at " + business + ".";
  // Preview image priority: product photo → vendor logo → the QR code PNG →
  // default. pickImage() skips SVG/data: sources, so image_png_url (always a
  // raster PNG) is a safe last resort before the branded fallback.
  var image = pickImage(product.image, vendor.logo_url, qr.image_png_url);
  var pageUrl = SITE_ORIGIN + "/" + encodeURIComponent(slug);

  return { title: title, description: description, image: image, url: pageUrl };
}

function renderHtml(m) {
  var t = esc(m.title);
  var d = esc(m.description);
  var img = esc(m.image);
  var url = esc(m.url);
  return (
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<title>" + t + "</title>" +
    "<meta name=\"description\" content=\"" + d + "\">" +
    "<meta property=\"og:type\" content=\"website\">" +
    "<meta property=\"og:site_name\" content=\"" + esc(SITE_NAME) + "\">" +
    "<meta property=\"og:title\" content=\"" + t + "\">" +
    "<meta property=\"og:description\" content=\"" + d + "\">" +
    "<meta property=\"og:image\" content=\"" + img + "\">" +
    "<meta property=\"og:url\" content=\"" + url + "\">" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\">" +
    "<meta name=\"twitter:title\" content=\"" + t + "\">" +
    "<meta name=\"twitter:description\" content=\"" + d + "\">" +
    "<meta name=\"twitter:image\" content=\"" + img + "\">" +
    // If a real browser ever lands here, send it to the app.
    "<meta http-equiv=\"refresh\" content=\"0; url=" + url + "\">" +
    "</head><body><a href=\"" + url + "\">" + t + "</a></body></html>"
  );
}

exports.handler = async function (event) {
  var request = event.Records[0].cf.request;
  var headers = request.headers || {};
  var uaHeader = headers["user-agent"] && headers["user-agent"][0];
  var ua = (uaHeader && uaHeader.value) || "";

  // Real users / non-crawlers: pass through untouched → CloudFront serves the SPA.
  if (!BOT_UA.test(ua)) return request;

  // Extract the slug: first non-empty path segment. "/" or asset paths → no slug.
  var uri = request.uri || "/";
  var seg = uri.split("/").filter(Boolean)[0] || "";
  var isAsset = /\.[a-z0-9]{2,5}$/i.test(seg); // e.g. index.html, foo.js, img.png
  var slug = isAsset ? "" : seg;

  var meta;
  if (slug) {
    var data = await fetchJson(
      API_BASE + "public/scan-qr/" + encodeURIComponent(slug)
    );
    meta = buildMeta(slug, data); // buildMeta tolerates null → generic preview
  } else {
    meta = {
      title: SITE_NAME + " AI",
      description: "Scan, rate + react — share your experience in seconds.",
      image: DEFAULT_IMAGE,
      url: SITE_ORIGIN + "/",
    };
  }

  var body = renderHtml(meta);
  return {
    status: "200",
    statusDescription: "OK",
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
      // Let CloudFront/crawlers cache the preview briefly but re-check often.
      "cache-control": [{ key: "Cache-Control", value: "public, max-age=300" }],
    },
    body: body,
  };
};
