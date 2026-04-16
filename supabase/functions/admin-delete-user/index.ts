import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Client using caller's JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('Not authenticated');
    }

    // Check caller's role
    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from('profiles')
      .select('role, id')
      .eq('id', currentUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      throw new Error('Could not identify Caller Profile');
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('Server environment missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Validate Authorization limits
    if (callerProfile.role !== 'admin') {
      if (callerProfile.role !== 'trainer') {
        throw new Error('Unauthorized role type.');
      }

      // If they are a trainer, assert they manage the target user
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('trainer_id')
        .eq('id', targetUserId)
        .single();
      
      if (targetError || !targetProfile) {
        throw new Error('Target user does not exist.');
      }

      if (targetProfile.trainer_id !== callerProfile.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized. You do not manage this trainee.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Attempt Deletion sequence
    // 1. Manually wipe profile row to unlock FK constraint limitations if the local BD handles CASCADE weirdly
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
    
    // 2. Erase from Auth fully
    const { error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deletionError) {
      throw deletionError;
    }

    return new Response(JSON.stringify({ success: true }), {
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
