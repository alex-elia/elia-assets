-- Reference: Komitas Data Indexing (KDI) workspace-scoped DMS schema.
-- Copy into host supabase/migrations and adjust RLS. Nemrut uses account_id instead of workspace_id.

-- create schema if not exists dms;
-- create extension if not exists vector;
-- see asikz supabase/migrations/0009_kdi_dms_schema.sql for the canonical Asikz apply.
