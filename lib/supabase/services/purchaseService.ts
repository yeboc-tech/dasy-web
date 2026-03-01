import { SupabaseClient } from '@supabase/supabase-js';

export async function checkWorksheetGroupPurchase(
  supabase: SupabaseClient,
  userId: string,
  worksheetGroupId: number
): Promise<boolean> {
  const { data } = await supabase
    .from('user_worksheet_group_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('worksheet_group_id', worksheetGroupId)
    .single();
  return !!data;
}

export async function checkWorksheetAccess(
  supabase: SupabaseClient,
  userId: string,
  worksheetId: string
): Promise<{ isPaid: boolean; isPurchased: boolean; worksheetGroupId: number | null; price: number }> {
  // Find worksheet groups that contain this worksheet and have price > 0
  const { data: groups } = await supabase
    .from('worksheet_group')
    .select('id, price, worksheet_ids')
    .gt('price', 0);

  if (!groups || groups.length === 0) {
    return { isPaid: false, isPurchased: false, worksheetGroupId: null, price: 0 };
  }

  // Find the paid group containing this worksheet
  const paidGroup = groups.find((g) =>
    (g.worksheet_ids as string[])?.includes(worksheetId)
  );

  if (!paidGroup) {
    return { isPaid: false, isPurchased: false, worksheetGroupId: null, price: 0 };
  }

  const isPurchased = await checkWorksheetGroupPurchase(supabase, userId, paidGroup.id);

  return {
    isPaid: true,
    isPurchased,
    worksheetGroupId: paidGroup.id,
    price: paidGroup.price,
  };
}
