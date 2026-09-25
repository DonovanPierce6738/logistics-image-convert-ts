import assert from "node:assert/strict";
import test from "node:test";
import { convertShipmentProof } from "./shipment_service.ts";

test("a POD conversion keeps shipment identity and requested format", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { image: { id: "upload-7" }, format: "avif" });
    return new Response(JSON.stringify({ ok: true, data: { id: "converted-1" }, metadata: {} }), { status: 200 });
  };
  process.env.INFRAI_API_KEY = "test-key";
  const result = await convertShipmentProof({ shipmentId: "SHP-42", proofImage: { id: "upload-7" }, output: "avif" });
  assert.deepEqual(result, { shipmentId: "SHP-42", event: "proof-of-delivery-converted", format: "avif", image: { id: "converted-1" } });
  globalThis.fetch = oldFetch;
});
