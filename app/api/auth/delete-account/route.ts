import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getSupabaseConfig() {
  const useLocalDb = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

  if (useLocalDb) {
    return {
      url: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!,
      serviceRoleKey: process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!
    };
  }

  return {
    url: process.env.NEXT_PUBLIC_REMOTE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  };
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create admin client with service role key
    const config = getSupabaseConfig()
    const adminClient = createAdminClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Delete the user using Supabase Admin API
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
