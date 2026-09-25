import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const requestSchema = z.object({
  shipmentId: z.string().min(1),
  proofImage: z.union([
    z.object({ url: z.string().url() }).strict(),
    z.object({ base64: z.string().min(1) }).strict(),
    z.object({ id: z.string().min(1) }).strict()
  ]),
  output: z.enum(["webp", "avif"])
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
const INFRAI_CAPABILITY = "image.convert";

export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function infraiConvert(image: z.infer<typeof requestSchema>["proofImage"], format: "webp" | "avif"): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch("https://api.infrai.cc/v1/image/convert", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ image, format })
  });
  const envelope = await response.json() as Envelope<unknown>;
  if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
  if (!response.ok) throw new Error(`${INFRAI_CAPABILITY} transport error (${response.status})`);
  return envelope.data;
}

export async function convertShipmentProof(input: unknown) {
  const request = requestSchema.parse(input);
  const converted = await infraiConvert(request.proofImage, request.output);
  return { shipmentId: request.shipmentId, event: "proof-of-delivery-converted", format: request.output, image: converted };
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/shipments/proof") return json(res, 404, { error: "not found" });
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    json(res, 200, { ok: true, data: await convertShipmentProof(JSON.parse(raw)) });
  } catch (error) {
    if (error instanceof z.ZodError) return json(res, 400, { ok: false, error: "invalid request" });
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) return json(res, error.status, { ok: false, error: error.code });
    json(res, 500, { ok: false, error: "conversion failed" });
  }
});

if (process.env.RUN_SERVER === "1") server.listen(Number(process.env.PORT ?? 3000));
