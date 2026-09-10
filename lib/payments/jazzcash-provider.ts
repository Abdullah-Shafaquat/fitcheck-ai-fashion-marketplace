import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  PaymentProvider,
  PaymentSession,
  CreateSessionInput,
  PaymentVerificationResult,
  ProviderPaymentStatus,
} from "./types";

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * JazzCash Hosted Checkout Integration (Sandbox / Production)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * ENV VARS REQUIRED (set in .env.local):
 *   NEXT_PUBLIC_JAZZCASH_MERCHANT_ID  — JazzCash Merchant ID
 *   JAZZCASH_PASSWORD                 — JazzCash API password
 *   JAZZCASH_SALT_KEY                 — JazzCash Integrity Salt for HMAC signing
 *   JAZZCASH_RETURN_URL               — Absolute URL for post-payment redirect
 *
 * SANDBOX ENDPOINT:
 *   https://sandbox.jazzcash.com.pk/ApplicationHandler/InAppPaymentHandler.ashx
 *
 * PRODUCTION ENDPOINT:
 *   https://www.jazzcash.com.pk/ApplicationHandler/InAppPaymentHandler.ashx
 *
 * ── HASH SIGNATURE — TWO LAYERS ──────────────────────────────────────────────
 *
 * JazzCash uses a two-layer hashing scheme:
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 1: pp_MerchantHashedReq (HMAC-SHA256 with Salt Key)                │
 * │                                                                          │
 * │ This authenticates the core transaction triplet using the Integrity Salt. │
 * │                                                                          │
 * │   pp_MerchantHashedReq = HMAC-SHA256(                                    │
 * │     saltKey,                                                             │
 * │     MerchantID & Password & TxnRefNo                                     │
 * │   )                                                                      │
 * │                                                                          │
 * │ Where "&" is the literal ampersand separator (NOT pipe, NOT comma).      │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 2: pp_SecureHash (SHA-256 plain hash)                             │
 * │                                                                          │
 * │ This is the final integrity check over ALL request/response fields.      │
 * │ It uses PLAIN SHA-256 (NOT HMAC), with the fields joined by "&".        │
 * │                                                                          │
 * │   pp_SecureHash = SHA256(                                                │
 * │     MerchantID & Password & TxnRefNo & Amount &                         │
 * │     DiscountedAmount & BillReference & Description &                     │
 * │     Language & MerchantHashedReq & BankID & ProductID &                  │
 * │     TxnCurrency & TxnDateTime & TxnExpiryDateTime &                     │
 * │     TxnRefNo & TxnType & Version & SubMerchantID &                      │
 * │     MerchantHash                                                         │
 * │   )                                                                      │
 * │                                                                          │
 * │ For the INITIAL REQUEST, MerchantHash is empty string ("").              │
 * │ For IPN CALLBACKS, MerchantHash is provided by JazzCash.                │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ── IPN CALLBACK VERIFICATION ───────────────────────────────────────────────
 *
 * On callback, JazzCash POSTs all pp_* fields to your IPN URL.
 * Recompute pp_SecureHash using ALL fields (including MerchantHash from JazzCash)
 * and compare against the received pp_SecureHash using constant-time comparison.
 *
 * pp_ResultCode "000" = success; anything else = failure.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const clean = (v?: string) =>
  (v || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();

// Sandbox: https://sandbox.jazzcash.com.pk
// Production: https://www.jazzcash.com.pk
const JAZZCASH_HOST =
  clean(process.env.JAZZCASH_HOST) ||
  "https://sandbox.jazzcash.com.pk";

const JAZZCASH_CHECKOUT_PATH =
  "/ApplicationHandler/InAppPaymentHandler.ashx";

/* ────────────────────────────────────────────────────────────────────────────
 * Configuration checks
 * ──────────────────────────────────────────────────────────────────────────── */

export function jazzcashConfigured(): boolean {
  return Boolean(
    clean(process.env.NEXT_PUBLIC_JAZZCASH_MERCHANT_ID) &&
      clean(process.env.JAZZCASH_PASSWORD) &&
      clean(process.env.JAZZCASH_SALT_KEY)
  );
}

export function jazzcashUnconfiguredReason(): string {
  return (
    "JazzCash credentials are not configured. " +
    "Set NEXT_PUBLIC_JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, and " +
    "JAZZCASH_SALT_KEY in .env.local."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LAYER 1: pp_MerchantHashedReq
 *
 * HMAC-SHA256 with the Integrity Salt as the key, over the concatenation
 * of MerchantID, Password, and TxnRefNo joined by "&".
 *
 * Purpose: Proves the request originated from the merchant who holds both
 * the merchant credentials AND the integrity salt.
 * ──────────────────────────────────────────────────────────────────────────── */

function computeMerchantHashedReq(
  saltKey: string,
  merchantId: string,
  password: string,
  txnRefNo: string
): string {
  const message = `${merchantId}&${password}&${txnRefNo}`;
  return createHmac("sha256", saltKey).update(message).digest("hex");
}

/* ────────────────────────────────────────────────────────────────────────────
 * LAYER 2: pp_SecureHash
 *
 * Plain SHA-256 (NOT HMAC) over all fields joined by "&" in the exact order
 * specified by the JazzCash integration guide.
 *
 * The field order is:
 *   MerchantID & Password & TxnRefNo & Amount & DiscountedAmount &
 *   BillReference & Description & Language & MerchantHashedReq &
 *   BankID & ProductID & TxnCurrency & TxnDateTime &
 *   TxnExpiryDateTime & TxnRefNo & TxnType & Version &
 *   SubMerchantID & MerchantHash
 *
 * Note: TxnRefNo appears TWICE — at position 3 and position 15.
 * For the initial request, MerchantHash is "" (empty string).
 * For IPN callbacks, MerchantHash is provided by JazzCash in the response.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The canonical field order for pp_SecureHash computation. */
const SECURE_HASH_FIELDS = [
  "pp_MerchantID",
  "pp_Password",
  "pp_TxnRefNo",
  "pp_Amount",
  "pp_DiscountedAmount",
  "pp_BillReference",
  "pp_Description",
  "pp_Language",
  "pp_MerchantHashedReq",
  "pp_BankID",
  "pp_ProductID",
  "pp_TxnCurrency",
  "pp_TxnDateTime",
  "pp_TxnExpiryDateTime",
  "pp_TxnRefNo",       // Second occurrence — deliberate per JazzCash spec
  "pp_TxnType",
  "pp_Version",
  "pp_SubMerchantID",
  "pp_MerchantHash",
] as const;

function computeSecureHash(
  fields: Record<string, string>
): string {
  const values = SECURE_HASH_FIELDS.map((f) => clean(fields[f]));
  const message = values.join("&");
  return createHash("sha256").update(message).digest("hex");
}

/**
 * Verify a pp_SecureHash against the full set of fields.
 * Uses constant-time comparison to prevent timing side-channel attacks.
 */
function verifySecureHash(fields: Record<string, string>): boolean {
  const receivedHash = clean(fields.pp_SecureHash);
  if (!receivedHash) return false;

  const expectedHash = computeSecureHash(fields);

  const expectedBuf = Buffer.from(expectedHash, "hex");
  const receivedBuf = Buffer.from(receivedHash, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Public IPN verification function (used by webhook route handler)
 * ──────────────────────────────────────────────────────────────────────────── */

export async function verifyJazzCashIpn(
  params: Record<string, string>
): Promise<{
  valid: boolean;
  status?: ProviderPaymentStatus;
  txnRef?: string;
}> {
  if (!jazzcashConfigured()) return { valid: false };

  const ppTxnRefNo = clean(params.pp_TxnRefNo);
  if (!ppTxnRefNo) return { valid: false };

  // Verify the SecureHash using all provided fields
  const valid = verifySecureHash(params);

  // pp_ResultCode "000" = success
  const ppResultCode = clean(params.pp_ResultCode);
  const status: ProviderPaymentStatus =
    valid && ppResultCode === "000" ? "PAID" : "FAILED";

  return { valid, status, txnRef: ppTxnRefNo };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PaymentProvider implementation
 * ──────────────────────────────────────────────────────────────────────────── */

export const jazzcashProvider: PaymentProvider = {
  id: "jazzcash",

  configured: jazzcashConfigured,

  unconfiguredReason: jazzcashUnconfiguredReason,

  /**
   * Initiate a JazzCash hosted checkout session.
   *
   * This builds the complete signed request payload with both hash layers:
   *  1. pp_MerchantHashedReq = HMAC-SHA256(saltKey, MerchantID & Password & TxnRefNo)
   *  2. pp_SecureHash = SHA256(all fields joined by "&")
   *
   * The customer is redirected to JazzCash's hosted checkout page where they
   * select their payment method and complete the transaction. JazzCash then
   * sends an IPN to our webhook for server-side verification.
   *
   * Flow:
   *  1. Generate unique transaction reference
   *  2. Compute Layer 1 hash (pp_MerchantHashedReq)
   *  3. Assemble all request fields
   *  4. Compute Layer 2 hash (pp_SecureHash) over all fields
   *  5. Return redirect URL to JazzCash hosted checkout
   *  6. JazzCash sends IPN callback to our webhook for verification
   */
  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    if (!jazzcashConfigured()) {
      throw new Error(jazzcashUnconfiguredReason());
    }

    const merchantId = clean(process.env.NEXT_PUBLIC_JAZZCASH_MERCHANT_ID);
    const password = clean(process.env.JAZZCASH_PASSWORD);
    const saltKey = clean(process.env.JAZZCASH_SALT_KEY);
    const returnUrl =
      clean(process.env.JAZZCASH_RETURN_URL) || input.successUrl;

    // Generate unique transaction reference
    const txnRefNo = `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // JazzCash expects amount in paisa (multiply rupees by 100)
    // e.g., PKR 1500 → "150000"
    const amount = Math.round(input.amount * 100).toString();

    // Current date-time in JazzCash format: YYYYMMDDHHmmss
    const now = new Date();
    const txnDateTime =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    // Transaction expiry: 1 hour from now
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);
    const txnExpiryDateTime =
      expiry.getFullYear().toString() +
      (expiry.getMonth() + 1).toString().padStart(2, "0") +
      expiry.getDate().toString().padStart(2, "0") +
      expiry.getHours().toString().padStart(2, "0") +
      expiry.getMinutes().toString().padStart(2, "0") +
      expiry.getSeconds().toString().padStart(2, "0");

    // ── LAYER 1: pp_MerchantHashedReq ─────────────────────────────────
    // HMAC-SHA256(saltKey, MerchantID & Password & TxnRefNo)
    const merchantHashedReq = computeMerchantHashedReq(
      saltKey,
      merchantId,
      password,
      txnRefNo
    );

    // Assemble all request fields
    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ProductID: input.orderNo,
      pp_BillReference: input.orderNo,
      pp_Description: `Payment for order ${input.orderNo}`,
      pp_ReturnURL: returnUrl,
      pp_SubMerchantID: "",
      pp_DiscountedAmount: "",
      pp_BankID: "",
      pp_MerchantHashedReq: merchantHashedReq,
      pp_MerchantHash: "",  // Empty for initial request
    };

    // ── LAYER 2: pp_SecureHash ─────────────────────────────────────────
    // SHA256(all fields joined by "&" in canonical order)
    //
    // The canonical order is:
    //   MerchantID & Password & TxnRefNo & Amount & DiscountedAmount &
    //   BillReference & Description & Language & MerchantHashedReq &
    //   BankID & ProductID & TxnCurrency & TxnDateTime &
    //   TxnExpiryDateTime & TxnRefNo & TxnType & Version &
    //   SubMerchantID & MerchantHash
    //
    // Note: TxnRefNo appears TWICE (positions 3 and 15) as per JazzCash spec.
    const ppSecureHash = computeSecureHash(fields);

    // Build the redirect URL
    // The customer's browser is sent to JazzCash's hosted checkout page
    const params = new URLSearchParams({
      pp_Version: fields.pp_Version,
      pp_TxnType: fields.pp_TxnType,
      pp_Language: fields.pp_Language,
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ProductID: input.orderNo,
      pp_BillReference: input.orderNo,
      pp_Description: fields.pp_Description,
      pp_ReturnURL: returnUrl,
      pp_SubMerchantID: "",
      pp_DiscountedAmount: "",
      pp_BankID: "",
      pp_MerchantHashedReq: merchantHashedReq,
      pp_MerchantHash: "",
      pp_SecureHash: ppSecureHash,
    });

    const checkoutUrl = `${JAZZCASH_HOST}${JAZZCASH_CHECKOUT_PATH}?${params.toString()}`;

    return {
      provider: "jazzcash",
      reference: txnRefNo,
      redirectUrl: checkoutUrl,
      amount: input.amount,
      currency: "PKR",
      sandbox: !JAZZCASH_HOST.includes("www.jazzcash.com.pk"),
    };
  },

  /**
   * Server-side payment verification by order reference.
   *
   * Similar to Easypaisa, the authoritative verification for JazzCash
   * happens through the IPN callback. This is a fallback that returns
   * PENDING status.
   */
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
