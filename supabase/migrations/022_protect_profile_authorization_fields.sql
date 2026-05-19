-- Migration: 020_protect_profile_authorization_fields.sql
-- Description: Prevent users from escalating authorization-sensitive profile fields via self-update RLS.

CREATE OR REPLACE FUNCTION public.prevent_profile_authorization_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Server-side admin/service-role workflows are allowed to manage these fields.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- A user updating their own profile may edit safe profile fields, but may not
  -- promote their role or reassign trainer ownership. Edge Functions that rely on
  -- profiles.role as an authorization signal require these fields to be immutable
  -- from untrusted client sessions.
  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;

    IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id THEN
      RAISE EXCEPTION 'Users cannot change their own trainer assignment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_profile_authorization_field_changes ON public.profiles;
CREATE TRIGGER prevent_profile_authorization_field_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_authorization_field_changes();
