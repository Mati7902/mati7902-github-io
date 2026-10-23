"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { AppError, type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { createBlockedSlot, deleteAvailabilityRule, deleteBlockedSlot, deletePracticeLocation, upsertAvailabilityRule, upsertPracticeLocation } from "@/server/services/admin-schedule";
import { audit } from "@/server/services/audit";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM).");

const ruleSchema = z
  .object({
    id: z.string().uuid().optional(),
    weekday: z.number().int().min(0).max(6),
    start_time: time,
    end_time: time,
    slot_duration_minutes: z.number().int().min(15).max(240),
    buffer_minutes: z.number().int().min(0).max(120),
    modality: z.enum(["presencial", "virtual", "mixta"]),
    is_active: z.boolean(),
    valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    location_id: z.string().uuid().nullable().optional(),
    every_weeks: z.number().int().min(1).max(4).default(1),
    anchor_date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullable().optional(),
  })
  .refine((r) => r.end_time > r.start_time, { message: "La hora de fin debe ser posterior a la de inicio.", path: ["end_time"] })
  .refine((r) => r.every_weeks === 1 || !!r.anchor_date, { message: "Elegí la fecha del primer día de esta franja.", path: ["anchor_date"] })
  .refine((r) => r.every_weeks === 1 || !r.anchor_date || new Date(`${r.anchor_date}T12:00:00Z`).getUTCDay() === r.weekday, {
    message: "La fecha de inicio tiene que caer en el mismo día de la semana de la franja.",
    path: ["anchor_date"],
  });

export async function saveAvailabilityRuleAction(input: z.input<typeof ruleSchema>): Promise<ActionResult> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    await assertAdmin();
    const supabase = await createClient();
    const rule = await upsertAvailabilityRule(supabase, parsed.data);
    await audit(supabase, "availability.rule_saved", { type: "availability_rule", id: rule.id });
    revalidatePath("/admin/configuracion");
    revalidatePath("/admin/agenda");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAvailabilityRuleAction(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await deleteAvailabilityRule(supabase, id);
    await audit(supabase, "availability.rule_deleted", { type: "availability_rule", id });
    revalidatePath("/admin/configuracion");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

const blockSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    type: z.enum(["block", "vacation", "holiday", "exception"]),
    reason: z.string().trim().max(200).optional().nullable(),
  })
  .refine((b) => new Date(b.end) > new Date(b.start), { message: "El fin debe ser posterior al inicio.", path: ["end"] });

export async function createBlockedSlotAction(input: z.infer<typeof blockSchema>): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const block = await createBlockedSlot(supabase, { start: new Date(parsed.data.start), end: new Date(parsed.data.end), type: parsed.data.type, reason: parsed.data.reason, createdBy: session.userId });
    await audit(supabase, "availability.block_created", { type: "blocked_slot", id: block.id }, { type_: block.type });
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/configuracion");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteBlockedSlotAction(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await deleteBlockedSlot(supabase, id);
    await audit(supabase, "availability.block_deleted", { type: "blocked_slot", id });
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/configuracion");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/* Sedes ------------------------------------------------------------------- */
const httpsUrl = z.union([z.literal(""), z.string().trim().url().max(500).regex(/^https:\/\//, "El enlace tiene que empezar con https://")]).nullable().optional();
const locationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Escribí el nombre.").max(120),
  address: z.string().trim().min(2, "Escribí la dirección.").max(200),
  city: z.string().trim().max(120).nullable().optional(),
  maps_url: httpsUrl,
  photo_url: httpsUrl,
  notes: z.string().trim().max(300).nullable().optional(),
  sort_order: z.number().int().min(0).max(99),
  is_active: z.boolean(),
});

function revalidateLocations() {
  revalidatePath("/", "layout");
}

export async function savePracticeLocationAction(input: z.infer<typeof locationSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    await assertAdmin();
    const supabase = await createClient();
    const place = await upsertPracticeLocation(supabase, parsed.data);
    await audit(supabase, "location.saved", { type: "practice_location", id: place.id });
    revalidateLocations();
    return ok({ id: place.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deletePracticeLocationAction(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await deletePracticeLocation(supabase, z.string().uuid().parse(id));
    await audit(supabase, "location.deleted", { type: "practice_location", id });
    revalidateLocations();
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

const PHOTO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Sube la foto de una sede al bucket público "branding" y la guarda en la sede. */
export async function uploadLocationPhotoAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const file = formData.get("file");
  if (!id.success) return fail(new AppError("VALIDATION", "Guardá la sede antes de subir la foto."));
  if (!(file instanceof File) || file.size === 0) return fail(new AppError("VALIDATION", "Elegí una imagen."));
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return fail(new AppError("VALIDATION", "Formato no permitido (PNG, JPG o WebP)."));
  if (file.size > 5 * 1024 * 1024) return fail(new AppError("VALIDATION", "La imagen supera los 5 MB."));
  try {
    await assertAdmin();
    const supabase = await createClient();
    const path = `sedes/${id.data}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new AppError("EXTERNAL", `No pudimos subir la imagen: ${error.message}`);
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    const { error: saveError } = await supabase.from("practice_locations").update({ photo_url: data.publicUrl }).eq("id", id.data);
    if (saveError) throw saveError;
    await audit(supabase, "location.photo_uploaded", { type: "practice_location", id: id.data });
    revalidateLocations();
    return ok({ url: data.publicUrl });
  } catch (error) {
    return fail(error);
  }
}
