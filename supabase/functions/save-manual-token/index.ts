import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_VERSION = "v21.0";

// Required permissions for publishing - only core permissions required
const REQUIRED_PERMISSIONS = {
  instagram: ["instagram_basic", "instagram_content_publish"],
  facebook: ["pages_manage_posts", "pages_read_engagement"],
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

    let pageAccessToken = accessToken;
    let finalPageId = pageId;
    let finalInstagramAccountId = instagramAccountId;
    let platformUsername = null;

    // Step 3: Try to get pages first
    console.log("Fetching user's Facebook pages...");
    const pagesUrl = `https://graph.facebook.com/${API_VERSION}/me/accounts?access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error("Error fetching pages:", pagesData.error);
    }

    const hasPages = pagesData.data && pagesData.data.length > 0;
    console.log(`Found ${hasPages ? pagesData.data.length : 0} pages`);

    if (hasPages) {
      // Traditional approach: Use Page Access Token
      let selectedPage = null;

      if (pageId) {
        selectedPage = pagesData.data.find((page: { id: string }) => page.id === pageId);
        if (!selectedPage) {
          const availablePages = pagesData.data.map((p: { name: string; id: string }) => `${p.name} (${p.id})`).join(", ");
          return new Response(
            JSON.stringify({ 
              error: `Page ID não encontrado. Páginas disponíveis: ${availablePages}` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        selectedPage = pagesData.data[0];
        finalPageId = selectedPage.id;
        console.log(`Using first page: ${selectedPage.name} (${selectedPage.id})`);
      }

      pageAccessToken = selectedPage.access_token;
      console.log(`Using Page Access Token for page: ${selectedPage.name}`);

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

      if (platform === "facebook") {
        platformUsername = selectedPage.name;
        console.log("Facebook page name:", platformUsername);
      }
    } else {
      // Alternative approach for Instagram without pages
      // This happens when the token has instagram permissions but no page access
      console.log("No pages found. Trying alternative Instagram approach...");

      if (platform === "instagram") {
        // Try to get Instagram account directly via the user's connected IG account
        // First, get the user ID from the token
        const meUrl = `https://graph.facebook.com/${API_VERSION}/me?fields=id,name&access_token=${accessToken}`;
        const meResponse = await fetch(meUrl);
        const meData = await meResponse.json();
        
        console.log("User info:", meData);

        if (meData.error) {
          return new Response(
            JSON.stringify({ 
              error: `Erro ao obter informações do usuário: ${meData.error.message}` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Try to get Instagram accounts linked to this user
        const igAccountsUrl = `https://graph.facebook.com/${API_VERSION}/me/accounts?fields=instagram_business_account{id,username}&access_token=${accessToken}`;
        const igAccountsResponse = await fetch(igAccountsUrl);
        const igAccountsData = await igAccountsResponse.json();
        
        console.log("Instagram accounts lookup result:", JSON.stringify(igAccountsData));

        // If still no pages with IG, try to check if this token can be used directly
        // Some Creator accounts work with just the user token
        if (!igAccountsData.data || igAccountsData.data.length === 0) {
          console.log("No pages with Instagram accounts found. Checking token type...");
          
          // Check if this is a Page token (by checking if user_id exists in debug data)
          const tokenUserId = debugData.data.user_id;
          const tokenAppId = debugData.data.app_id;
          
          console.log("Token user_id:", tokenUserId, "App ID:", tokenAppId);
          
          // For tokens from Graph API Explorer, we need pages_show_list permission
          // Let the user know they need to add that permission
          return new Response(
            JSON.stringify({ 
              error: "Seu token não tem acesso às páginas do Facebook. Para publicar no Instagram via API, você precisa:\n\n1. Ter uma Página do Facebook\n2. Vincular sua conta Instagram Business/Creator a essa página\n3. Gerar um token com as permissões: pages_show_list, pages_read_engagement\n\nNo Graph API Explorer, adicione essas permissões e gere um novo token." 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Found Instagram via pages
        for (const page of igAccountsData.data) {
          if (page.instagram_business_account) {
            finalInstagramAccountId = page.instagram_business_account.id;
            platformUsername = page.instagram_business_account.username;
            finalPageId = page.id;
            
            // Get page access token
            const pageTokenUrl = `https://graph.facebook.com/${API_VERSION}/${page.id}?fields=access_token&access_token=${accessToken}`;
            const pageTokenResponse = await fetch(pageTokenUrl);
            const pageTokenData = await pageTokenResponse.json();
            
            if (pageTokenData.access_token) {
              pageAccessToken = pageTokenData.access_token;
            }
            
            console.log("Found Instagram account via alternative method:", finalInstagramAccountId, platformUsername);
            break;
          }
        }

        if (!finalInstagramAccountId) {
          return new Response(
            JSON.stringify({ 
              error: "Não foi possível encontrar uma conta Instagram Business vinculada. Certifique-se de que sua conta Instagram está configurada como Business ou Creator e vinculada a uma Página do Facebook." 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (platform === "facebook") {
        return new Response(
          JSON.stringify({ 
            error: "Nenhuma página do Facebook encontrada. Para publicar no Facebook, você precisa ser administrador de uma Página do Facebook e gerar um token com a permissão pages_show_list." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate expiration
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

    console.log("Saving to database...", { 
      pageAccessToken: pageAccessToken ? "present" : "missing",
      finalPageId,
      finalInstagramAccountId,
      platformUsername 
    });

    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert({
        user_id: userId,
        platform: platform,
        access_token: pageAccessToken,
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

    console.log("Account connected successfully!");

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
