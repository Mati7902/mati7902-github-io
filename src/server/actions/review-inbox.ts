"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult, fail, ok } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function markReviewedAction(input: { itemType: "intake" | "test_response"; itemId: string }): Promise<ActionResult> {
  const parsed = z.object({ itemType: z.enum(["intake", "test_response"]), itemId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("clinical_reviews").upsert({ item_type: parsed.data.itemType, item_id: parsed.data.itemId, reviewed_by: session.userId, reviewed_at: new Date().toISOString() }, { onConflict: "item_type,item_id" });
    if (error) throw error;
    revalidatePath("/admin");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
