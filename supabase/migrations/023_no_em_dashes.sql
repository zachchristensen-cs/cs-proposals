-- 023_no_em_dashes.sql
-- Add a no-em-dash rule to the editable system prompt, anchored to the
-- existing no-emoji rule. The proposal-chat edge function also enforces
-- this as a fixed rule, so this is for visibility/editability in Settings.

UPDATE admin_settings SET system_prompt = replace(
  system_prompt,
  '- NEVER use emojis anywhere.',
  '- NEVER use emojis anywhere.
- NEVER use em dashes (—) anywhere, in chat or in proposal content. Use a comma, period, colon, or parentheses instead.'
)
WHERE system_prompt IS NOT NULL
  AND system_prompt NOT LIKE '%NEVER use em dashes%';
