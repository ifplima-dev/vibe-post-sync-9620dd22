import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_ID = Deno.env.get("META_APP_ID");
const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, userId, platform } = await req.json();

    console.log("Meta OAuth callback received:", { platform, userId });

    if (!code || !redirectUri || !userId || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`;
    
    console.log("Exchanging code for access token...");
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Error getting access token:", tokenData.error);
      return new Response(
        JSON.stringify({ error: tokenData.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shortLivedToken = tokenData.access_token;
    console.log("Got short-lived token");

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    
    console.log("Exchanging for long-lived token...");
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      console.error("Error getting long-lived token:", longLivedData.error);
      return new Response(
        JSON.stringify({ error: longLivedData.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // 60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    console.log("Got long-lived token, expires at:", tokenExpiresAt);

    // Step 3: Get user's Facebook pages
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`;
    console.log("Getting user pages...");
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error("Error getting pages:", pagesData.error);
      return new Response(
        JSON.stringify({ error: pagesData.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Facebook pages found. Please create a Facebook page first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use first page (could be expanded to let user choose)
    const page = pagesData.data[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;
    const pageName = page.name;
    console.log("Using page:", pageName, pageId);

    // Step 4: Get Instagram Business Account ID (if platform is instagram)
    let instagramAccountId = null;
    let instagramUsername = null;

    if (platform === "instagram") {
      const igUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
      console.log("Getting Instagram business account...");
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();

      if (igData.instagram_business_account) {
        instagramAccountId = igData.instagram_business_account.id;
        
        // Get Instagram username
        const igUserUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`;
        const igUserResponse = await fetch(igUserUrl);
        const igUserData = await igUserResponse.json();
        instagramUsername = igUserData.username;
        console.log("Instagram account:", instagramUsername, instagramAccountId);
      } else {
        return new Response(
          JSON.stringify({ error: "No Instagram Business Account connected to this Facebook page." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 5: Save to database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const updateData: Record<string, unknown> = {
      is_connected: true,
      connected_at: new Date().toISOString(),
      access_token: pageAccessToken,
      page_id: pageId,
      token_expires_at: tokenExpiresAt.toISOString(),
      platform_username: platform === "instagram" ? instagramUsername : pageName,
    };

    if (platform === "instagram") {
      updateData.instagram_account_id = instagramAccountId;
    }

    console.log("Updating database for platform:", platform);
    const { error: dbError } = await supabase
      .from("connected_accounts")
      .update(updateData)
      .eq("user_id", userId)
      .eq("platform", platform);

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully connected", platform);
    return new Response(
      JSON.stringify({ 
        success: true, 
        platform,
        username: platform === "instagram" ? instagramUsername : pageName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in meta-oauth:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});