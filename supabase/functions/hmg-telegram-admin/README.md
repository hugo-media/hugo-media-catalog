# Owner Telegram controls

The private reporting bot also accepts /start, /report, /yesterday, /week, /month, /add, /resume and /cancel. Reply-keyboard actions have the same behavior. Reports are fresh queries and do not claim, suppress or resend scheduled daily deliveries.

Products are collected as durable private drafts. The owner selects category, price, discount, condition, warranty and stock; selects the independent new-arrival flag; enters specifications/descriptions; attaches up to eight photos; reviews and explicitly publishes or saves a catalog draft. Product rows use the existing core.toRow validator, photo bucket, audit and version triggers. Repeated Telegram update IDs cannot create another row. Reply failures retain the committed result for delivery retry. Photos are transferred only when saving, with deterministic paths and bounded downloads. Draft photos are Telegram IDs, never token-bearing URLs.

Deploy index.ts together with bot-core.mjs, handler.mjs, deno.json and the repository src/core.js preserving relative paths. JWT gateway verification is disabled for Telegram, but the handler requires X-Telegram-Bot-Api-Secret-Token; the service-only RPC validates its Vault value and requires both chat and sender to match the private report recipient. Group chats and other users cannot access metrics or products.

Vault names: hmg_catalog_telegram_bot_token, hmg_catalog_telegram_report_chat_id, hmg_catalog_telegram_webhook_secret. Generate the webhook secret in Vault and pass it directly from the database to Telegram setWebhook without printing it. Register only message updates, max_connections=1, and keep drop_pending_updates=false. Never commit tokens or secret-bearing Telegram URLs. Configure setMyCommands in the owner's chat scope and send /start instructions with the reply keyboard after verification.

Tests: npm test (tests/telegram-admin.test.mjs). Database checks should verify service-role-only RPC grants, private table RLS, date windows and duplicate publication in a rolled-back transaction. When bot token changes in settings, register the webhook and commands for the new bot again. Existing daily report scheduling stays independent.
