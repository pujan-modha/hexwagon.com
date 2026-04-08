import { randomUUID } from "node:crypto"
import { env } from "~/env"

const globalForPayPal = globalThis as unknown as {
  paypalAccessToken?: {
    accessToken: string
    expiresAt: number
  }
}

const paypalBaseUrl =
  env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"

type PayPalLink = {
  href: string
  rel: string
  method?: string
}

type PayPalSubscription = {
  id: string
  status: string
  custom_id?: string | null
  subscriber?: {
    email_address?: string | null
  } | null
  links?: PayPalLink[]
}

type PayPalPlan = {
  id: string
  status: string
}

type PayPalWebhookVerificationResult = {
  verification_status?: string
}

type CreatePayPalSubscriptionInput = {
  planId: string
  customId: string
  amountCents: number
  subscriberEmail: string
  returnUrl: string
  cancelUrl: string
}

type VerifyPayPalWebhookInput = {
  headers: {
    authAlgo: string
    certUrl: string
    transmissionId: string
    transmissionSig: string
    transmissionTime: string
  }
  body: unknown
}

type RefundedPayment = {
  id: string
  status?: string
}

const getAccessToken = async () => {
  const cachedToken = globalForPayPal.paypalAccessToken

  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) return cachedToken.accessToken

  const credentials = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`,
    "utf8",
  ).toString("base64")

  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`PayPal auth failed: ${message}`)
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  globalForPayPal.paypalAccessToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message
  }

  if ("details" in payload && Array.isArray(payload.details)) {
    const detailMessages = payload.details
      .map(detail =>
        typeof detail === "object" &&
        detail &&
        "description" in detail &&
        typeof detail.description === "string"
          ? detail.description
          : null,
      )
      .filter((detail): detail is string => Boolean(detail))

    if (detailMessages.length > 0) {
      return detailMessages.join(", ")
    }
  }

  return fallback
}

const paypalRequest = async <TResponse>(
  path: string,
  init?: RequestInit,
  options?: {
    idempotencyKey?: string
  },
) => {
  const accessToken = await getAccessToken()
  const response = await fetch(`${paypalBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options?.idempotencyKey ? { "PayPal-Request-Id": options.idempotencyKey } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (response.status === 204) {
    return null as TResponse
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `PayPal request failed with ${response.status}`))
  }

  return payload as TResponse
}

const formatAmount = (amountCents: number) => (amountCents / 100).toFixed(2)

const getApproveLink = (links?: PayPalLink[]) => {
  const approveLink = links?.find(link => link.rel === "approve")?.href

  if (!approveLink) {
    throw new Error("PayPal did not return an approval link.")
  }

  return approveLink
}

const ensureConfiguredPlanId = (planId: string, label: string) => {
  if (!planId || planId.startsWith("your-")) {
    throw new Error(
      `${label} is not configured. Set a real PayPal plan ID in .env.local for the matching environment.`,
    )
  }
}

export const showPayPalPlan = async (planId: string) => {
  return paypalRequest<PayPalPlan>(`/v1/billing/plans/${planId}`)
}

export const assertPayPalPlanReady = async (planId: string, label: string) => {
  const plan = await showPayPalPlan(planId)

  if (plan.status !== "ACTIVE") {
    throw new Error(
      `${label} exists but is ${plan.status}. PayPal only creates subscriptions from ACTIVE plans.`,
    )
  }
}

export const createPayPalSubscription = async ({
  planId,
  customId,
  amountCents,
  subscriberEmail,
  returnUrl,
  cancelUrl,
}: CreatePayPalSubscriptionInput) => {
  ensureConfiguredPlanId(planId, "PayPal plan ID")

  const subscription = await paypalRequest<PayPalSubscription>(
    "/v1/billing/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        custom_id: customId,
        subscriber: {
          email_address: subscriberEmail,
        },
        application_context: {
          user_action: "SUBSCRIBE_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
        plan: {
          billing_cycles: [
            {
              sequence: 1,
              pricing_scheme: {
                fixed_price: {
                  value: formatAmount(amountCents),
                  currency_code: "USD",
                },
              },
            },
          ],
        },
        quantity: "1",
      }),
    },
    { idempotencyKey: randomUUID() },
  )

  return {
    id: subscription.id,
    status: subscription.status,
    approveUrl: getApproveLink(subscription.links),
  }
}

export const showPayPalSubscription = async (subscriptionId: string) => {
  return paypalRequest<PayPalSubscription>(`/v1/billing/subscriptions/${subscriptionId}`)
}

export const cancelPayPalSubscription = async ({
  subscriptionId,
  reason,
}: {
  subscriptionId: string
  reason: string
}) => {
  const subscription = await showPayPalSubscription(subscriptionId)

  if (["CANCELLED", "EXPIRED"].includes(subscription.status)) {
    return
  }

  await paypalRequest<null>(
    `/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason.slice(0, 127) }),
    },
    { idempotencyKey: randomUUID() },
  )
}

export const verifyPayPalWebhookSignature = async ({ headers, body }: VerifyPayPalWebhookInput) => {
  const result = await paypalRequest<PayPalWebhookVerificationResult>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      }),
    },
  )

  return result.verification_status === "SUCCESS"
}

const refundViaCapture = async (paymentId: string) => {
  return paypalRequest<RefundedPayment>(
    `/v2/payments/captures/${paymentId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    { idempotencyKey: randomUUID() },
  )
}

const refundViaSale = async (paymentId: string) => {
  return paypalRequest<RefundedPayment>(
    `/v1/payments/sale/${paymentId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    { idempotencyKey: randomUUID() },
  )
}

export const refundPayPalPayment = async (paymentId: string) => {
  try {
    return await refundViaCapture(paymentId)
  } catch {
    return refundViaSale(paymentId)
  }
}

export const getPayPalPlanId = (billingCycle: "Weekly" | "Monthly") =>
  billingCycle === "Monthly" ? env.PAYPAL_MONTHLY_PLAN_ID : env.PAYPAL_WEEKLY_PLAN_ID
