import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // WEBHOOK VERIFICATION - GET request from Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    console.log("Webhook verification request:", { mode, token, challenge });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully");
      return new Response(challenge, { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    console.error("❌ Webhook verification failed - token mismatch");
    return new Response("Verification failed", { status: 403 });
  }

  // RECEIVE EVENTS - POST request from Meta
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📩 Received webhook event:", JSON.stringify(body, null, 2));

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const objectType = body.object; // "instagram" or "page"

      for (const entry of body.entry || []) {
        const pageOrAccountId = entry.id;
        const timestamp = entry.time;

        // Handle changes (feed, comments)
        for (const change of entry.changes || []) {
          console.log(`Processing change - field: ${change.field}`, change.value);

          if (change.field === "comments" || change.field === "feed") {
            await processCommentEvent(supabase, objectType, pageOrAccountId, change.value);
          }
        }

        // Handle messaging (Instagram DMs, etc.)
        for (const messaging of entry.messaging || []) {
          console.log("Processing messaging event:", messaging);
          // Future: handle DMs
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Error processing webhook:", error);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function processCommentEvent(
  supabase: any,
  objectType: string,
  pageOrAccountId: string,
  value: any
) {
  try {
    // Find the user who owns this page/account
    const platform = objectType === "instagram" ? "instagram" : "facebook";
    const idField = platform === "instagram" ? "instagram_account_id" : "page_id";

    const { data: account, error: accountError } = await supabase
      .from("connected_accounts")
      .select("user_id")
      .eq(idField, pageOrAccountId)
      .eq("is_connected", true)
      .single();

    if (accountError || !account) {
      console.log("No connected account found for:", pageOrAccountId);
      return;
    }

    const userId = account.user_id;

    // Extract comment data from webhook payload
    const commentData = {
      user_id: userId,
      platform,
      platform_comment_id: value.id || value.comment_id,
      post_id: value.post_id || value.media_id || "unknown",
      comment_text: value.text || value.message || "",
      author_name: value.from?.name || value.from?.username || "Unknown",
      author_profile_pic: value.from?.profile_pic || null,
      created_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    };

    console.log("💬 Saving comment:", commentData);

    // Upsert comment (update if exists, insert if new)
    const { error: upsertError } = await supabase
      .from("comments")
      .upsert(commentData, {
        onConflict: "platform_comment_id,platform",
      });

    if (upsertError) {
      console.error("Error saving comment:", upsertError);
    } else {
      console.log("✅ Comment saved successfully");
    }
  } catch (error) {
    console.error("Error processing comment event:", error);
  }
}
