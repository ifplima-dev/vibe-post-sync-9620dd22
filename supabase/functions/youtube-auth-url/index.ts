import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    await req.json();

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID não configurado");

    // YouTube scopes - upload videos and read basic channel info
    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    const state = `youtube_${crypto.randomUUID()}`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: YOUTUBE_REDIRECT_URI,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("Generated YouTube auth URL for redirect:", YOUTUBE_REDIRECT_URI);

    return new Response(
      JSON.stringify({ authUrl, state }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating YouTube auth URL:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
