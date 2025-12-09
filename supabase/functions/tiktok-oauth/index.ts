import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, userId } = await req.json();

    console.log("TikTok OAuth callback received for user:", userId);

    if (!code || !redirectUri || !userId) {
      throw new Error("Parâmetros obrigatórios: code, redirectUri, userId");
    }

    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");

    if (!clientKey || !clientSecret) {
      throw new Error("Configurações do TikTok não encontradas");
    }

    // Exchange code for access token
    console.log("Exchanging code for access token...");
    
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);

    if (tokenData.error || !tokenData.access_token) {
      console.error("Token error:", tokenData);
      throw new Error(tokenData.error_description || tokenData.error || "Erro ao obter token de acesso");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // Usually 86400 (24 hours)
    const openId = tokenData.open_id;

    console.log("Access token obtained, open_id:", openId);

    // Calculate token expiration date
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // Fetch user info
    console.log("Fetching user info...");
    
    const userInfoResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    const userInfoData = await userInfoResponse.json();
    console.log("User info response status:", userInfoResponse.status);

    let username = null;
    let displayName = null;

    if (userInfoData.data && userInfoData.data.user) {
      username = userInfoData.data.user.username || userInfoData.data.user.display_name;
      displayName = userInfoData.data.user.display_name;
      console.log("Username:", username, "Display name:", displayName);
    } else {
      console.log("Could not fetch user info, using open_id as identifier");
      username = openId;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update or insert connected account
    console.log("Saving TikTok connection to database...");

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        platform_username: username,
        is_connected: true,
        connected_at: new Date().toISOString(),
        page_id: openId, // Store open_id in page_id field for reference
      })
      .eq("user_id", userId)
      .eq("platform", "tiktok");

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Erro ao salvar conexão no banco de dados");
    }

    console.log("TikTok account connected successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        username: username,
        displayName: displayName,
        message: `Conta TikTok ${username} conectada com sucesso!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("TikTok OAuth error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao processar conexão com TikTok" 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
