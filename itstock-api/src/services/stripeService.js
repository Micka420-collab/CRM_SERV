const stripe = require('../config/stripe');
const prisma = require('../config/database');
const { createLicense } = require('./licenseService');

/**
 * Get or create a Stripe customer for a user
 */
async function getOrCreateCustomer(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Utilisateur non trouve');

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for a subscription
 */
async function createCheckoutSession(userId, planName, billingInterval) {
  const plan = await prisma.plan.findUnique({ where: { name: planName } });
  if (!plan) throw new Error('Plan non trouve');

  const priceId = billingInterval === 'yearly'
    ? plan.stripePriceIdYearly
    : plan.stripePriceIdMonthly;

  if (!priceId) throw new Error('Stripe price ID non configure pour ce plan');

  const customerId = await getOrCreateCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: {
      userId,
      planId: plan.id,
      planName: plan.name,
      billingInterval
    },
    subscription_data: {
      metadata: {
        userId,
        planId: plan.id
      }
    }
  });

  return { url: session.url, sessionId: session.id };
}

/**
 * Handle Stripe webhook: checkout.session.completed
 * Creates the subscription and license records
 */
async function handleCheckoutCompleted(session) {
  const { userId, planId, billingInterval } = session.metadata;

  if (!userId || !planId) {
    console.error('[Stripe] Missing metadata in checkout session:', session.id);
    return;
  }

  // Retrieve the subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

  // Create subscription record
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      status: 'ACTIVE',
      billingInterval: billingInterval || 'monthly',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    }
  });

  // Create the license
  const expiresAt = new Date(stripeSubscription.current_period_end * 1000);
  const license = await createLicense(userId, planId, expiresAt);

  console.log(`[Stripe] Created license ${license.licenseKey} for user ${userId}, plan ${planId}`);

  return { subscription, license };
}

/**
 * Handle Stripe webhook: invoice.paid (subscription renewal)
 */
async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: invoice.subscription }
  });

  if (!subscription) return;

  // Update subscription period
  const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    }
  });

  // Renew the license expiration
  const license = await prisma.license.findFirst({
    where: { userId: subscription.userId, planId: subscription.planId, status: 'ACTIVE' }
  });

  if (license) {
    await prisma.license.update({
      where: { id: license.id },
      data: { expiresAt: new Date(stripeSubscription.current_period_end * 1000) }
    });
    console.log(`[Stripe] Renewed license ${license.licenseKey} until ${stripeSubscription.current_period_end}`);
  }
}

/**
 * Handle Stripe webhook: invoice.payment_failed
 */
async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: invoice.subscription }
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' }
    });
  }
}

/**
 * Handle Stripe webhook: customer.subscription.deleted
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED' }
  });

  // The license remains active until its expiresAt date (end of paid period)
  console.log(`[Stripe] Subscription ${stripeSubscription.id} canceled for user ${subscription.userId}`);
}

/**
 * Handle Stripe webhook: customer.subscription.updated
 */
async function handleSubscriptionUpdated(stripeSubscription) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    }
  });
}

/**
 * Create a Stripe Customer Portal session
 */
async function createPortalSession(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) throw new Error('Aucun compte Stripe associe');

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.WEBSITE_URL}/dashboard/subscription`
  });

  return { url: session.url };
}

module.exports = {
  getOrCreateCustomer,
  createCheckoutSession,
  handleCheckoutCompleted,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  createPortalSession
};
