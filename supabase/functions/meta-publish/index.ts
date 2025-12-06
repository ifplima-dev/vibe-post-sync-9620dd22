import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, platform, videoUrl, caption, mediaType = "video" } = await req.json();

    console.log("Meta publish request:", { userId, platform, mediaType, caption: caption?.substring(0, 50) });

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
        JSON.stringify({ error: "Account not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!account.is_connected || !account.access_token) {
      return new Response(
        JSON.stringify({ error: "Account not properly connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = account.access_token;
    const pageId = account.page_id;
    const instagramAccountId = account.instagram_account_id;

    let result;

    if (platform === "instagram") {
      result = mediaType === "image"
        ? await publishImageToInstagram(instagramAccountId, accessToken, videoUrl, caption)
        : await publishToInstagram(instagramAccountId, accessToken, videoUrl, caption);
    } else if (platform === "facebook") {
      result = mediaType === "image"
        ? await publishImageToFacebook(pageId, accessToken, videoUrl, caption)
        : await publishToFacebook(pageId, accessToken, videoUrl, caption);
    } else {
      return new Response(
        JSON.stringify({ error: "Platform not supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
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
    throw new Error(containerData.error.message);
  }

  const containerId = containerData.id;
  console.log("Container created:", containerId);

  // Step 2: Wait for video processing and publish
  let status = "IN_PROGRESS";
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max wait

  while (status === "IN_PROGRESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    
    status = statusData.status_code;
    console.log("Container status:", status, "attempt:", attempts + 1);
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error(`Video processing failed or timed out. Status: ${status}`);
  }

  // Step 3: Publish the container
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`;
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
    throw new Error(publishData.error.message);
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
  console.log("Publishing video to Facebook...");
  
  // Upload video to Facebook page
  const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
  const uploadParams = new URLSearchParams({
    file_url: videoUrl,
    description: caption || "",
    access_token: accessToken,
  });

  console.log("Uploading video to Facebook...");
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: uploadParams,
  });
  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    console.error("Error uploading to Facebook:", uploadData.error);
    throw new Error(uploadData.error.message);
  }

  console.log("Facebook video publish success:", uploadData.id);
  return { success: true, postId: uploadData.id, platform: "facebook" };
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
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
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
    throw new Error(containerData.error.message);
  }

  const containerId = containerData.id;
  console.log("Image container created:", containerId);

  // Step 2: Publish the container (images don't need async processing like videos)
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`;
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
    throw new Error(publishData.error.message);
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
  const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
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
    throw new Error(uploadData.error.message);
  }

  console.log("Facebook image publish success:", uploadData.id);
  return { success: true, postId: uploadData.id, platform: "facebook" };
}
