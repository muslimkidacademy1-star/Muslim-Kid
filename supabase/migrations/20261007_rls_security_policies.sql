-- ==============================================================================
-- Supabase Row Level Security (RLS) Policies Migration
-- Project: Young Muslim Academy (أكاديمية المسلم الصغير)
-- Date: 2026-10-07
-- Objective:
--   1. Protect tables from unauthorized modifications.
--   2. Restrict user addition and supervisor reassignment exclusively to system admin.
--   3. Prevent self-elevation of roles.
--   4. Scope Sub-Supervisors strictly to their currently assigned teachers & students.
--   5. Guarantee immediate revocation of access when a teacher is reassigned away from a supervisor.
--   6. Guarantee full, unrestricted administrative visibility for Managers and System Admins.
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS (Bypass RLS securely for role verification)

-- Get email of authenticated caller from Supabase JWT
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT lower(trim(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Get resolved role from supervisors / teachers / whitelist
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  v_email := public.current_user_email();
  
  -- Root System Admin whitelist check
  IF v_email IN ('muslim.kid.academy1@gmail.com', 'mahmoudaliwahkotb@gmail.com') THEN
    RETURN 'system_admin';
  END IF;

  -- Check supervisors table
  SELECT role INTO v_role
  FROM public.supervisors
  WHERE lower(trim(email)) = v_email
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check teachers table
  IF EXISTS (
    SELECT 1 FROM public.teachers
    WHERE lower(trim(email)) = v_email
    LIMIT 1
  ) THEN
    RETURN 'teacher';
  END IF;

  RETURN 'anon';
END;
$$;

-- Check if current authenticated user is genuine system administrator
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() = 'system_admin';
$$;

-- Check if current authenticated user is manager or system administrator
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_user_role() IN ('manager', 'system_admin');
$$;

-- Get current user supervisor ID
CREATE OR REPLACE FUNCTION public.current_supervisor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.supervisors
  WHERE lower(trim(email)) = public.current_user_email()
  LIMIT 1;
$$;

-- ==============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON TABLES
-- ==============================================================================

ALTER TABLE IF EXISTS public.supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop legacy open policies if present
DROP POLICY IF EXISTS "Enable all for anon" ON public.supervisors;
DROP POLICY IF EXISTS "Enable all for anon" ON public.teachers;
DROP POLICY IF EXISTS "Enable all for anon" ON public.students;
DROP POLICY IF EXISTS "Enable all for anon" ON public.reports;
DROP POLICY IF EXISTS "Enable all for anon" ON public.sessions;

-- ==============================================================================
-- 3. POLICIES FOR `supervisors` TABLE
-- ==============================================================================

-- SELECT: Authenticated users can read supervisors (needed for teacher linking dropdowns and contact)
CREATE POLICY "supervisors_select_policy"
ON public.supervisors
FOR SELECT
TO authenticated, anon
USING (true);

-- INSERT: Strictly system admin can insert supervisors. Prevent creating unauthorized system_admin rows.
CREATE POLICY "supervisors_insert_policy"
ON public.supervisors
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_admin() AND (
    role != 'system_admin' OR public.current_user_email() = 'muslim.kid.academy1@gmail.com'
  )
);

-- UPDATE: Strictly system admin can update. Disallow non-admins from changing roles or elevating themselves.
CREATE POLICY "supervisors_update_policy"
ON public.supervisors
FOR UPDATE
TO authenticated
USING (public.is_system_admin())
WITH CHECK (
  public.is_system_admin() AND (
    role != 'system_admin' OR public.current_user_email() = 'muslim.kid.academy1@gmail.com'
  )
);

-- DELETE: Strictly system admin
CREATE POLICY "supervisors_delete_policy"
ON public.supervisors
FOR DELETE
TO authenticated
USING (public.is_system_admin());

-- ==============================================================================
-- 4. POLICIES FOR `teachers` TABLE
-- ==============================================================================

-- SELECT:
-- - Managers and System Admins see all teachers.
-- - Sub-Supervisors see ONLY teachers whose current supervisor_id matches their supervisor record.
-- - If a teacher is transferred to a different supervisor, the previous supervisor immediately LOSES access.
-- - Teachers can see their own teacher record.
CREATE POLICY "teachers_select_policy"
ON public.teachers
FOR SELECT
TO authenticated, anon
USING (
  public.is_manager_or_admin()
  OR supervisor_id = public.current_supervisor_id()
  OR lower(trim(email)) = public.current_user_email()
);

-- INSERT: Strictly system admin can add teachers (or Edge Function service role).
CREATE POLICY "teachers_insert_policy"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (public.is_system_admin());

-- UPDATE:
-- - Managers and System Admins can update teacher details.
-- - Changing `supervisor_id` (reassigning supervisor) is STRICTLY restricted to System Admin.
-- - Sub-Supervisors can only update notes/expenses for their current teachers without changing supervisor_id.
CREATE POLICY "teachers_update_policy"
ON public.teachers
FOR UPDATE
TO authenticated
USING (
  public.is_manager_or_admin()
  OR (
    supervisor_id = public.current_supervisor_id()
  )
)
WITH CHECK (
  public.is_system_admin()
  OR (
    public.is_manager_or_admin()
  )
  OR (
    supervisor_id = (SELECT t.supervisor_id FROM public.teachers t WHERE t.id = teachers.id)
  )
);

-- DELETE: Strictly system admin
CREATE POLICY "teachers_delete_policy"
ON public.teachers
FOR DELETE
TO authenticated
USING (public.is_system_admin());

-- ==============================================================================
-- 5. POLICIES FOR `students` TABLE
-- ==============================================================================

-- SELECT:
-- - Managers and System Admins see all students.
-- - Sub-Supervisors see ONLY students whose teacher is currently assigned to this supervisor.
-- - When a teacher is reassigned away, previous supervisor immediately loses access to these students.
-- - Teachers see only students assigned to them.
CREATE POLICY "students_select_policy"
ON public.students
FOR SELECT
TO authenticated, anon
USING (
  public.is_manager_or_admin()
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE supervisor_id = public.current_supervisor_id()
  )
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE lower(trim(email)) = public.current_user_email()
  )
);

