import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

type EmailEventData = {
  email_id: string;
  created_at?: string;
  from: string;
  to: string[];
  subject?: string;
  message_id?: string;
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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id")!,
        timestamp: req.headers.get("svix-timestamp")!,
        signature: req.headers.get("svix-signature")!,
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    });

    // We only care about email events.
    if (!event.type.startsWith("email.")) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
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

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Webhook verification failed:", error);

    return NextResponse.json(
      {
        error: "Invalid webhook",
      },
      {
        status: 400,
      }
    );
  }
}