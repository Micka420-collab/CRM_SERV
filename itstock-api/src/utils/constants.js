const PLANS = {
  basic: {
    name: 'basic',
    displayName: 'Basic',
    description: 'Pour les petites equipes IT',
    maxSeats: 5,
    priceMonthly: 2900,  // 29.00 EUR
    priceYearly: 29000,  // 290.00 EUR
    features: [
      'Gestion d\'inventaire IT',
      'Suivi des prets PC',
      'Historique des actions',
      'Support par email',
      'Jusqu\'a 5 postes'
    ],
    sortOrder: 1
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    description: 'Pour les equipes en croissance',
    maxSeats: 20,
    priceMonthly: 5900,  // 59.00 EUR
    priceYearly: 59000,  // 590.00 EUR
    features: [
      'Tout le plan Basic',
      'Gestion de telephonie',
      'Rapports avances',
      'Export Excel/PDF',
      'Support prioritaire',
      'Jusqu\'a 20 postes'
    ],
    sortOrder: 2
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Pour les grandes organisations',
    maxSeats: 9999,
    priceMonthly: 9900,  // 99.00 EUR
    priceYearly: 99000,  // 990.00 EUR
    features: [
      'Tout le plan Pro',
      'Postes illimites',
      'Acces API',
      'Support dedie',
      'Formation incluse',
      'SLA garanti'
    ],
    sortOrder: 3
  }
};

const LICENSE_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  SUSPENDED: 'SUSPENDED'
};

const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  UNPAID: 'UNPAID'
};

module.exports = { PLANS, LICENSE_STATUS, SUB_STATUS };
