// Supabase Edge Function: receives Resend webhook events and stores them in
// email_events / email_logs. Replaces app/api/resend-webhook on Vercel, where
// one request per email event (sent, delivered, opened, clicked…) for every
// email in the Resend account used up the Vercel edge request quota.
//
// Deploy: npx supabase functions deploy resend-webhook --no-verify-jwt
// (Resend can't send a Supabase JWT; requests are checked with the Svix
// signature instead.)
// Secret:  npx supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { Webhook } from "npm:svix@1";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type EmailEventData = {
  email_id: string;
  created_at?: string;
  from: string;
  to: string[];
  subject?: string;
  message_id?: string;
};

type ResendEvent = {
  type: string;
  created_at: string;
  data: unknown;
};

function classifyBusinessUnit(from = "") {
  const sender = from.toLowerCase();

  if (sender.includes("info@hmr.ph")) {
    return "HMR Retail";
  }

  if (sender.includes("inquire@hmr.ph") || sender.includes("inquire@marketing.hmr.ph") || sender.includes("meredith.amit@hmr.ph")) {
    return "HMR Auctions";
  }

  if (sender.includes("warren.carman@hmr.ph")) {
    return "HMR Solutions";
  }

  if (
    sender.includes("envirocycle-inc.com") || // any subdomain, e.g. connect.
    sender.includes("envirocycle@marketing.hmr.ph") ||
    sender.includes("albert.canoy@hmr.ph")
  ) {
    return "Envirocycle";
  }

  return "Other";
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let event: ResendEvent;
  try {
    const payload = await req.text();
    const wh = new Webhook(Deno.env.get("RESEND_WEBHOOK_SECRET")!);
    event = wh.verify(payload, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return json({ error: "Invalid webhook" }, 400);
  }

  // We only care about email events.
  if (!event.type.startsWith("email.")) {
    return json({ success: true, ignored: true });
  }

  const data = event.data as EmailEventData;

  const businessUnit = classifyBusinessUnit(data.from);

  // Store every event.
  const { error: eventError } = await supabase
    .from("email_events")
    .insert({
      resend_email_id: data.email_id,
      event_type: event.type,
      business_unit: businessUnit,
      sender: data.from,
      recipients: data.to,
      subject: data.subject ?? null,
      event_at: event.created_at,
    });

  if (eventError) {
    console.error("email_events error:", eventError);
  }

  // Maintain one summary row per email.
  const logUpdate: Record<string, unknown> = {
    resend_email_id: data.email_id,
    business_unit: businessUnit,
    sender: data.from,
    recipients: data.to,
    subject: data.subject ?? null,
    status: event.type.replace("email.", ""),
    updated_at: new Date().toISOString(),
  };

  switch (event.type) {
    case "email.sent":
      logUpdate.sent_at = data.created_at ?? event.created_at;
      break;

    case "email.delivered":
      logUpdate.delivered_at = event.created_at;
      break;

    case "email.opened":
      logUpdate.opened_at = event.created_at;
      break;

    case "email.clicked":
      logUpdate.clicked_at = event.created_at;
      break;

    case "email.bounced":
      logUpdate.bounced_at = event.created_at;
      break;

    case "email.complained":
      logUpdate.complained_at = event.created_at;
      break;
  }

  const { error: logError } = await supabase
    .from("email_logs")
    .upsert(logUpdate, {
      onConflict: "resend_email_id",
    });

  if (logError) {
    console.error("email_logs error:", logError);
  }

  return json({ success: true });
});
