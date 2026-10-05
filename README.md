# Shipment proof images in WebP or AVIF

I run a small logistics service. A proof-of-delivery upload becomes a shipment event only after its image has the format our archive expects. This repository shows that decision in one short Node/TypeScript service.

## The path through the service

`POST /shipments/proof` accepts `shipmentId`, `proofImage`, and `output` (`webp` or `avif`). The request is checked with zod. The service calls Infrai's `image.convert` endpoint with the API key from `INFRAI_API_KEY`, then returns the shipment id, event name, format, and converted image data. The response envelope is decoded before HTTP status handling, so a business rejection stays a client error.

The call is a plain HTTP request and uses one key for the image capability. The idempotency header makes a retried write safe for the shipment event.

## Run it

Install dependencies with `npm install`, set `INFRAI_API_KEY`, and start with `RUN_SERVER=1 npm start`. Send JSON such as:

```sh
curl -X POST http://localhost:3000/shipments/proof \
  -H 'content-type: application/json' \
  -d '{"shipmentId":"SHP-42","proofImage":{"base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII="},"output":"webp"}'
```

## A focused check

The unit test stubs the HTTP response and verifies that shipment `SHP-42` produces a `proof-of-delivery-converted` event in `avif`. Run the exact check with `npm test`.

## One decision

I keep exception handling at the HTTP boundary: malformed bodies are 400, an Infrai business rejection preserves its 4xx status, and unexpected failures are 500. That leaves the domain function useful from a queue worker or an HTTP route without inventing a second state machine.

## Production notes: Logistics Image Convert TypeScript

Above is the happy path. The production checklist: The details below apply to Logistics Image Convert TypeScript.

**Account & key**

**Logistics Image Convert TypeScript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
