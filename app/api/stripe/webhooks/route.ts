import { revalidateTag } from "next/cache";
import { AdStatus } from "@prisma/client";
import type Stripe from "stripe";
import { env } from "~/env";
import { notifyAdvertiserOfAdLive } from "~/lib/notifications";
import { db } from "~/services/db";
import { stripe } from "~/services/stripe";

/**
 * Handle the Stripe webhook
 * @param req - The request
 * @returns The response
 */
export const POST = async (req: Request) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      return new Response("Webhook secret not found.", { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        switch (session.mode) {
          case "payment": {
            const adId = session.metadata?.adId;

            if (adId) {
              const { count } = await db.ad.updateMany({
                where: {
                  id: adId,
                  paidAt: null,
                  status: AdStatus.Approved,
                  cancelledAt: null,
                },
                data: { paidAt: new Date() },
              });

              if (count > 0) {
                const ad = await db.ad.findUnique({ where: { id: adId } });
                if (ad) {
                  await notifyAdvertiserOfAdLive(ad);
                }
              }

              revalidateTag("ads", "max");
            }

            break;
          }

          case "subscription": {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
            );

            // Handle tool featured listing
            if (subscription.metadata?.tool) {
              await db.port.update({
                where: { slug: subscription.metadata.tool },
                data: { isFeatured: true },
              });

              // Revalidate the cache
              revalidateTag("ports", "max");
            }

            break;
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const metadata = subscription.metadata;

        // Handle tool featured listing
        if (metadata?.tool) {
          await db.port.update({
            where: { slug: metadata?.tool },
            data: { isFeatured: false },
          });

          // Revalidate the cache
          revalidateTag("ports", "max");
        }

        // TODO: THIS IS NOT WORKING  because the metadata is set on the checkout session, not the subscription
        // Handle alternative ads
        if (metadata?.ads) {
          // Update the ad for the subscription
          await db.ad.update({
            where: { subscriptionId: subscription.id },
            data: { endsAt: new Date(), themes: { set: [] } },
          });

          // Revalidate the cache
          revalidateTag("ads", "max");
          revalidateTag("themes", "max");
        }

        break;
      }
    }
  } catch (error) {
    console.log(error);

    return new Response("Webhook handler failed", { status: 400 });
  }

  return new Response(JSON.stringify({ received: true }));
};
