import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function sendOneSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const data = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok) {
    return { ok: false as const, error: data.message || `HTTP ${res.status}` };
  }
  return { ok: true as const, sid: data.sid! };
}

async function processScheduledRow(rowId: string) {
  const { data: row, error } = await supabaseAdmin
    .from("scheduled_sends")
    .select("*")
    .eq("id", rowId)
    .single();
  if (error || !row) return { ok: false, error: error?.message || "not found" };
  if (row.status !== "pending" && row.status !== "sending") {
    return { ok: false, error: `already ${row.status}` };
  }

  await supabaseAdmin
    .from("scheduled_sends")
    .update({ status: "sending" })
    .eq("id", row.id);

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (
    !settings?.twilio_account_sid ||
    !settings.twilio_auth_token ||
    !settings.twilio_from_number
  ) {
    await supabaseAdmin
      .from("scheduled_sends")
      .update({ status: "failed", error: "Twilio settings not configured" })
      .eq("id", row.id);
    return { ok: false, error: "Twilio settings not configured" };
  }

  const { data: contacts } = row.group_id
    ? await supabaseAdmin.from("contacts").select("phone").eq("group_id", row.group_id)
    : { data: [] as { phone: string | null }[] };

  const phones = (contacts ?? []).map((c) => c.phone).filter((p): p is string => Boolean(p));
  let success = 0;
  let failure = 0;

  for (const phone of phones) {
    const r = await sendOneSms(
      settings.twilio_account_sid,
      settings.twilio_auth_token,
      settings.twilio_from_number,
      phone,
      row.message_body,
    );
    if (r.ok) {
      success++;
      await supabaseAdmin.from("send_history").insert({
        scheduled_send_id: row.id,
        phone,
        status: "sent",
        twilio_sid: r.sid,
      });
    } else {
      failure++;
      await supabaseAdmin.from("send_history").insert({
        scheduled_send_id: row.id,
        phone,
        status: "failed",
        error: r.error,
      });
    }
  }

  await supabaseAdmin
    .from("scheduled_sends")
    .update({
      status: failure === 0 ? "sent" : success === 0 ? "failed" : "partial",
      sent_at: new Date().toISOString(),
      recipient_count: phones.length,
      success_count: success,
      failure_count: failure,
    })
    .eq("id", row.id);

  return { ok: true, success, failure, total: phones.length };
}

export const queueSend = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messageId: z.string().uuid(),
      groupId: z.string().uuid(),
      sendAt: z.string(), // ISO
      sendNow: z.boolean(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { data: msg } = await supabaseAdmin
      .from("messages")
      .select("title, body")
      .eq("id", data.messageId)
      .single();
    const { data: group } = await supabaseAdmin
      .from("contact_groups")
      .select("name")
      .eq("id", data.groupId)
      .single();
    if (!msg || !group) throw new Error("Message or group not found");

    const { data: inserted, error } = await supabaseAdmin
      .from("scheduled_sends")
      .insert({
        message_id: data.messageId,
        group_id: data.groupId,
        message_title: msg.title,
        message_body: msg.body,
        group_name: group.name,
        send_at: data.sendAt,
        status: "pending",
      })
      .select()
      .single();
    if (error || !inserted) throw new Error(error?.message || "insert failed");

    if (data.sendNow) {
      const r = await processScheduledRow(inserted.id);
      return { id: inserted.id, ...r };
    }
    return { id: inserted.id, ok: true, scheduled: true };
  });

export const processDueScheduled = createServerFn({ method: "POST" }).handler(
  async () => {
    const nowIso = new Date().toISOString();
    const { data: due } = await supabaseAdmin
      .from("scheduled_sends")
      .select("id")
      .eq("status", "pending")
      .lte("send_at", nowIso)
      .limit(50);
    let processed = 0;
    for (const row of due ?? []) {
      await processScheduledRow(row.id);
      processed++;
    }
    return { processed };
  },
);

export const cancelScheduled = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    await supabaseAdmin
      .from("scheduled_sends")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "pending");
    return { ok: true };
  });
