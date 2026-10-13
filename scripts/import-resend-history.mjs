import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function classifyBusinessUnit(from = "") {
  const sender = from.toLowerCase();

  if (sender.includes("info@hmr.ph")) {
    return "HMR Retail";
  }

  if (sender.includes("inquire@hmr.ph") || sender.includes("meredith.amit@hmr.ph")) {
    return "HMR Auctions";
  }

  if (
    sender.includes("envirocycle@marketing.hmr.ph") ||
    sender.includes("envirocycle-inc.com") // any subdomain, e.g. connect.
  ) {
    return "Envirocycle";
  }

  return "Other";
}

async function importEmails() {
  let after;

  while (true) {
    console.log("Fetching Resend emails...");

    const { data, error } = await resend.emails.list({
      limit: 100,
      ...(after ? { after } : {}),
    });

    if (error) {
      console.error("Resend error:");
      console.error(error);
      process.exit(1);
    }

    const emails = data?.data ?? [];

    if (emails.length === 0) {
      break;
    }

    const rows = emails.map((email) => ({
      resend_email_id: email.id,
      business_unit: classifyBusinessUnit(email.from),
      sender: email.from,
      recipients: email.to,
      subject: email.subject,
      status: email.last_event ?? "sent",
      sent_at: email.created_at,
      updated_at: new Date().toISOString(),
    }));

    const { error: dbError } = await supabase
      .from("email_logs")
      .upsert(rows, {
        onConflict: "resend_email_id",
      });

    if (dbError) {
      console.error("Supabase insert failed:");
      console.error(dbError);
      process.exit(1);
    }

    console.log(`Imported ${rows.length} emails`);

    if (!data?.has_more) {
      break;
    }

    after = emails[emails.length - 1].id;
  }

  console.log("Historical import complete.");
}

importEmails();