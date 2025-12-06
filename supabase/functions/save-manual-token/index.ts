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

    // Validate token by making a test API call
    console.log("Validating token with Graph API...");
    
    const validateUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=name,id&access_token=${accessToken}`;
    const validateResponse = await fetch(validateUrl);
    const validateData = await validateResponse.json();

    if (validateData.error) {
      console.error("Token validation failed:", validateData.error);
      return new Response(
        JSON.stringify({ error: `Token inválido: ${validateData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token validated successfully, page name:", validateData.name);

    let platformUsername = validateData.name;

    // For Instagram, get the Instagram username
    if (platform === "instagram" && instagramAccountId) {
      console.log("Fetching Instagram account info...");
      const igUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=username&access_token=${accessToken}`;
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();
      
      if (igData.username) {
        platformUsername = igData.username;
        console.log("Instagram username:", platformUsername);
      }
    }

    // Calculate expiration (60 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

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
        username: platformUsername
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
