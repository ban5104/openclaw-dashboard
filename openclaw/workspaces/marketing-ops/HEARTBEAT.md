# Heartbeat Checklist

Run these checks every heartbeat cycle:

1. **Stale items**: Query content_items where state has not changed in >24 hours and state is not `posted`, `analyzed`, or `archived`. Alert via Telegram if found.
2. **Review backlog**: Count items in `in_review` state for >6 hours. Alert if count > 0.
3. **Weekly planning trigger**: If today is Monday and no content_items exist with scheduled_date in the current week, trigger the weekly-planning workflow.
4. **Failed publications**: Check platform_publications for recent errors. Alert if found.
5. **Analytics due**: If today is Monday and the last analytics snapshot for any active business is >7 days old, trigger analytics collection.

If nothing needs attention, return HEARTBEAT_OK.
