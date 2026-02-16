const prisma = require('../config/database');

async function seed() {
  console.log('🌱 Seeding database...');

  // Create default plans
  const plans = [
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'Pour les petites equipes IT',
      maxSeats: 5,
      priceMonthly: 2900,
      priceYearly: 29000,
      features: JSON.stringify([
        "Gestion d'inventaire IT",
        "Suivi des prets PC",
        "Historique des actions",
        "Support par email",
        "Jusqu'a 5 postes"
      ]),
      isActive: true,
      sortOrder: 1
    },
    {
      name: 'pro',
      displayName: 'Pro',
      description: 'Pour les equipes en croissance',
      maxSeats: 20,
      priceMonthly: 5900,
      priceYearly: 59000,
      features: JSON.stringify([
        "Tout le plan Basic",
        "Gestion de telephonie",
        "Rapports avances",
        "Export Excel/PDF",
        "Support prioritaire",
        "Jusqu'a 20 postes"
      ]),
      isActive: true,
      sortOrder: 2
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Pour les grandes organisations',
      maxSeats: 999999,
      priceMonthly: 9900,
      priceYearly: 99000,
      features: JSON.stringify([
        "Tout le plan Pro",
        "Postes illimites",
        "Acces API",
        "Support dedie",
        "Formation incluse",
        "SLA garanti"
      ]),
      isActive: true,
      sortOrder: 3
    },
    {
      name: 'trial',
      displayName: 'Essai Gratuit',
      description: 'Licence d\'essai 10 jours',
      maxSeats: 1,
      priceMonthly: 0,
      priceYearly: 0,
      features: JSON.stringify([
        "Toutes les fonctionnalites Pro",
        "10 jours d'essai",
        "1 poste"
      ]),
      isActive: true,
      sortOrder: 0
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan
    });
    console.log(`✅ Plan "${plan.name}" created/updated`);
  }

  // Create demo user if not exists
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@itstock.com' },
    update: {},
    create: {
      email: 'demo@itstock.com',
      passwordHash: 'demo_password_not_used',
      name: 'Demo User',
      role: 'CUSTOMER'
    }
  });
  console.log('✅ Demo user created');

  // Create admin user if not exists
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@itstock.com' },
    update: {},
    create: {
      email: 'admin@itstock.com',
      passwordHash: '$2b$12$YourHashedPasswordHere', // admin123
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin user created');

  // Create a trial license for demo user
  const trialPlan = await prisma.plan.findUnique({ where: { name: 'trial' } });
  
  const existingLicense = await prisma.license.findFirst({
    where: {
      userId: demoUser.id,
      planId: trialPlan.id
    }
  });

  if (!existingLicense) {
    const { generateLicenseKey } = require('./crypto');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const license = await prisma.license.create({
      data: {
        licenseKey: generateLicenseKey(),
        userId: demoUser.id,
        planId: trialPlan.id,
        maxActivations: 1,
        expiresAt: expiresAt,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Trial license created for demo user:');
    console.log(`   License Key: ${license.licenseKey}`);
    console.log(`   Expires: ${expiresAt.toLocaleDateString('fr-FR')}`);
  } else {
    console.log('✅ Trial license already exists:');
    console.log(`   License Key: ${existingLicense.licenseKey}`);
  }

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Demo credentials:');
  console.log('   Email: demo@itstock.com');
  console.log('   Password: demo123');
  console.log('\n📋 Admin credentials:');
  console.log('   Email: admin@itstock.com');
  console.log('   Password: admin123');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
