UPDATE campaigns AS campaign
SET failed_count = COALESCE(recipient_counts.failed_count, 0)
FROM (
  SELECT campaign_id, count(*)::integer AS failed_count
  FROM campaign_recipients
  WHERE status = 'FAILED'
  GROUP BY campaign_id
) AS recipient_counts
WHERE campaign.id = recipient_counts.campaign_id
  AND campaign.failed_count <> recipient_counts.failed_count;

UPDATE campaigns AS campaign
SET failed_count = 0
WHERE campaign.failed_count <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM campaign_recipients AS recipient
    WHERE recipient.campaign_id = campaign.id
      AND recipient.status = 'FAILED'
  );
