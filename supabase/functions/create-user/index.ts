// Supabase Edge Function: create-user
// Location: supabase/functions/create-user/index.ts
// Secure endpoint to invite users, provision accounts, and link profiles in "Young Muslim Academy"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserRequestBody {
  email: string;
  name: string;
  phone: string;
  role: "teacher" | "sub_supervisor" | "general_supervisor" | "manager";
  track?: string;
  supervisorId?: string;
}

// Authorized root system owner emails who can manage the system
const SYSTEM_ADMIN_WHITELIST = [
  "muslim.kid.academy1@gmail.com",
  "mahmoudaliwahkotb@gmail.com",
];

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://academy.com";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "إعدادات الخادم غير مكتملة: مفقود SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY في أسرار الخادم.",
          status: "configuration_error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Authenticate the caller using their Bearer JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "طلب غير مصرح به: يرجى تسجيل الدخول كمسؤول نظام معتمد.",
          status: "unauthorized",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Admin Client with Service Role (restricted to server-side execution)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Caller client to verify the caller's JWT identity
    const callerClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceRoleKey,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const {
      data: { user: callerUser },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !callerUser || !callerUser.email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "جلسة المستخدم منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.",
          status: "unauthorized",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Strict Server-Side Verification: Determine Caller's Authentic Database Role
    // NEVER trust the client body or preview role!
    const callerEmail = callerUser.email.toLowerCase().trim();
    let callerRole: 'system_admin' | 'general_supervisor' | null = null;

    if (SYSTEM_ADMIN_WHITELIST.includes(callerEmail)) {
      callerRole = 'system_admin';
    } else {
      // Check in supervisors table
      const { data: supRecord, error: supErr } = await adminClient
        .from("supervisors")
        .select("role")
        .ilike("email", callerEmail)
        .maybeSingle();

      if (!supErr && supRecord) {
        if (supRecord.role === "system_admin") {
          callerRole = "system_admin";
        } else if (supRecord.role === "general_supervisor") {
          callerRole = "general_supervisor";
        }
      }
    }

    if (!callerRole) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "عفواً، هذه العملية محصورة بمسؤول النظام والمشرف العام المعتمدين حصراً في قاعدة البيانات.",
          status: "forbidden",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse & Validate Request Body
    const body: CreateUserRequestBody = await req.json();
    const cleanEmail = (body.email || "").toLowerCase().trim();
    const cleanName = (body.name || "").trim();
    const cleanPhone = (body.phone || "").trim();
    const targetRole = body.role;
    const track = (body.track || "").trim();
    const supervisorId = body.supervisorId;

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "يرجى تقديم بريد إلكتروني صالح للمستخدم.",
          status: "invalid_input",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!cleanName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "اسم المستخدم مطلوب.",
          status: "invalid_input",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Security Gate 1: Strictly forbid creating another system_admin through this endpoint!
    if ((targetRole as string) === "system_admin") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "غير مسموح بإنشاء مسؤول نظام آخر. صلاحيات مسؤول النظام محددة حصراً لصاحب المنظومة.",
          status: "disallowed_role",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Security Gate 2: Enforce strict role boundary based on caller
    if (callerRole === "general_supervisor") {
      // General Supervisor can ONLY create teachers or sub-supervisors
      if (targetRole !== "teacher" && targetRole !== "sub_supervisor") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "غير مصرح: المشرف العام يملك صلاحية إضافة المعلمين والمشرفين الفرعيين فقط. لا يمكن إنشاء مدير عام أو مشرف عام أو مسؤول نظام.",
            status: "forbidden_role",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const allowedRoles = ["teacher", "sub_supervisor", "general_supervisor", "manager"];
    if (!allowedRoles.includes(targetRole)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `الدور المطلوب (${targetRole}) غير مسموح به في النظام.`,
          status: "disallowed_role",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If teacher, supervisor assignment is strictly required
    if (targetRole === "teacher") {
      if (!supervisorId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "تعيين المشرف الفرعي المسؤول مطلوب لكل معلم جديد.",
            status: "missing_supervisor",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Verify supervisor exists
      const { data: supFound, error: supCheckErr } = await adminClient
        .from("supervisors")
        .select("id, name")
        .eq("id", supervisorId)
        .maybeSingle();

      if (supCheckErr || !supFound) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "المشرف الفرعي المحدد غير موجود في سجلات المشرفين المعتمدة.",
            status: "supervisor_not_found",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 5. Check Existing Status in Supabase Auth & DB Tables (Idempotent handling)
    // Check in auth.users
    const { data: existingUsersData } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingUsersData?.users?.find(
      (u) => u.email?.toLowerCase().trim() === cleanEmail
    );

    // Check existing teacher
    const { data: existingTeacher } = await adminClient
      .from("teachers")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    // Check existing supervisor
    const { data: existingSupervisor } = await adminClient
      .from("supervisors")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    let profileRecordId = "";
    let isProfileCreated = false;
    let isAuthInvited = false;
    let authUserId = existingAuthUser?.id || "";

    // 6. Handle Database Profile Record
    if (targetRole === "teacher") {
      if (existingTeacher) {
        // Teacher profile already exists, do NOT overwrite or change blindly
        profileRecordId = existingTeacher.id;
      } else {
        // Create teacher profile
        const notes = track ? `حلقة القرآن الكريم - مسار: ${track}` : "حلقة القرآن الكريم";
        const { data: newTeacher, error: tInsertErr } = await adminClient
          .from("teachers")
          .insert({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            supervisor_id: supervisorId,
            monthly_expenses: 0,
            notes,
          })
          .select("id")
          .single();

        if (tInsertErr) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `فشل تسجيل المعلم في قاعدة البيانات: ${tInsertErr.message}`,
              status: "db_insert_failed",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        profileRecordId = newTeacher.id;
        isProfileCreated = true;
      }
    } else {
      // Supervisor or Manager
      if (existingSupervisor) {
        // If caller is general_supervisor and target is manager/system_admin/general_supervisor, forbid
        if (callerRole === "general_supervisor" && existingSupervisor.role !== "sub_supervisor") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "غير مصرح: الحساب مسجل بدور قيادي أعلى ولا يملك المشرف العام صلاحية تعديله.",
              status: "forbidden",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        // Supervisor profile already exists, do NOT overwrite or change blindly
        profileRecordId = existingSupervisor.id;
      } else {
        const { data: newSupervisor, error: sInsertErr } = await adminClient
          .from("supervisors")
          .insert({
            name: cleanName,
            email: cleanEmail,
            role: targetRole,
          })
          .select("id")
          .single();

        if (sInsertErr) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `فشل تسجيل الكادر الإشرافي في قاعدة البيانات: ${sInsertErr.message}`,
              status: "db_insert_failed",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        profileRecordId = newSupervisor.id;
        isProfileCreated = true;
      }
    }

    // 7. Handle Supabase Auth Account & Invitation
    if (existingAuthUser) {
      // Account already exists in Supabase Auth!
      const existingUserRole = existingAuthUser.app_metadata?.role || existingAuthUser.user_metadata?.role;
      if (
        callerRole === "general_supervisor" &&
        existingUserRole &&
        existingUserRole !== "teacher" &&
        existingUserRole !== "sub_supervisor"
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "غير مصرح: الحساب مسجل مسبقاً بدور قيادي، ولا يملك المشرف العام صلاحية تعديله.",
            status: "forbidden",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update metadata securely without changing password or overwriting
      await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          name: cleanName,
          phone: cleanPhone,
          role: targetRole,
          track: track || undefined,
          profile_id: profileRecordId,
        },
        app_metadata: {
          role: targetRole,
          profile_id: profileRecordId,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: "account_already_registered",
          message: "حساب المستخدم مسجل مسبقاً في نظام المصادقة وتم التأكد من ربط ملفه بنجاح.",
          auth_user_id: existingAuthUser.id,
          profile_id: profileRecordId,
          user_type: targetRole === "teacher" ? "teacher" : "supervisor",
          invite_sent: false,
          profile_created: isProfileCreated,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Account does not exist in Supabase Auth -> Dispatch official Invitation
    const redirectUrl = `${siteUrl.replace(/\/$/, "")}/#type=invite`;
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: {
          name: cleanName,
          phone: cleanPhone,
          role: targetRole,
          track: track || undefined,
          profile_id: profileRecordId,
          supervisor_id: supervisorId || undefined,
        },
        redirectTo: redirectUrl,
      }
    );

    if (inviteErr) {
      // Profile in DB was saved, but email invitation request failed
      return new Response(
        JSON.stringify({
          success: true,
          status: "profile_saved_invite_failed",
          message: `تم حفظ ملف المستخدم في قاعدة البيانات بنجاح، لكن تعذر إرسال دعوة البريد الإلكتروني: ${inviteErr.message}`,
          auth_user_id: null,
          profile_id: profileRecordId,
          user_type: targetRole === "teacher" ? "teacher" : "supervisor",
          invite_sent: false,
          profile_created: isProfileCreated,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    authUserId = inviteData.user?.id || "";
    isAuthInvited = true;

    // Securely set app_metadata role
    if (authUserId) {
      await adminClient.auth.admin.updateUserById(authUserId, {
        app_metadata: {
          role: targetRole,
          profile_id: profileRecordId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "invited_successfully",
        message: "تم إنشاء الحساب وإرسال رابط الدعوة وتعيين كلمة المرور إلى البريد الإلكتروني المعتمد بنجاح.",
        auth_user_id: authUserId,
        profile_id: profileRecordId,
        user_type: targetRole === "teacher" ? "teacher" : "supervisor",
        invite_sent: isAuthInvited,
        profile_created: isProfileCreated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "حدث خطأ غير متوقع أثناء معالجة الطلب في وظيفة الخادم.",
        status: "internal_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
