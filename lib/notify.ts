import prisma from "@/lib/prisma";
import { normalizeEmail } from "./customerAccount";

type NotificationType =
  | "order"
  | "payment"
  | "status"
  | "cancellation"
  | "refund"
  | "account"
  | "promo";

interface CreateNotificationOpts {
  userId?: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
}

export async function createNotification(opts: CreateNotificationOpts): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId || null,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
      },
    });
  } catch (error) {
    console.error("[NOTIFICATION_CREATE]", error);
  }
}

export async function notifyAdmin(opts: Omit<CreateNotificationOpts, "userId">): Promise<void> {
  await createNotification({ ...opts, userId: null });
}

export async function notifyCustomer(
  email: string,
  opts: Omit<CreateNotificationOpts, "userId">
): Promise<void> {
  await createNotification({ ...opts, userId: normalizeEmail(email) });
}

function customerLink(orderNo: string, email: string): string {
  return `/orders/${orderNo}?email=${encodeURIComponent(email)}`;
}

/** Order lifecycle event → customer notification. */
export async function notifyOrderEvent(
  email: string,
  orderNo: string,
  event: "placed" | "confirmed" | "processing" | "packed" | "shipped" | "out_for_delivery" | "delivered"
): Promise<void> {
  const messages: Record<string, { title: string; message: string }> = {
    placed: {
      title: "Order Placed",
      message: `Your order #${orderNo} has been placed successfully.`,
    },
    confirmed: {
      title: "Order Confirmed",
      message: `Your order #${orderNo} has been confirmed.`,
    },
    processing: {
      title: "Order Processing",
      message: `Your order #${orderNo} is being processed.`,
    },
    packed: {
      title: "Order Packed",
      message: `Your order #${orderNo} has been packed and is ready for shipment.`,
    },
    shipped: {
      title: "Order Shipped",
      message: `Your order #${orderNo} has been shipped.`,
    },
    out_for_delivery: {
      title: "Out for Delivery",
      message: `Your order #${orderNo} is out for delivery.`,
    },
    delivered: {
      title: "Order Delivered",
      message: `Your order #${orderNo} has been delivered.`,
    },
  };
  const cfg = messages[event];
  if (!cfg) return;
  await notifyCustomer(email, {
    type: "order",
    title: cfg.title,
    message: cfg.message,
    link: customerLink(orderNo, email),
  });
}

/** Cancellation workflow event → customer notification. */
export async function notifyCancellationEvent(
  email: string,
  orderNo: string,
  event: "requested" | "approved" | "rejected"
): Promise<void> {
  const messages: Record<string, { title: string; message: string }> = {
    requested: {
      title: "Cancellation Request Received",
      message: `Your cancellation request for order #${orderNo} has been received and is being reviewed.`,
    },
    approved: {
      title: "Cancellation Approved",
      message: `Your cancellation request for order #${orderNo} has been approved.`,
    },
    rejected: {
      title: "Cancellation Request Declined",
      message: `Your cancellation request for order #${orderNo} was declined.`,
    },
  };
  const cfg = messages[event];
  if (!cfg) return;
  await notifyCustomer(email, {
    type: "cancellation",
    title: cfg.title,
    message: cfg.message,
    link: customerLink(orderNo, email),
  });
}

/** Refund workflow event → customer notification. */
export async function notifyRefundEvent(
  email: string,
  orderNo: string,
  event: "requested" | "approved" | "rejected" | "completed"
): Promise<void> {
  const messages: Record<string, { title: string; message: string }> = {
    requested: {
      title: "Refund Requested",
      message: `Your refund request for order #${orderNo} has been received.`,
    },
    approved: {
      title: "Refund Approved",
      message: `Your refund request for order #${orderNo} has been approved.`,
    },
    rejected: {
      title: "Refund Request Declined",
      message: `Your refund request for order #${orderNo} was declined.`,
    },
    completed: {
      title: "Refund Completed",
      message: `Your refund for order #${orderNo} has been completed.`,
    },
  };
  const cfg = messages[event];
  if (!cfg) return;
  await notifyCustomer(email, {
    type: "refund",
    title: cfg.title,
    message: cfg.message,
    link: customerLink(orderNo, email),
  });
}
