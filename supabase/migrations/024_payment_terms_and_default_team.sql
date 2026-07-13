-- 024_payment_terms_and_default_team.sql
-- 1. Payment terms are now always 50% at kickoff, 25% at design approval,
--    25% at pre-launch sign-off (each of the total estimate).
-- 2. The team section is included in every proposal, regardless of tier.
-- The proposal-chat edge function also enforces both as hard rules; these
-- updates keep the editable system prompt in Settings consistent. Each
-- replace is a no-op if the prompt was already edited (e.g. via the UI).

UPDATE admin_settings SET system_prompt = replace(
  system_prompt,
  '- Payment terms default to 50/50 (half at kickoff, half at launch)',
  '- Payment terms are ALWAYS three installments: 50% of the total estimate at kickoff, 25% of the total estimate at design approval, and 25% of the total estimate at pre-launch sign-off. Label them "Kickoff", "Design approval", and "Pre-launch sign-off".'
)
WHERE system_prompt IS NOT NULL
  AND system_prompt LIKE '%Payment terms default to 50/50%';

UPDATE admin_settings SET system_prompt = replace(
  system_prompt,
  'NO opportunity, personas, or team.',
  'NO opportunity or personas. ALWAYS include the team section with the full roster.'
)
WHERE system_prompt IS NOT NULL
  AND system_prompt LIKE '%NO opportunity, personas, or team.%';

UPDATE admin_settings SET system_prompt = replace(
  system_prompt,
  'Optional: opportunity (only for strategic repositioning), team (for new clients).',
  'Optional: opportunity (only for strategic repositioning). ALWAYS include the team section with the full roster.'
)
WHERE system_prompt IS NOT NULL
  AND system_prompt LIKE '%team (for new clients).%';
