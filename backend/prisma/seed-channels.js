/**
 * EPIC 16 — Multi-Channel Migration Seed
 *
 * Migrates existing WhatsAppSession rows → Channel rows
 * and backfills channelId on Message + Conversation.
 *
 * Run: node prisma/seed-channels.js
 *
 * This script is IDEMPOTENT — safe to re-run.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== EPIC 16: Multi-Channel Migration ===\n');

  // Step 1: Migrate WhatsAppSession → Channel
  const sessions = await prisma.whatsAppSession.findMany({
    where: { deletedAt: null },
  });

  console.log(`Found ${sessions.length} active WhatsApp sessions to migrate.\n`);

  let migratedChannels = 0;
  for (const session of sessions) {
    // Check if already migrated
    const existing = await prisma.channel.findFirst({
      where: { legacySessionId: session.id },
    });

    if (existing) {
      console.log(`  ✓ Session ${session.id} already migrated → Channel ${existing.id}`);
      continue;
    }

    const statusMap = {
      CONNECTED: 'ACTIVE',
      CONNECTING: 'VERIFYING',
      RECONNECTING: 'ACTIVE',
      DISCONNECTED: 'DISCONNECTED',
    };

    const channel = await prisma.channel.create({
      data: {
        orgId: session.orgId,
        type: 'WHATSAPP',
        name: session.phoneNumber
          ? `WhatsApp ${session.phoneNumber}`
          : 'WhatsApp Session',
        status: statusMap[session.status] || 'DISCONNECTED',
        externalHandle: session.phoneNumber,
        legacySessionId: session.id,
        createdById: session.userId,
        capabilities: [
          'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO',
          'STICKER', 'LOCATION', 'CONTACT',
        ],
        rateLimitPerMin: 60,
        rateLimitBurst: 120,
        verifiedAt: session.status === 'CONNECTED' ? new Date() : null,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });

    console.log(`  + Migrated session ${session.id} → Channel ${channel.id}`);
    migratedChannels++;
  }

  console.log(`\nMigrated ${migratedChannels} new channels.\n`);

  // Step 2: Backfill channelId on Messages
  const channelMap = await prisma.channel.findMany({
    where: { legacySessionId: { not: null } },
    select: { id: true, legacySessionId: true },
  });

  const sessionToChannel = new Map();
  for (const ch of channelMap) {
    sessionToChannel.set(ch.legacySessionId, ch.id);
  }

  let messageCount = 0;
  for (const [sessionId, channelId] of sessionToChannel) {
    const result = await prisma.message.updateMany({
      where: {
        sessionId,
        channelId: null,
      },
      data: {
        channelId,
        channelType: 'WHATSAPP',
      },
    });
    messageCount += result.count;
  }

  console.log(`Backfilled channelId on ${messageCount} messages.\n`);

  // Step 3: Backfill externalMessageId from whatsappMessageId
  const waMessages = await prisma.message.findMany({
    where: {
      whatsappMessageId: { not: null },
      externalMessageId: null,
    },
    select: { id: true, whatsappMessageId: true },
  });

  let externalIdCount = 0;
  for (const msg of waMessages) {
    try {
      await prisma.message.update({
        where: { id: msg.id },
        data: { externalMessageId: msg.whatsappMessageId },
      });
      externalIdCount++;
    } catch (e) {
      // Skip duplicates (unique constraint on externalMessageId)
      if (!e.message.includes('Unique constraint')) {
        console.warn(`  ! Skipped message ${msg.id}: ${e.message}`);
      }
    }
  }

  console.log(`Backfilled externalMessageId on ${externalIdCount} messages.\n`);

  // Step 4: Backfill channelId + contactIdentifier on Conversations
  let conversationCount = 0;
  for (const [sessionId, channelId] of sessionToChannel) {
    const result = await prisma.conversation.updateMany({
      where: {
        sessionId,
        channelId: null,
      },
      data: {
        channelId,
        channelType: 'WHATSAPP',
      },
    });
    conversationCount += result.count;
  }

  // Backfill contactIdentifier from contactPhone
  const convos = await prisma.conversation.findMany({
    where: {
      contactIdentifier: null,
    },
    select: { id: true, contactPhone: true },
  });

  let identifierCount = 0;
  for (const convo of convos) {
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { contactIdentifier: convo.contactPhone },
    });
    identifierCount++;
  }

  console.log(`Backfilled channelId on ${conversationCount} conversations.`);
  console.log(`Backfilled contactIdentifier on ${identifierCount} conversations.\n`);

  console.log('=== Migration complete ===');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
