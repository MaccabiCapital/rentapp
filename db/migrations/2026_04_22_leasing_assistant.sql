-- ============================================================
-- Sprint 14 — AI Leasing Assistant foundation
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Scaffolds the data + guardrails layer for an AI-assisted
-- prospect response system. The LLM call site is stubbed — see
-- app/lib/leasing/assistant-service.ts. When the landlord picks
-- and pays for an LLM provider (Anthropic / OpenAI / etc.) we
-- swap the stub for a real client behind a feature flag.
--
-- FAIR HOUSING:
-- Every outbound AI-drafted reply goes through a deterministic
-- guardrail filter BEFORE it reaches the landlord. The landlord
-- always has final approval — AI never auto-sends. The assistant
-- is a suggestion engine, not a decision engine. Inbound prospect
-- messages are scanned for protected-class disclosures so the
-- landlord sees a warning banner and can ignore those signals
-- in their decision (per the fair-housing safe-harbor rule in
-- CLAUDE.md).

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type leasing_conversation_status as enum (
  'active',
  'archived',
  'closed_won',     -- prospect signed
  'closed_lost'     -- prospect went cold or chose elsewhere
);

create type leasing_message_direction as enum (
  'inbound',           -- from the prospect
  'outbound_draft',    -- AI-drafted, awaiting landlord approval
  'outbound_sent'      -- sent to the prospect
);

create type leasing_message_author as enum (
  'prospect',
  'landlord',
  'ai'
);

-- ------------------------------------------------------------
-- Conversations
-- ------------------------------------------------------------
--
-- One per prospect-inquiry thread. Links to a prospect (if one
-- exists in public.prospects) and optionally to a listing.

create table public.leasing_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,

  -- Fallback fields for when there's no prospect row yet (e.g.
  -- a manually-created conversation from a phone inquiry the
  -- landlord wants to draft a reply for).
  prospect_name text,
  prospect_contact text,  -- email or phone, free-form for v1

  status leasing_conversation_status not null default 'active',

  -- Per-conversation override for the assistant system prompt.
  -- NULL means use the built-in default in code.
  custom_system_prompt text,

  last_message_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index leasing_conversations_owner_idx
  on public.leasing_conversations (owner_id) where deleted_at is null;
create index leasing_conversations_prospect_idx
  on public.leasing_conversations (prospect_id) where deleted_at is null;
create index leasing_conversations_status_idx
  on public.leasing_conversations (status) where deleted_at is null;
create index leasing_conversations_last_msg_idx
  on public.leasing_conversations (last_message_at desc) where deleted_at is null;

alter table public.leasing_conversations enable row level security;

create policy "owner can select own leasing_conversations"
  on public.leasing_conversations for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own leasing_conversations"
  on public.leasing_conversations for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own leasing_conversations"
  on public.leasing_conversations for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own leasing_conversations"
  on public.leasing_conversations for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.leasing_conversations
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Messages
-- ------------------------------------------------------------
--
-- Individual messages in a conversation. AI-drafted outbound
-- messages live in this table with direction='outbound_draft'.
-- When the landlord approves (optionally after editing), the
-- action flips direction to 'outbound_sent' and records the
-- landlord's approval identity in approved_by_landlord_at.

create table public.leasing_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.leasing_conversations(id) on delete cascade,

  direction leasing_message_direction not null,
  author leasing_message_author not null,

  content text not null,

  -- Guardrail metadata. Populated by the fair-housing filter:
  --   {
  --     "input_warnings": ["disclosed_family_status"],
  --     "output_flags": ["decision_language_detected"],
  --     "reviewed_at": "2026-04-22T18:00:00Z"
  --   }
  -- Used by the UI to render the yellow warning banners.
  guardrail_flags jsonb not null default '{}'::jsonb,

  -- When a landlord approves / edits an AI draft
  approved_by_landlord_at timestamptz,
  edited_by_landlord boolean not null default false,

  created_at timestamptz not null default now()
);

create index leasing_messages_conversation_idx
  on public.leasing_messages (conversation_id, created_at);
create index leasing_messages_direction_idx
  on public.leasing_messages (direction);

alter table public.leasing_messages enable row level security;

-- Messages inherit ownership via their parent conversation.
create policy "owner can select own leasing_messages"
  on public.leasing_messages for select to authenticated
  using (
    exists (
      select 1 from public.leasing_conversations c
      where c.id = leasing_messages.conversation_id
        and c.owner_id = auth.uid()
    )
  );
create policy "owner can insert own leasing_messages"
  on public.leasing_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.leasing_conversations c
      where c.id = leasing_messages.conversation_id
        and c.owner_id = auth.uid()
    )
  );
create policy "owner can update own leasing_messages"
  on public.leasing_messages for update to authenticated
  using (
    exists (
      select 1 from public.leasing_conversations c
      where c.id = leasing_messages.conversation_id
        and c.owner_id = auth.uid()
    )
  );
create policy "owner can delete own leasing_messages"
  on public.leasing_messages for delete to authenticated
  using (
    exists (
      select 1 from public.leasing_conversations c
      where c.id = leasing_messages.conversation_id
        and c.owner_id = auth.uid()
    )
  );
