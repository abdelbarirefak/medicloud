-- ============================================================================
-- Migration: Activation de Supabase Realtime pour les Notifications
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================================

-- 1. Autoriser la publication des changements sur la table "notifications"
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Optionnel: Si vous souhaitez un jour écouter les UPDATES (ex: pour "is_read") 
-- et récupérer l'entité complète avant/après :
ALTER TABLE notifications REPLICA IDENTITY FULL;
