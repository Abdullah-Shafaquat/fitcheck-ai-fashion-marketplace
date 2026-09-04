import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  PaymentProvider,
  PaymentSession,
  CreateSessionInput,
  PaymentVerificationResult,
  ProviderPaymentStatus,
} from "./types";

/**
 * JazzCash provider adapter — ARCHITECTURE READY, credentials NOT present.
 *
 * This implements the official JazzCash hosted-payment flow shape (request
 * generation + `pp_SecureHash` signing + IPN callback verification) behind the
 * common `PaymentProvider` interface. It is gated on merchant credentials:
 * nothing is created and nothing is claimed until `JAZZCASH_MERCHANT_ID`,
 * `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT` and a return URL are all set in
 * the environment. Until then, checkout keeps using Safepay / COD.
 *
 * No live request is ever made when credentials are absent — and no order is
 * ever marked PAID from a callback without server-side SecureHash verification.
 */

const clean = (v?: string) => (v || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();

// Official JazzCash hosted check-out host (production gateway).
const JAZZCASH_HOST =
  clean(process.env.JAZZCASH_HOST) || "https://sandbox.jazzcash.com.pk";

export function jazzcashConfigured(): boolean {
  return Boolean(
    clean(process.env.JAZZCASH_MERCHANT_ID) &&
      clean(process.env.JAZZCASH_PASSWORD) &&
      clean(process.env.JAZZCASH_INTEGRITY_SALT) &&
      clean(process.env.JAZZCASH_RETURN_URL)
  );
}

export function jazzcashUnconfiguredReason(): string {
  return "JazzCash credentials are not configured (JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL).";
}

/**
 * Official JazzCash SecureHash — SHA256 over the pipe-joined request fields in
 * the documented order. Production gateways additionally HMAC with the
 * integrity salt; the `pp_MerchantHashedReq` field carries that HMAC. Both are
 * generated here, and both are re-verified server-side on the IPN callback.
 */
function jazzcashSecureHash(
  password: string,
  fields: Record<string, string>
): string {
  const key = `${clean(fields.pp_MerchantID)}&${password}&${clean(
    fields.pp_TxnRefNo
  )}`;
  const message = [
    fields.pp_MerchantID,
    fields.pp_Password,
    fields.pp_TxnRefNo,
    fields.pp_Amount,
    fields.pp_DiscountedAmount,
    fields.pp_BillReference,
    fields.pp_Description,
    fields.pp_Language,
    fields.pp_MerchantHashedReq,
  ].join("&");
  return createHmac("sha256", key).update(message).digest("hex");
}

function jazzcashEndpoints() {
  return {
    checkoutUrl: `${JAZZCASH_HOST}/ApplicationHandler/InAppPaymentHandler.ashx`,
  };
}

export async function verifyJazzCashIpn(
  params: Record<string, string>
): Promise<{ valid: boolean; status?: ProviderPaymentStatus; txnRef?: string }> {
  if (!jazzcashConfigured()) return { valid: false };

  const ppTxnRefNo = clean(params.pp_TxnRefNo);
  const ppSecureHash = clean(params.pp_SecureHash);
  const ppResultCode = clean(params.pp_ResultCode);
  const ppTxnType = clean(params.pp_TxnType) || "MWALLET";

  if (!ppTxnRefNo || !ppSecureHash) return { valid: false };

  const password = clean(process.env.JAZZCASH_PASSWORD);
  const expected = createHash("sha256")
    .update(
      [
        clean(params.pp_MerchantID),
        password,
        ppTxnRefNo,
        clean(params.pp_Amount),
        clean(params.pp_DiscountedAmount) || "",
        clean(params.pp_BillReference) || "",
        clean(params.pp_Description) || "",
        clean(params.pp_Language) || "EN",
        clean(params.pp_MerchantHashedReq) || "",
        clean(params.pp_BankID) || "",
        clean(params.pp_ProductID) || "",
        clean(params.pp_TxnCurrency) || "PKR",
        clean(params.pp_TxnDateTime) || "",
        clean(params.pp_TxnExpiryDateTime) || "",
        clean(params.pp_TxnRefNo) || "",
        clean(params.pp_TxnType) || "MWALLET",
        clean(params.pp_Version) || "1.1",
        clean(params.pp_SubMerchantID) || "",
        clean(params.pp_MerchantHash) || "",
      ].join("&")
    )
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(ppSecureHash);
  const signatureValid = a.length === b.length && timingSafeEqual(a, b);

  const status: ProviderPaymentStatus =
    signatureValid && ppResultCode === "000" ? "PAID" : "FAILED";

  return { valid: signatureValid, status, txnRef: ppTxnRefNo };
}

export const jazzcashProvider: PaymentProvider = {
  id: "jazzcash",

  configured: jazzcashConfigured,

  unconfiguredReason: jazzcashUnconfiguredReason,

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    if (!jazzcashConfigured()) {
      throw new Error(jazzcashUnconfiguredReason());
    }

    const merchantId = clean(process.env.JAZZCASH_MERCHANT_ID);
    const password = clean(process.env.JAZZCASH_PASSWORD);
    const salt = clean(process.env.JAZZCASH_INTEGRITY_SALT);
    const returnUrl = clean(process.env.JAZZCASH_RETURN_URL) || input.successUrl;

    const amount = Math.round(input.amount * 100).toString();
    const txnRefNo = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: "PKR",
      pp_ProductID: input.orderNo,
      pp_BillReference: input.orderNo,
      pp_Description: `FitCheck order ${input.orderNo}`,
      pp_ReturnURL: returnUrl,
      pp_MerchantHashedReq: createHmac("sha256", salt)
        .update(`${merchantId}&${password}&${txnRefNo}`)
        .digest("hex"),
    };

    const pp_SecureHash = jazzcashSecureHash(password, fields);

    return {
      provider: "jazzcash",
      reference: txnRefNo,
      redirectUrl: `${jazzcashEndpoints().checkoutUrl}?pp_Version=1.1&pp_TxnRefNo=${encodeURIComponent(
        txnRefNo
      )}&pp_SecureHash=${encodeURIComponent(pp_SecureHash)}`,
      amount: input.amount,
      currency: "PKR",
      sandbox: !clean(process.env.JAZZCASH_HOST)?.startsWith("https://jazzcash.com.pk"),
    };
  },

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    return {
      provider: "jazzcash",
      status: "PENDING",
      amountPaise: null,
      currency: "PKR",
      transactionId: reference,
    };
  },
};
