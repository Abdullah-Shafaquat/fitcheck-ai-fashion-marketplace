import prisma from "@/lib/prisma";

export async function createSellerNotification(input: {
  sellerId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  try {
    await prisma.sellerNotification.create({
      data: {
        sellerId: input.sellerId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
      },
    });
  } catch (error) {
    console.error("[SELLER_NOTIFICATION_CREATE]", error);
  }
}

export async function notifySeller(
  sellerId: string,
  input: { type: string; title: string; message: string; link?: string | null }
): Promise<void> {
  await createSellerNotification({ sellerId, ...input });
}
