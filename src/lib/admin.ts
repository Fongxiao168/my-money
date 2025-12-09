import { supabase } from './supabase';

export async function logAdminAction(
  action: string,
  targetResource: string,
  targetId?: string,
  details?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action,
      target_resource: targetResource,
      target_id: targetId,
      details,
      ip_address: 'recorded-by-server' // In a real app, this would be captured server-side
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
