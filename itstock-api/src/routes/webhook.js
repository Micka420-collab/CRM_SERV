const express = require('express');
const stripe = require('../config/stripe');
const {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated
} = require('../services/stripeService');
const { sendLicenseEmail } = require('../services/emailService');
const prisma = require('../config/database');

const router = express.Router();

/**
 * POST /api/v1/webhooks/stripe
 * Stripe webhook handler - receives raw body (not JSON parsed)
 */
router.post('/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const result = await handleCheckoutCompleted(session);

          // Send license key email
          if (result?.license) {
            const user = await prisma.user.findUnique({ where: { id: result.license.userId } });
            if (user) {
              await sendLicenseEmail(
                user.email,
                result.license.licenseKey,
                result.license.plan.displayName
              );
            }
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          // Skip the first invoice (handled by checkout.session.completed)
          if (invoice.billing_reason !== 'subscription_create') {
            await handleInvoicePaid(invoice);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await handleSubscriptionUpdated(subscription);
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[Webhook] Error handling ${event.type}:`, err);
      // Don't return error to Stripe - we already processed the event
    }

    res.json({ received: true });
  }
);

module.exports = router;
