import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platform, accessToken, pageId, instagramAccountId } = await req.json();

    console.log("Received manual token data:", { userId, platform, pageId, instagramAccountId });

    if (!userId || !platform || !accessToken || !pageId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (platform === "instagram" && !instagramAccountId) {
      return new Response(
        JSON.stringify({ error: "Instagram Account ID is required for Instagram" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token using debug_token endpoint (requires only basic access)
    console.log("Validating token with Graph API debug endpoint...");
    
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (debugData.error) {
      console.error("Token debug failed:", debugData.error);
      return new Response(
        JSON.stringify({ error: `Token inválido: ${debugData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!debugData.data?.is_valid) {
      console.error("Token is not valid:", debugData.data);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token validated successfully. Scopes:", debugData.data.scopes);

    let platformUsername = null;

    // Try to get Instagram username if platform is instagram
    if (platform === "instagram" && instagramAccountId) {
      console.log("Fetching Instagram account info...");
      try {
        const igUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=username&access_token=${accessToken}`;
        const igResponse = await fetch(igUrl);
        const igData = await igResponse.json();
        
        if (igData.username) {
          platformUsername = igData.username;
          console.log("Instagram username:", platformUsername);
        } else if (igData.error) {
          console.warn("Could not fetch Instagram username:", igData.error.message);
          // Don't fail, just continue without username
        }
      } catch (err) {
        console.warn("Error fetching Instagram info:", err);
      }
    }

    // Try to get Facebook page name if platform is facebook
    if (platform === "facebook") {
      console.log("Fetching Facebook page info...");
      try {
        const pageUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=name&access_token=${accessToken}`;
        const pageResponse = await fetch(pageUrl);
        const pageData = await pageResponse.json();
        
        if (pageData.name) {
          platformUsername = pageData.name;
          console.log("Facebook page name:", platformUsername);
        } else if (pageData.error) {
          console.warn("Could not fetch page name:", pageData.error.message);
        }
      } catch (err) {
        console.warn("Error fetching page info:", err);
      }
    }

    // Calculate expiration based on debug data or default to 60 days
    let expiresAt = new Date();
    if (debugData.data.expires_at && debugData.data.expires_at > 0) {
      expiresAt = new Date(debugData.data.expires_at * 1000);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 60);
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Saving to database...");

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .update({
        access_token: accessToken,
        page_id: pageId,
        instagram_account_id: platform === "instagram" ? instagramAccountId : null,
        platform_username: platformUsername,
        is_connected: true,
        connected_at: new Date().toISOString(),
        token_expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", userId)
      .eq("platform", platform);

    if (upsertError) {
      console.error("Database error:", upsertError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Account connected successfully!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} conectado com sucesso!`,
        username: platformUsername || pageId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in save-manual-token:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