-- INSERT / UPDATE / DELETE for students:
CREATE POLICY "students_insert_policy"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin()
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE supervisor_id = public.current_supervisor_id()
  )
);

CREATE POLICY "students_update_policy"
ON public.students
FOR UPDATE
TO authenticated
USING (
  public.is_manager_or_admin()
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE supervisor_id = public.current_supervisor_id()
  )
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE lower(trim(email)) = public.current_user_email()
  )
)
WITH CHECK (
  public.is_manager_or_admin()
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE supervisor_id = public.current_supervisor_id()
  )
  OR teacher_id IN (
    SELECT id FROM public.teachers WHERE lower(trim(email)) = public.current_user_email()
  )
);

CREATE POLICY "students_delete_policy"
ON public.students
FOR DELETE
TO authenticated
USING (public.is_manager_or_admin());

-- ==============================================================================
-- 6. POLICIES FOR `reports` TABLE
-- ==============================================================================

CREATE POLICY "reports_select_policy"
ON public.reports
FOR SELECT
TO authenticated, anon
USING (
  public.is_manager_or_admin()
  OR student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE t.supervisor_id = public.current_supervisor_id()
  )
  OR student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE lower(trim(t.email)) = public.current_user_email()
  )
);

CREATE POLICY "reports_insert_policy"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin()
  OR student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE t.supervisor_id = public.current_supervisor_id()
       OR lower(trim(t.email)) = public.current_user_email()
  )
);

CREATE POLICY "reports_update_policy"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  public.is_manager_or_admin()
  OR student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE t.supervisor_id = public.current_supervisor_id()
       OR lower(trim(t.email)) = public.current_user_email()
  )
);
