import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_REDIRECT_URI = "https://vibe-post-sync.lovable.app/auth/callback";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, userId } = await req.json();
    console.log("YouTube OAuth callback for user:", userId);

    if (!code || !userId) {
      throw new Error("Parâmetros obrigatórios: code, userId");
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new Error("Credenciais Google não configuradas");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: YOUTUBE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);

    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      throw new Error(tokenData.error_description || tokenData.error || "Erro ao obter token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch YouTube channel info
    const channelResp = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelResp.json();
    console.log("Channel response status:", channelResp.status);

    let channelId: string | null = null;
    let username: string | null = null;

    if (channelData.items && channelData.items.length > 0) {
      channelId = channelData.items[0].id;
      username = channelData.items[0].snippet?.title || channelData.items[0].snippet?.customUrl;
      console.log("Channel:", username, channelId);
    } else {
      console.warn("No YouTube channel found for this Google account");
      throw new Error("Nenhum canal do YouTube encontrado para esta conta Google. Crie um canal antes de conectar.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await supabase
      .from("connected_accounts")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        platform_username: username,
        page_id: channelId,
        is_connected: true,
        connected_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("platform", "youtube");

    if (updateError) {
      console.error("DB error:", updateError);
      throw new Error("Erro ao salvar conexão no banco de dados");
    }

    return new Response(
      JSON.stringify({
        success: true,
        username,
        message: `Canal YouTube ${username} conectado com sucesso!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("YouTube OAuth error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro ao conectar YouTube" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
