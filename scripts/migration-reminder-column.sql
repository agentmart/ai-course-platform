-- Migration: Add last_reminder_sent column to user_access
-- Run via Supabase SQL editor or Management API
ALTER TABLE user_access ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
