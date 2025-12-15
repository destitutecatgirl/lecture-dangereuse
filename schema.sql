-- =============================================
-- LECTURE DANGEREUSE - Supabase Database Schema
-- =============================================
-- Run this in your Supabase SQL Editor

-- Enable the vector extension for embeddings
create extension if not exists vector;

-- =============================================
-- DOCUMENTS TABLE
-- =============================================
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    name text not null,
    page_count integer,
    full_text text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index for user queries
create index if not exists idx_documents_user on documents(user_id);

-- =============================================
-- PAGES TABLE
-- =============================================
create table if not exists pages (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    page_number integer not null,
    text_content text,
    paragraphs jsonb,
    created_at timestamp with time zone default now()
);

create index if not exists idx_pages_document on pages(document_id);

-- =============================================
-- CHUNKS TABLE (for RAG)
-- =============================================
create table if not exists chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    chunk_index integer not null,
    text_content text not null,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    created_at timestamp with time zone default now()
);

create index if not exists idx_chunks_document on chunks(document_id);

-- Create vector similarity search index
create index if not exists idx_chunks_embedding on chunks 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- =============================================
-- GRAPH NODES TABLE
-- =============================================
create table if not exists nodes (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    label text not null,
    node_type text not null, -- concept, person, event, place, theory, annotation, question, insight
    description text,
    source text, -- 'extraction' or 'annotation'
    annotation_id uuid,
    metadata jsonb,
    created_at timestamp with time zone default now()
);

create index if not exists idx_nodes_document on nodes(document_id);
create index if not exists idx_nodes_type on nodes(node_type);

-- =============================================
-- GRAPH EDGES TABLE
-- =============================================
create table if not exists edges (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    source_node_id uuid references nodes(id) on delete cascade,
    target_node_id uuid references nodes(id) on delete cascade,
    relationship text,
    weight real default 1.0,
    created_at timestamp with time zone default now()
);

create index if not exists idx_edges_document on edges(document_id);
create index if not exists idx_edges_source on edges(source_node_id);
create index if not exists idx_edges_target on edges(target_node_id);

-- =============================================
-- ANNOTATIONS TABLE
-- =============================================
create table if not exists annotations (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    user_id text not null,
    page_number integer not null,
    selected_text text not null,
    annotation_type text not null, -- annotation, question, insight, concept
    note text,
    concept_label text,
    position jsonb, -- store start/end positions if needed
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_annotations_document on annotations(document_id);
create index if not exists idx_annotations_user on annotations(user_id);
create index if not exists idx_annotations_page on annotations(document_id, page_number);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
create table if not exists conversations (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    user_id text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_conversations_document on conversations(document_id);
create index if not exists idx_conversations_user on conversations(user_id);

-- =============================================
-- MESSAGES TABLE
-- =============================================
create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references conversations(id) on delete cascade,
    role text not null, -- 'teacher', 'student', 'system', 'agent'
    content text not null,
    agent_name text, -- for agent messages
    metadata jsonb,
    created_at timestamp with time zone default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id);

-- =============================================
-- VOCABULARY TABLE
-- =============================================
create table if not exists vocabulary (
    id text primary key,
    document_id uuid references documents(id) on delete cascade,
    user_id text not null,
    word text not null,
    translation text not null,
    note text,
    word_type text, -- connector, concept, colonial, philosophical, etc.
    review_count integer default 0,
    last_reviewed timestamp with time zone,
    created_at timestamp with time zone default now()
);

create index if not exists idx_vocabulary_document on vocabulary(document_id);
create index if not exists idx_vocabulary_user on vocabulary(user_id);
create index if not exists idx_vocabulary_word on vocabulary(word);

-- =============================================
-- USER SETTINGS TABLE
-- =============================================
create table if not exists user_settings (
    user_id text primary key,
    claude_key_encrypted text, -- store encrypted or use Supabase Vault
    openai_key_encrypted text,
    preferences jsonb default '{}',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to search chunks by vector similarity
create or replace function search_chunks(
    query_embedding vector(1536),
    match_document_id uuid,
    match_count int default 5
)
returns table (
    id uuid,
    document_id uuid,
    chunk_index integer,
    text_content text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        chunks.id,
        chunks.document_id,
        chunks.chunk_index,
        chunks.text_content,
        1 - (chunks.embedding <=> query_embedding) as similarity
    from chunks
    where chunks.document_id = match_document_id
        and chunks.embedding is not null
    order by chunks.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Function to get graph for a document
create or replace function get_document_graph(doc_id uuid)
returns table (
    nodes jsonb,
    edges jsonb
)
language plpgsql
as $$
begin
    return query
    select
        (select jsonb_agg(jsonb_build_object(
            'id', n.id,
            'label', n.label,
            'type', n.node_type,
            'description', n.description,
            'source', n.source
        )) from nodes n where n.document_id = doc_id) as nodes,
        (select jsonb_agg(jsonb_build_object(
            'id', e.id,
            'source', e.source_node_id,
            'target', e.target_node_id,
            'relationship', e.relationship
        )) from edges e where e.document_id = doc_id) as edges;
end;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS on all tables
alter table documents enable row level security;
alter table pages enable row level security;
alter table chunks enable row level security;
alter table nodes enable row level security;
alter table edges enable row level security;
alter table annotations enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table user_settings enable row level security;

-- Enable RLS on vocabulary
alter table vocabulary enable row level security;

-- For now, allow all operations (you can tighten this with auth)
-- In production, replace 'true' with proper auth checks

create policy "Allow all for documents" on documents for all using (true);
create policy "Allow all for pages" on pages for all using (true);
create policy "Allow all for chunks" on chunks for all using (true);
create policy "Allow all for nodes" on nodes for all using (true);
create policy "Allow all for edges" on edges for all using (true);
create policy "Allow all for annotations" on annotations for all using (true);
create policy "Allow all for conversations" on conversations for all using (true);
create policy "Allow all for messages" on messages for all using (true);
create policy "Allow all for user_settings" on user_settings for all using (true);
create policy "Allow all for vocabulary" on vocabulary for all using (true);

-- =============================================
-- REALTIME
-- =============================================
-- Enable realtime for collaborative features
alter publication supabase_realtime add table annotations;
alter publication supabase_realtime add table nodes;
alter publication supabase_realtime add table messages;
