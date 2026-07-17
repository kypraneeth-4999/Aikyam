import { SignJWT, jwtVerify } from "jose";
import QRCode from "qrcode";

function secret(): Uint8Array {
  const s = process.env.QR_JWT_SECRET;
  if (!s) throw new Error("QR_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type TicketClaims = {
  ticketId: string;
  bookingId: string;
  eventId: string;
};

/** Sign a single-use ticket token (HMAC). Verified server-side at check-in. */
export async function signQrToken(claims: TicketClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("aikyam")
    .setIssuedAt()
    .sign(secret());
}

export async function verifyQrToken(token: string): Promise<TicketClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "aikyam" });
    if (!payload.ticketId || !payload.bookingId || !payload.eventId) return null;
    return {
      ticketId: String(payload.ticketId),
      bookingId: String(payload.bookingId),
      eventId: String(payload.eventId),
    };
  } catch {
    return null;
  }
}

/** Render a QR code (the signed token) as a PNG data URL. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 320 });
}
