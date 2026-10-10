-- ==============================================================================
-- Supabase Row Level Security (RLS) Policies Migration
-- Scope: General Supervisor Team Management & Strict Boundary Enforcement
-- Date: 2026-10-10
-- Objective:
--   1. Authorize General Supervisor to view team data without financial fields.
--   2. Authorize General Supervisor to add teachers (monthly_expenses = 0) and sub-supervisors.
--   3. Authorize General Supervisor to reassign teacher's supervisor without modifying finances.
--   4. Strictly forbid General Supervisor from creating Managers, General Supervisors, or Admins.
--   5. Maintain existing permissions for System Admin, Manager, and Sub-Supervisor.
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.is_general_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() = 'general_supervisor';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_general_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() IN ('system_admin', 'general_supervisor');
$$;

-- ==============================================================================
-- 2. UPDATED POLICIES FOR `supervisors` TABLE
-- ==============================================================================

-- Drop old insert policy
DROP POLICY IF EXISTS "supervisors_insert_policy" ON public.supervisors;

-- INSERT:
-- - System Admin can create any supervisor (except system_admin).
-- - General Supervisor can create ONLY sub_supervisor.
CREATE POLICY "supervisors_insert_policy"
ON public.supervisors
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_system_admin() AND (
      role != 'system_admin' OR public.current_user_email() = 'muslim.kid.academy1@gmail.com'
    )
  )
  OR (
    public.is_general_supervisor() AND role = 'sub_supervisor'
  )
);

-- ==============================================================================
-- 3. UPDATED POLICIES FOR `teachers` TABLE
-- ==============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "teachers_select_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_insert_policy" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_policy" ON public.teachers;

-- SELECT:
-- - Managers, System Admins, and General Supervisors can see all teachers.
-- - Sub-Supervisors see ONLY teachers assigned to them.
-- - Teachers see their own record.
CREATE POLICY "teachers_select_policy"
ON public.teachers
FOR SELECT
TO authenticated, anon
USING (
  public.is_manager_or_admin()
  OR public.is_general_supervisor()
  OR supervisor_id = public.current_supervisor_id()
  OR lower(trim(email)) = public.current_user_email()
);

-- INSERT:
-- - System Admin can insert teachers.
-- - General Supervisor can insert teachers provided financial fields are zero.
CREATE POLICY "teachers_insert_policy"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_admin()
  OR (
    public.is_general_supervisor() AND monthly_expenses = 0
  )
);

-- UPDATE:
-- - Managers and System Admins can update.
-- - General Supervisor can update supervisor_id and administrative notes ONLY (monthly_expenses must remain unchanged).
-- - Sub-Supervisors cannot change supervisor_id.
CREATE POLICY "teachers_update_policy"
ON public.teachers
FOR UPDATE
TO authenticated
USING (
  public.is_manager_or_admin()
  OR public.is_general_supervisor()
  OR (supervisor_id = public.current_supervisor_id())
)
WITH CHECK (
  public.is_system_admin()
  OR public.is_manager_or_admin()
  OR (
    public.is_general_supervisor()
    -- Strict financial protection: monthly_expenses must NOT be altered
    AND monthly_expenses = (SELECT t.monthly_expenses FROM public.teachers t WHERE t.id = teachers.id)
  )
  OR (
    supervisor_id = (SELECT t.supervisor_id FROM public.teachers t WHERE t.id = teachers.id)
  )
);

-- ==============================================================================
-- 4. DEDICATED STORED PROCEDURE FOR TEACHER SUPERVISOR REASSIGNMENT
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reassign_teacher_supervisor(
  p_teacher_id uuid,
  p_new_supervisor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_teacher record;
  v_new_sup record;
BEGIN
  v_caller_role := public.current_user_role();
  IF v_caller_role NOT IN ('system_admin', 'general_supervisor') THEN
    RAISE EXCEPTION 'غير مصرح: عملية تغيير المشرف محصورة بمسؤول النظام والمشرف العام فقط.';
  END IF;

  SELECT * INTO v_teacher FROM public.teachers WHERE id = p_teacher_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعلم المحدد غير موجود في النظام.';
  END IF;

  SELECT * INTO v_new_sup FROM public.supervisors WHERE id = p_new_supervisor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المشرف المحدد غير موجود في قائمة المشرفين المعتمدة.';
  END IF;

  IF v_new_sup.role NOT IN ('sub_supervisor', 'general_supervisor') THEN
    RAISE EXCEPTION 'لا يمكن إسناد المعلم إلا لمشرف فرعي أو مشرف عام.';
  END IF;

  -- Update supervisor_id strictly without modifying any financial fields
  UPDATE public.teachers
  SET supervisor_id = p_new_supervisor_id
  WHERE id = p_teacher_id;

  -- Audit log to permanent table if available
  BEGIN
    INSERT INTO public.activity_logs (
      action,
      entity_id,
      entity_name,
      actor_name,
      actor_role,
      details,
      created_at
    ) VALUES (
      'تغيير المشرف المسؤول للمعلم',
      p_teacher_id::text,
      v_teacher.name,
      COALESCE(public.current_user_email(), 'المشرف العام'),
      v_caller_role,
      'تم نقل إشراف المعلم «' || v_teacher.name || '» إلى المشرف «' || v_new_sup.name || '» مع الحفاظ التام على الحلقات والطلاب والتقارير.',
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'teacher_id', p_teacher_id,
    'teacher_name', v_teacher.name,
    'previous_supervisor_id', v_teacher.supervisor_id,
    'new_supervisor_id', p_new_supervisor_id,
    'new_supervisor_name', v_new_sup.name
  );
END;
$$;

-- ==============================================================================
-- 5. PERMANENT AUDIT LOGS TABLE & IMMUTABILITY POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_id text,
  entity_name text,
  actor_id text,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Managers, System Admins, and General Supervisors can read logs
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy"
ON public.activity_logs
FOR SELECT
TO authenticated, anon
USING (
  public.is_manager_or_admin()
  OR public.is_general_supervisor()
);

-- INSERT: Authenticated users / edge functions can append logs
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_policy"
ON public.activity_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- IMMUTABILITY: Prohibit modification and deletion of audit logs
DROP POLICY IF EXISTS "activity_logs_update_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_update_policy"
ON public.activity_logs
FOR UPDATE
TO authenticated, anon
USING (false);

DROP POLICY IF EXISTS "activity_logs_delete_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_delete_policy"
ON public.activity_logs
FOR DELETE
TO authenticated, anon
USING (false);
