import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { targetUserId, newPassword } = await req.json();

    if (!targetUserId || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId or newPassword' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Initialize the Supabase Client securely for validation using the exact Auth header of the caller
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabaseValidatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Security Verification:
    // Try to SELECT the target user's profile using the caller's context.
    // Due to RLS, this will ONLY succeed if:
    // a) The caller is an admin (universal bypass policy)
    // b) The caller is the trainer of the trainee
    // c) The caller is the target user themselves
    const { data: profile, error: dbError } = await supabaseValidatedClient
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .single();

    if (dbError || !profile) {
      console.error('Validation failed based on RLS permissions:', dbError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized to modify this user.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optionally: ensure we are not a trainee resetting someone else's password via a bug
    // While RLS protects cross-profile reading, let's explicitly guard it:
    const { data: { user: currentUser } } = await supabaseValidatedClient.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: currentProfile } = await supabaseValidatedClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role === 'trainee') {
      return new Response(JSON.stringify({ error: 'Trainees cannot reset passwords via this endpoint.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Initialize Admin Client with Service Role Key
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

    // 5. Execute the highly privileged Auth operation
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
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
