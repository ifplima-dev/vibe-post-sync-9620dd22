import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const API_VERSION = "v21.0";

// Helper function to parse Meta API errors
function parseMetaError(error: { message?: string; code?: number; error_subcode?: number; type?: string }): string {
  const code = error.code;
  const subcode = error.error_subcode;
  const message = error.message || "Erro desconhecido";

  // Common error codes
  if (code === 100) {
    if (subcode === 33) {
      return "ID da conta Instagram inválido ou sem permissões. Reconecte sua conta.";
    }
    if (/permission to publish/i.test(message)) {
      return "Sem permissão para publicar vídeo nessa Página. Gere um novo token com as permissões pages_manage_posts, pages_read_engagement, pages_show_list (e instagram_content_publish) e reconecte a conta em Perfil → Reconectar.";
    }
    return `Parâmetros inválidos: ${message}`;
  }

  
  if (code === 190) {
    return "Token de acesso expirado ou inválido. Reconecte sua conta.";
  }
  
  if (code === 10) {
    return "Permissões insuficientes. Verifique se sua conta tem as permissões necessárias.";
  }
  
  if (code === 368) {
    return "Conta temporariamente bloqueada por violar políticas. Aguarde antes de tentar novamente.";
  }

  if (code === 4) {
    return "Limite de requisições excedido. Aguarde alguns minutos e tente novamente.";
  }

  return message;
}

