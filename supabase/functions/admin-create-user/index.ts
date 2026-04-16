import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, trainer_id } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required parameters (email, password, full_name, role)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Auth the Caller using their JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('Not authenticated');
    }

    // Ensure caller is Admin
    const { data: currentProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError || currentProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Only admins can create users via this endpoint.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Initialize Service Role Client for User Creation
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('Server environment missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 4. Create User in auth.users
    // NOTE: This will immediately fire the 'handle_new_user' trigger
    // which inserts a row into public.profiles with role = 'trainee'
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      throw createError;
    }

    // 5. Trigger Mitigation (Patch the newly created public.profiles record)
    const newUserId = newUser.user.id;
    const finalTrainerId = role === 'trainee' ? (trainer_id || null) : null;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role,
        trainer_id: finalTrainerId
      })
      .eq('id', newUserId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
