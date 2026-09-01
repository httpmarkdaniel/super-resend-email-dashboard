import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const { data, error } = await supabase
  .from("email_logs")
  .select("*")
  .limit(1);

if (error) {
  console.error("Supabase connection failed:");
  console.error(error);
  process.exit(1);
}

console.log("Supabase connection successful.");
console.log(data);