// Inspect which permissions the token actually carries (for diagnostics)
async function getTokenScopes(token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/debug_token?input_token=${token}&access_token=${token}`
    );
    const data = await res.json();
    if (data?.error) {
      console.error("debug_token error:", data.error);
      return [];
    }
    console.log("Token info:", {
      type: data?.data?.type,
      app_id: data?.data?.app_id,
      profile_id: data?.data?.profile_id,
      scopes: data?.data?.scopes,
    });
    return (data?.data?.scopes as string[]) ?? [];
  } catch (e) {
    console.error("debug_token failed:", e);
    return [];
  }
}

// Resolve a Page access token from a (possibly) user access token
async function getPageAccessToken(pageId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pageId}?fields=access_token&access_token=${token}`
    );
    const data = await res.json();
    if (data?.access_token) return data.access_token as string;
    if (data?.error) console.error("Page token lookup error:", data.error);

    // Fallback: search the user's pages list
    const listRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/me/accounts?fields=id,name,access_token&limit=100&access_token=${token}`
    );
    const listData = await listRes.json();
    if (listData?.error) console.error("me/accounts error:", listData.error);
    console.log("Pages found:", (listData?.data ?? []).map((p: { id: string; name?: string }) => `${p.id}:${p.name}`));
    const match = listData?.data?.find((p: { id: string }) => p.id === pageId);
    return match?.access_token ?? null;
  } catch (e) {
    console.error("Failed to resolve page access token:", e);
    return null;
  }
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platform, videoUrl, mediaUrls, caption, mediaType = "video" } = await req.json();

    console.log("Meta publish request:", { userId, platform, mediaType, hasMediaUrls: !!mediaUrls, caption: caption?.substring(0, 50) });

    if (!userId || !platform || !videoUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get connected account info
    const { data: account, error: accountError } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", platform)
      .single();

    if (accountError || !account) {
      console.error("Account not found:", accountError);
      return new Response(
        JSON.stringify({ error: "Conta não conectada. Conecte sua conta nas configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!account.is_connected || !account.access_token) {
      return new Response(
        JSON.stringify({ error: "Conta não está conectada corretamente. Reconecte sua conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: We don't pre-check token_expires_at here because it may be inaccurate
    // for manually-saved tokens. Meta API will return error 190 if token is actually expired.


    let accessToken = account.access_token;
    const pageId = account.page_id;
    const instagramAccountId = account.instagram_account_id;


    // Validate required IDs based on platform
    if (platform === "instagram" && !instagramAccountId) {
      return new Response(
        JSON.stringify({ error: "Instagram Account ID não encontrado. Reconecte sua conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (platform === "facebook" && !pageId) {
      return new Response(
        JSON.stringify({ error: "Facebook Page ID não encontrado. Reconecte sua conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Facebook/Instagram publishing requires a PAGE access token, not a user token.
    // If the saved token is a user token, exchange it for the Page token.
    const scopes = await getTokenScopes(accessToken);
    if (pageId && scopes.includes("pages_show_list")) {
      const pageToken = await getPageAccessToken(pageId, accessToken);
      if (pageToken) {
        accessToken = pageToken;
        console.log("Using Page access token for publishing");
      } else {
        console.log("Could not resolve Page access token; using saved token");
      }
    }


    if (platform === "facebook" && scopes.length > 0 && !scopes.includes("pages_manage_posts")) {
      return new Response(
        JSON.stringify({
          error:
            "O token conectado não possui a permissão 'pages_manage_posts' (necessária para publicar na Página). Gere um novo token no Graph API Explorer marcando pages_manage_posts, pages_read_engagement e pages_show_list, e reconecte em Perfil → Facebook → Reconectar.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    let result;


    // Check if it's a carousel (multiple images)
    const isCarousel = mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 1 && mediaType === "image";

    if (platform === "instagram") {
      if (isCarousel) {
        result = await publishCarouselToInstagram(instagramAccountId, accessToken, mediaUrls, caption);
      } else if (mediaType === "image") {
        result = await publishImageToInstagram(instagramAccountId, accessToken, videoUrl, caption);
      } else {
        result = await publishToInstagram(instagramAccountId, accessToken, videoUrl, caption);
      }
    } else if (platform === "facebook") {
      if (isCarousel) {
        result = await publishCarouselToFacebook(pageId, accessToken, mediaUrls, caption);
      } else if (mediaType === "image") {
        result = await publishImageToFacebook(pageId, accessToken, videoUrl, caption);
      } else {
        result = await publishToFacebook(pageId, accessToken, videoUrl, caption);
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Plataforma não suportada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in meta-publish:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============= VIDEO PUBLISHING =============

async function publishToInstagram(
  instagramAccountId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  console.log("Publishing video to Instagram...");
  
  // Step 1: Create media container for video (Reel)
  const containerUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media`;
  const containerParams = new URLSearchParams({
    video_url: videoUrl,
    caption: caption || "",
    media_type: "REELS",
    access_token: accessToken,
  });

  console.log("Creating Instagram video container...");
  const containerResponse = await fetch(containerUrl, {
    method: "POST",
    body: containerParams,
  });
  const containerData = await containerResponse.json();

  if (containerData.error) {
    console.error("Error creating container:", containerData.error);
    throw new Error(parseMetaError(containerData.error));
  }

  const containerId = containerData.id;
  console.log("Container created:", containerId);

  // Step 2: Wait for video processing and publish
  let status = "IN_PROGRESS";
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max wait

  while (status === "IN_PROGRESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const statusUrl = `https://graph.facebook.com/${API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    
    if (statusData.error) {
      console.error("Error checking status:", statusData.error);
      throw new Error(parseMetaError(statusData.error));
    }
    
    status = statusData.status_code;
    console.log("Container status:", status, "attempt:", attempts + 1);
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error(`Processamento do vídeo falhou ou expirou. Status: ${status}`);
  }

  // Step 3: Publish the container
  const publishUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  console.log("Publishing Instagram video...");
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error("Error publishing:", publishData.error);
    throw new Error(parseMetaError(publishData.error));
  }

  console.log("Instagram video publish success:", publishData.id);
  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  console.log("Publishing video to Facebook via Reels API...");

  // Step 1: Start an upload session
  const startRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels`,
    {
      method: "POST",
      body: new URLSearchParams({
        upload_phase: "start",
        access_token: accessToken,
      }),
    }
  );
  const startData = await startRes.json();

  if (startData.error) {
    console.error("Error starting Facebook reel upload:", startData.error);
    throw new Error(parseMetaError(startData.error));
  }

  const videoId = startData.video_id;
  const uploadUrl = startData.upload_url;
  console.log("Reel upload session started:", videoId);

  // Step 2: Send the hosted file to the upload URL
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_url: videoUrl,
    },
  });
  const uploadData = await uploadRes.json().catch(() => ({}));

  if (uploadData?.error || uploadData?.success === false) {
    console.error("Error uploading reel file:", uploadData);
    throw new Error(parseMetaError(uploadData?.error ?? { message: "Falha ao enviar o vídeo para o Facebook" }));
  }
  console.log("Reel file uploaded");

  // Step 3: Finish and publish
  const finishRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels?` +
      new URLSearchParams({
        upload_phase: "finish",
        video_id: videoId,
        video_state: "PUBLISHED",
        description: caption || "",
        access_token: accessToken,
      }),
    { method: "POST" }
  );
  const finishData = await finishRes.json();

  if (finishData.error) {
    console.error("Error publishing Facebook reel:", finishData.error);
    throw new Error(parseMetaError(finishData.error));
  }

  console.log("Facebook video publish success:", videoId);
  return { success: true, postId: videoId, platform: "facebook" };
}


// ============= IMAGE PUBLISHING =============

