import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_VERSION = "v21.0";

// Required permissions for publishing
const REQUIRED_PERMISSIONS = {
  instagram: ["instagram_basic", "instagram_content_publish", "pages_read_engagement", "pages_show_list"],
  facebook: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platform, accessToken, pageId, instagramAccountId } = await req.json();

    console.log("Received manual token data:", { userId, platform, pageId, instagramAccountId });

    if (!userId || !platform || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando (userId, platform, accessToken)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Validate token and check permissions using debug_token endpoint
    console.log("Validating token with Graph API debug endpoint...");
    
    const debugUrl = `https://graph.facebook.com/${API_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
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

    // Step 2: Check for required permissions
    const tokenScopes = debugData.data.scopes || [];
    const requiredScopes = REQUIRED_PERMISSIONS[platform as keyof typeof REQUIRED_PERMISSIONS] || [];
    const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));

    if (missingScopes.length > 0) {
      console.error("Missing required permissions:", missingScopes);
      return new Response(
        JSON.stringify({ 
          error: `Permissões insuficientes. Faltando: ${missingScopes.join(", ")}. Gere um novo token com todas as permissões necessárias.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Get list of pages to find the correct Page Access Token
    console.log("Fetching user's Facebook pages...");
    const pagesUrl = `https://graph.facebook.com/${API_VERSION}/me/accounts?access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error("Error fetching pages:", pagesData.error);
      return new Response(
        JSON.stringify({ error: `Erro ao buscar páginas: ${pagesData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma página do Facebook encontrada. Verifique se você é administrador de uma página." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pagesData.data.length} pages`);

    // Find the correct page and get its access token
    let selectedPage = null;
    let pageAccessToken = accessToken; // Default to user token if no page specified
    let finalPageId = pageId;
    let finalInstagramAccountId = instagramAccountId;
    let platformUsername = null;

    if (pageId) {
      // User specified a page ID, find it
      selectedPage = pagesData.data.find((page: { id: string }) => page.id === pageId);
      if (!selectedPage) {
        // List available pages for the user
        const availablePages = pagesData.data.map((p: { name: string; id: string }) => `${p.name} (${p.id})`).join(", ");
        return new Response(
          JSON.stringify({ 
            error: `Page ID não encontrado. Páginas disponíveis: ${availablePages}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // No page specified, use the first one
      selectedPage = pagesData.data[0];
      finalPageId = selectedPage.id;
      console.log(`No page ID specified, using first page: ${selectedPage.name} (${selectedPage.id})`);
    }

    // Get the Page Access Token (this is crucial for publishing)
    pageAccessToken = selectedPage.access_token;
    console.log(`Using Page Access Token for page: ${selectedPage.name}`);

    // Step 4: For Instagram, find the linked Instagram Business Account
    if (platform === "instagram") {
      console.log("Fetching Instagram Business Account linked to page...");
      
      const igUrl = `https://graph.facebook.com/${API_VERSION}/${finalPageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();

      if (igData.error) {
        console.error("Error fetching Instagram account:", igData.error);
        return new Response(
          JSON.stringify({ error: `Erro ao buscar conta Instagram: ${igData.error.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!igData.instagram_business_account) {
        return new Response(
          JSON.stringify({ 
            error: "Nenhuma conta Instagram Business vinculada a esta página. Vincule sua conta Instagram Business/Creator à página do Facebook primeiro." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalInstagramAccountId = igData.instagram_business_account.id;
      console.log("Found Instagram Business Account:", finalInstagramAccountId);

      // Get Instagram username
      try {
        const igInfoUrl = `https://graph.facebook.com/${API_VERSION}/${finalInstagramAccountId}?fields=username&access_token=${pageAccessToken}`;
        const igInfoResponse = await fetch(igInfoUrl);
        const igInfoData = await igInfoResponse.json();
        
        if (igInfoData.username) {
          platformUsername = igInfoData.username;
          console.log("Instagram username:", platformUsername);
        }
      } catch (err) {
        console.warn("Could not fetch Instagram username:", err);
      }
    }

    // Step 5: For Facebook, get page name
    if (platform === "facebook") {
      platformUsername = selectedPage.name;
      console.log("Facebook page name:", platformUsername);
    }

    // Calculate expiration - Page tokens from /me/accounts are long-lived (60+ days)
    let expiresAt = new Date();
    if (debugData.data.expires_at && debugData.data.expires_at > 0) {
      expiresAt = new Date(debugData.data.expires_at * 1000);
    } else {
      // Page tokens don't expire if the user token was long-lived
      expiresAt.setDate(expiresAt.getDate() + 60);
    }

    // Step 6: Save to database with the PAGE ACCESS TOKEN (not user token)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Saving to database with Page Access Token...");

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert({
        user_id: userId,
        platform: platform,
        access_token: pageAccessToken, // IMPORTANT: Save Page Token, not User Token
        page_id: finalPageId,
        instagram_account_id: platform === "instagram" ? finalInstagramAccountId : null,
        platform_username: platformUsername,
        is_connected: true,
        connected_at: new Date().toISOString(),
        token_expires_at: expiresAt.toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Account connected successfully with Page Access Token!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} conectado com sucesso!`,
        username: platformUsername || finalPageId,
        pageId: finalPageId,
        instagramAccountId: finalInstagramAccountId
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
