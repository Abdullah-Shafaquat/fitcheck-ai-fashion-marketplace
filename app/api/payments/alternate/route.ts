import { NextResponse } from "next/server";
import { getAlternatePaymentInfoPublic } from "@/lib/paymentMethods";

export async function GET() {
  return NextResponse.json({ providers: getAlternatePaymentInfoPublic() });
}
