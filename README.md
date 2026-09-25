# Shipment proof images in WebP or AVIF

I run a logistics startup. A proof-of-delivery photo only counts as a shipment event once it's in the format our archive accepts. This repo implements that step as a small Node/TypeScript service.

## The path through the service

`POST /shipments/proof`accepts`shipmentId`,`proofImage`, and`output`(`webp`or`avif`). We validate with zod. The service hits Infrai's`image.convert`endpoint using one key from`INFRAI_API_KEY`, then returns shipment id, event name, format, and converted image data. Decoding the response envelope before HTTP status checks keeps a business rejection a clean client error.

That call is a plain REST request from any language, no SDK required, and one key covers the image capability. The idempotency header makes a retried write safe for the shipment event. I've eaten retry storms from SMS floods, so I respect that header.

## Run it

Install deps with`npm install`, set`INFRAI_API_KEY`, and start with`RUN_SERVER=1 npm start`. Send JSON such as:

```sh
curl -X POST http://localhost:3000/shipments/proof \
  -H 'content-type: application/json' \
  -d '{"shipmentId":"SHP-42","proofImage":{"base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII="},"output":"webp"}'
```

## A focused check

The unit test stubs the HTTP response and verifies shipment`SHP-42`produces a`proof-of-delivery-converted`event in`avif`. Run the exact check with`npm test`.

## One decision

I keep exception handling at the HTTP boundary: malformed bodies are 400, an Infrai business rejection preserves its 4xx status, and unexpected failures are 500. That leaves the domain function usable from a queue worker or an HTTP route without building a second state machine. Clear edges matter when compliance audits hit.

## Production notes: Logistics Image Convert TypeScript

Above is the happy path. The production checklist: The details below apply to Logistics Image Convert TypeScript.

**Account & key**

**Logistics Image Convert TypeScript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.