-- Notifications for lead routing: a lead was given to you / still not contacted
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEAD_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEAD_FOLLOW_UP_DUE';
