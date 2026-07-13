# Dynamic link previews (Lambda@Edge)

Injects per-slug Open Graph / Twitter tags so shared links
(`https://review.rateandreact.com/{slug}`) preview the vendor logo / product
image on WhatsApp, Facebook, iMessage, Telegram, Slack, LinkedIn and X.

## Why it's needed

The site is a client-side React SPA on S3 + CloudFront. Link-preview crawlers
**do not run JavaScript** — they read the raw HTML. Every route serves the same
static `index.html`, so without this function every link shows the generic
preview from `index.html`. This edge function detects crawler user-agents and
returns HTML with the correct per-slug tags; real users are passed through
untouched and get the normal SPA.

## How it works

- Attach [`index.js`](./index.js) to the CloudFront distribution's
  **viewer-request** event.
- Non-crawler request → returned unchanged (cheap UA regex; SPA unaffected).
- Crawler request for `/{slug}` → calls `GET {API_BASE}public/scan-qr/{slug}`,
  builds title/description/image, returns a small HTML doc with the OG tags and
  a `<meta refresh>` back to the app.

Config is hardcoded at the top of `index.js` (Lambda@Edge has no env vars):
`SITE_ORIGIN`, `API_BASE`, `DEFAULT_IMAGE`, `SITE_NAME`.

## Prerequisites

1. **A real fallback image.** Create a **1200×630 PNG** and upload it to the
   S3 bucket at `media/social/share-default.png` (so
   `https://review.rateandreact.com/media/social/share-default.png` resolves).
   PNG/JPG only — **SVG does not render as a preview** in WhatsApp/Facebook.
2. **Raster vendor/product images.** `vendor.logo_url` / `product.image` used
   for previews should be PNG/JPG with public absolute URLs. SVG or `data:`
   sources automatically fall back to the default image.

## Deploy

Lambda@Edge functions **must** live in **us-east-1**.

```bash
cd infra/og-lambda-edge
zip -r function.zip index.js

# 1) Create the function (Node.js 20.x) in us-east-1
aws lambda create-function \
  --region us-east-1 \
  --function-name rr-og-preview \
  --runtime nodejs20.x \
  --handler index.handler \
  --timeout 5 --memory-size 128 \
  --role arn:aws:iam::<ACCOUNT_ID>:role/<edge-lambda-exec-role> \
  --zip-file fileb://function.zip

# 2) Publish a version (Lambda@Edge requires a numbered version, not $LATEST)
aws lambda publish-version --region us-east-1 --function-name rr-og-preview
```

The IAM role needs the `AWSLambdaBasicExecutionRole` policy **and** a trust
policy allowing both `lambda.amazonaws.com` and `edgelambda.amazonaws.com`.

### Attach to CloudFront

In the CloudFront distribution → Behaviors → the default (`*`) behavior →
**Function associations** → add:

- Event type: **Viewer request**
- Function type: **Lambda@Edge**
- ARN: the **versioned** ARN from step 2
  (`arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:rr-og-preview:<N>`)

Save; wait for the distribution to redeploy (~5 min).

> Caching note: this runs at **viewer-request**, so it fires on every request
> and does not depend on the cache key. If you later move it to
> **origin-request** for cost, add `User-Agent` to the cache key (or a
> normalized bot/non-bot header) so bots and humans don't share a cached entry.

## Test

```bash
# Should return HTML with per-slug og:image (simulate a crawler):
curl -A "facebookexternalhit/1.1" https://review.rateandreact.com/<some-slug>

# Should return the SPA index.html untouched (normal browser UA):
curl -A "Mozilla/5.0" https://review.rateandreact.com/<some-slug> | head
```

Then validate with the official debuggers (they also refresh crawler caches):

- Facebook / WhatsApp: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- X/Twitter: https://cards-dev.twitter.com/validator