async function publishImageToInstagram(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  console.log("Publishing image to Instagram...");
  
  // Step 1: Create media container for image
  const containerUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media`;
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption: caption || "",
    access_token: accessToken,
  });

  console.log("Creating Instagram image container...");
  const containerResponse = await fetch(containerUrl, {
    method: "POST",
    body: containerParams,
  });
  const containerData = await containerResponse.json();

  if (containerData.error) {
    console.error("Error creating image container:", containerData.error);
    throw new Error(parseMetaError(containerData.error));
  }

  const containerId = containerData.id;
  console.log("Image container created:", containerId);

  // Step 2: Wait for image processing (images also need async processing)
  let status = "IN_PROGRESS";
  let attempts = 0;
  const maxAttempts = 10; // 30 seconds max wait for images

  while (status === "IN_PROGRESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    const statusUrl = `https://graph.facebook.com/${API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    
    if (statusData.error) {
      console.error("Error checking image status:", statusData.error);
      throw new Error(parseMetaError(statusData.error));
    }
    
    status = statusData.status_code;
    console.log("Image container status:", status, "attempt:", attempts + 1);
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error(`Processamento da imagem falhou ou expirou. Status: ${status}`);
  }

  // Step 3: Publish the container
  const publishUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  console.log("Publishing Instagram image...");
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error("Error publishing image:", publishData.error);
    throw new Error(parseMetaError(publishData.error));
  }

  console.log("Instagram image publish success:", publishData.id);
  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishImageToFacebook(
  pageId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  console.log("Publishing image to Facebook...");
  
  // Upload photo to Facebook page
  const uploadUrl = `https://graph.facebook.com/${API_VERSION}/${pageId}/photos`;
  const uploadParams = new URLSearchParams({
    url: imageUrl,
    caption: caption || "",
    access_token: accessToken,
  });

  console.log("Uploading image to Facebook...");
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: uploadParams,
  });
  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    console.error("Error uploading image to Facebook:", uploadData.error);
    throw new Error(parseMetaError(uploadData.error));
  }

  console.log("Facebook image publish success:", uploadData.id);
  return { success: true, postId: uploadData.id, platform: "facebook" };
}

// ============= CAROUSEL PUBLISHING =============

async function publishCarouselToInstagram(
  instagramAccountId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  console.log(`Publishing carousel with ${imageUrls.length} images to Instagram...`);
  
  // Step 1: Create a container for each image (as carousel item)
  const childContainerIds: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    console.log(`Creating carousel item ${i + 1}/${imageUrls.length}...`);
    
    const containerUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media`;
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: "true",
      access_token: accessToken,
    });

    const containerResponse = await fetch(containerUrl, {
      method: "POST",
      body: containerParams,
    });
    const containerData = await containerResponse.json();

    if (containerData.error) {
      console.error(`Error creating carousel item ${i + 1}:`, containerData.error);
      throw new Error(parseMetaError(containerData.error));
    }

    childContainerIds.push(containerData.id);
    console.log(`Carousel item ${i + 1} created:`, containerData.id);
  }

  // Step 2: Create the carousel container with all children
  console.log("Creating carousel container...");
  const carouselUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media`;
  const carouselParams = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
    caption: caption || "",
    access_token: accessToken,
  });

  const carouselResponse = await fetch(carouselUrl, {
    method: "POST",
    body: carouselParams,
  });
  const carouselData = await carouselResponse.json();

  if (carouselData.error) {
    console.error("Error creating carousel container:", carouselData.error);
    throw new Error(parseMetaError(carouselData.error));
  }

  const carouselId = carouselData.id;
  console.log("Carousel container created:", carouselId);

  // Step 3: Publish the carousel
  const publishUrl = `https://graph.facebook.com/${API_VERSION}/${instagramAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: carouselId,
    access_token: accessToken,
  });

  console.log("Publishing Instagram carousel...");
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error("Error publishing carousel:", publishData.error);
    throw new Error(parseMetaError(publishData.error));
  }

  console.log("Instagram carousel publish success:", publishData.id);
  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishCarouselToFacebook(
  pageId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  console.log(`Publishing carousel with ${imageUrls.length} images to Facebook...`);
  
  // Step 1: Upload each photo with published=false to get photo IDs
  const photoIds: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    console.log(`Uploading photo ${i + 1}/${imageUrls.length}...`);
    
    const uploadUrl = `https://graph.facebook.com/${API_VERSION}/${pageId}/photos`;
    const uploadParams = new URLSearchParams({
      url: imageUrl,
      published: "false",
      access_token: accessToken,
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: uploadParams,
    });
    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      console.error(`Error uploading photo ${i + 1}:`, uploadData.error);
      throw new Error(parseMetaError(uploadData.error));
    }

    photoIds.push(uploadData.id);
    console.log(`Photo ${i + 1} uploaded:`, uploadData.id);
  }

  // Step 2: Create a feed post with all photos attached
  console.log("Creating Facebook multi-photo post...");
  const feedUrl = `https://graph.facebook.com/${API_VERSION}/${pageId}/feed`;
  
  // Build the attached_media parameter
  const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
  
  const feedResponse = await fetch(feedUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: caption || "",
      attached_media: attachedMedia,
      access_token: accessToken,
    }),
  });
  const feedData = await feedResponse.json();

  if (feedData.error) {
    console.error("Error creating multi-photo post:", feedData.error);
    throw new Error(parseMetaError(feedData.error));
  }

  console.log("Facebook carousel publish success:", feedData.id);
  return { success: true, postId: feedData.id, platform: "facebook" };
}
