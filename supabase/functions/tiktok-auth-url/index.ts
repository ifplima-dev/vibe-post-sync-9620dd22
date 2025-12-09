import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { redirectUri } = await req.json();

    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    if (!clientKey) {
      throw new Error("TIKTOK_CLIENT_KEY não configurado");
    }

    if (!redirectUri) {
      throw new Error("redirectUri é obrigatório");
    }

    // TikTok OAuth 2.0 scopes
    // user.info.basic - Basic user info
    // video.upload - Upload videos (requires approval)
    // video.publish - Publish videos (requires approval)
    const scopes = "user.info.basic,video.upload,video.publish";

    // Generate a random state for security (we'll use "tiktok" as platform identifier)
    const csrfState = `tiktok_${crypto.randomUUID()}`;

    // Build TikTok authorization URL
    const params = new URLSearchParams({
      client_key: clientKey,
      scope: scopes,
      response_type: "code",
      redirect_uri: redirectUri,
      state: csrfState,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    console.log("Generated TikTok auth URL for redirect:", redirectUri);

    return new Response(
      JSON.stringify({ authUrl, state: csrfState }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating TikTok auth URL:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
