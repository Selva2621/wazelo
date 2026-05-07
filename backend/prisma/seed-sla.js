const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ORG = '5dcf2ffb-d687-41d0-9d06-5fd15ca0981b';
const ADMIN = 'f76420e3-5f3c-49b2-becb-d94aea584c9f';
const EMPLOYEE = 'eca11005-2824-4e3b-9bee-4426d6a0a2d2';

async function main() {
  const convos = await p.conversation.findMany({
    where: { orgId: ORG },
    select: { id: true },
    take: 20,
  });
  console.log('Found', convos.length, 'conversations');

  if (convos.length < 5) {
    console.error('Need at least 5 conversations to seed SLA data');
    return;
  }

  // ─── 1. Create SLA Policies ───
  const policies = await Promise.all([
    p.slaPolicy.create({
      data: {
        orgId: ORG,
        name: 'Critical First Response',
        description: 'All inbound messages must receive a first reply within 5 minutes',
        metricType: 'FIRST_RESPONSE_TIME',
        priority: 'CRITICAL',
        thresholdMs: 300000,
        warningThresholdMs: 180000,
        isActive: true,
        businessHoursOnly: false,
        notifyOnWarning: true,
        notifyOnBreach: true,
        createdById: ADMIN,
      },
    }),
    p.slaPolicy.create({
      data: {
        orgId: ORG,
        name: 'Standard Response SLA',
        description: 'Non-urgent conversations should be responded to within 15 minutes',
        metricType: 'FIRST_RESPONSE_TIME',
        priority: 'NORMAL',
        thresholdMs: 900000,
        warningThresholdMs: 600000,
        isActive: true,
        businessHoursOnly: true,
        businessHoursStart: 9,
        businessHoursEnd: 18,
        businessDays: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        notifyOnWarning: true,
        notifyOnBreach: true,
        createdById: ADMIN,
      },
    }),
    p.slaPolicy.create({
      data: {
        orgId: ORG,
        name: 'Resolution Time SLA',
        description: 'Conversations should be resolved within 4 hours',
        metricType: 'RESOLUTION_TIME',
        priority: 'HIGH',
        thresholdMs: 14400000,
        warningThresholdMs: 10800000,
        isActive: true,
        businessHoursOnly: false,
        notifyOnWarning: true,
        notifyOnBreach: true,
        createdById: ADMIN,
      },
    }),
  ]);
  console.log('Created', policies.length, 'SLA policies');

  const criticalPolicy = policies[0];
  const standardPolicy = policies[1];

  const now = Date.now();
  const trackings = [];

  // ─── 2. Conversations that MET the SLA ───
  for (let i = 0; i < Math.min(8, convos.length); i++) {
    const startedMs = now - (i + 1) * 3600000 * 2;
    const responseMs = 60000 + Math.random() * 180000;
    trackings.push(
      p.slaTracking.create({
        data: {
          orgId: ORG,
          policyId: criticalPolicy.id,
          conversationId: convos[i % convos.length].id,
          assignedUserId: i % 2 === 0 ? ADMIN : EMPLOYEE,
          startedAt: new Date(startedMs),
          respondedAt: new Date(startedMs + responseMs),
          deadlineAt: new Date(startedMs + criticalPolicy.thresholdMs),
          warningAt: new Date(startedMs + criticalPolicy.warningThresholdMs),
          elapsedMs: Math.round(responseMs),
          isBreached: false,
          isWarning: false,
          idempotencyKey: 'seed-met-' + i + '-' + now,
        },
      })
    );
  }

  // ─── 3. Conversations with WARNING ───
  for (let i = 0; i < 3; i++) {
    const ci = (i + 8) % convos.length;
    const startedMs = now - (i + 1) * 7200000;
    const responseMs = 200000 + Math.random() * 80000;
    trackings.push(
      p.slaTracking.create({
        data: {
          orgId: ORG,
          policyId: criticalPolicy.id,
          conversationId: convos[ci].id,
          assignedUserId: i % 2 === 0 ? EMPLOYEE : ADMIN,
          startedAt: new Date(startedMs),
          respondedAt: new Date(startedMs + responseMs),
          deadlineAt: new Date(startedMs + criticalPolicy.thresholdMs),
          warningAt: new Date(startedMs + criticalPolicy.warningThresholdMs),
          elapsedMs: Math.round(responseMs),
          isBreached: false,
          isWarning: true,
          idempotencyKey: 'seed-warn-' + i + '-' + now,
        },
      })
    );
  }

  // ─── 4. Conversations that BREACHED ───
  for (let i = 0; i < 4; i++) {
    const ci = (i + 11) % convos.length;
    const startedMs = now - (i + 1) * 5400000;
    const responseMs = 360000 + Math.random() * 300000;
    trackings.push(
      p.slaTracking.create({
        data: {
          orgId: ORG,
          policyId: criticalPolicy.id,
          conversationId: convos[ci].id,
          assignedUserId: i % 2 === 0 ? EMPLOYEE : ADMIN,
          startedAt: new Date(startedMs),
          respondedAt: new Date(startedMs + responseMs),
          deadlineAt: new Date(startedMs + criticalPolicy.thresholdMs),
          warningAt: new Date(startedMs + criticalPolicy.warningThresholdMs),
          elapsedMs: Math.round(responseMs),
          isBreached: true,
          isWarning: true,
          idempotencyKey: 'seed-breach-' + i + '-' + now,
        },
      })
    );
  }

  // ─── 5. Currently active trackings (no response yet) ───
  for (let i = 0; i < 2; i++) {
    const ci = (i + 15) % convos.length;
    const startedMs = now - 120000;
    trackings.push(
      p.slaTracking.create({
        data: {
          orgId: ORG,
          policyId: criticalPolicy.id,
          conversationId: convos[ci].id,
          assignedUserId: EMPLOYEE,
          startedAt: new Date(startedMs),
          deadlineAt: new Date(startedMs + criticalPolicy.thresholdMs),
          warningAt: new Date(startedMs + criticalPolicy.warningThresholdMs),
          isBreached: false,
          isWarning: false,
          idempotencyKey: 'seed-active-' + i + '-' + now,
        },
      })
    );
  }

  const created = await Promise.all(trackings);
  console.log('Created', created.length, 'SLA trackings');

  // ─── 6. Breach Logs ───
  const breaches = await Promise.all([
    // 2 active breaches
    p.slaBreachLog.create({
      data: {
        orgId: ORG,
        policyId: criticalPolicy.id,
        conversationId: convos[0].id,
        assignedUserId: EMPLOYEE,
        metricType: 'FIRST_RESPONSE_TIME',
        thresholdMs: 300000,
        actualMs: 462000,
        status: 'ACTIVE',
        idempotencyKey: 'seed-bl-active-0-' + now,
      },
    }),
    p.slaBreachLog.create({
      data: {
        orgId: ORG,
        policyId: criticalPolicy.id,
        conversationId: convos[1].id,
        assignedUserId: ADMIN,
        metricType: 'FIRST_RESPONSE_TIME',
        thresholdMs: 300000,
        actualMs: 538000,
        status: 'ACTIVE',
        idempotencyKey: 'seed-bl-active-1-' + now,
      },
    }),
    // 1 acknowledged breach
    p.slaBreachLog.create({
      data: {
        orgId: ORG,
        policyId: criticalPolicy.id,
        conversationId: convos[2].id,
        assignedUserId: EMPLOYEE,
        metricType: 'FIRST_RESPONSE_TIME',
        thresholdMs: 300000,
        actualMs: 510000,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: ADMIN,
        acknowledgedAt: new Date(now - 1800000),
        idempotencyKey: 'seed-bl-ack-' + now,
      },
    }),
    // 1 resolved breach
    p.slaBreachLog.create({
      data: {
        orgId: ORG,
        policyId: standardPolicy.id,
        conversationId: convos[3].id,
        assignedUserId: ADMIN,
        metricType: 'FIRST_RESPONSE_TIME',
        thresholdMs: 900000,
        actualMs: 1020000,
        status: 'RESOLVED',
        acknowledgedBy: ADMIN,
        acknowledgedAt: new Date(now - 7200000),
        resolvedAt: new Date(now - 3600000),
        idempotencyKey: 'seed-bl-resolved-' + now,
      },
    }),
  ]);
  console.log('Created', breaches.length, 'breach logs');

  console.log('\nSLA seed data complete!');
  console.log('Summary:');
  console.log('  - 3 SLA policies (Critical 5min, Standard 15min, Resolution 4h)');
  console.log('  - 17 trackings (8 met, 3 warning, 4 breached, 2 active)');
  console.log('  - 4 breach logs (2 active, 1 acknowledged, 1 resolved)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
