import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function getMediaTypeFromUrl(fileUrl: string): "video" | "image" {
  const lowerUrl = fileUrl.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext)) ? "image" : "video";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🕐 Processing scheduled posts...");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch posts that are due for publishing
    const now = new Date().toISOString();
    const { data: pendingPosts, error: fetchError } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_date", now);

    if (fetchError) {
      console.error("Error fetching posts:", fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${pendingPosts?.length || 0} posts to process`);

    if (!pendingPosts || pendingPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const post of pendingPosts) {
      console.log(`📤 Processing post ${post.id}: "${post.title}"`);
      
      // Use media_type from DB if available, otherwise detect from URL
      const mediaType = post.media_type || getMediaTypeFromUrl(post.video_file_url);
      
      // Check if it's a carousel (multiple media_urls)
      const isCarousel = post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 1;
      
      console.log(`  → Media type: ${mediaType}, Carousel: ${isCarousel}, URLs: ${isCarousel ? post.media_urls.length : 1}`);
      
      // Update status to publishing
      await supabase
        .from("scheduled_posts")
        .update({ status: "publishing" })
        .eq("id", post.id);

      const platformResults = [];
      let hasError = false;

      for (const platform of post.platforms) {
        try {
          console.log(`  → Publishing ${mediaType} to ${platform}...`);
          const result = await publishToMeta(
            supabase,
            post.user_id,
            platform,
            post.video_file_url,
            isCarousel ? post.media_urls : null,
            post.title + (post.description ? "\n\n" + post.description : ""),
            mediaType
          );
          platformResults.push({ platform, success: true, postId: result.postId });
          console.log(`  ✅ Published to ${platform}: ${result.postId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`  ❌ Failed to publish to ${platform}:`, errorMessage);
          platformResults.push({ platform, success: false, error: errorMessage });
          hasError = true;
        }
      }

      // Update final status
      const finalStatus = hasError ? "failed" : "published";
      await supabase
        .from("scheduled_posts")
        .update({ status: finalStatus })
        .eq("id", post.id);

      console.log(`📌 Post ${post.id} final status: ${finalStatus}`);
      results.push({ postId: post.id, status: finalStatus, platforms: platformResults });
    }

    console.log(`✅ Finished processing ${results.length} posts`);

    return new Response(
      JSON.stringify({ message: "Posts processed", processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error processing scheduled posts:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface ConnectedAccount {
  is_connected: boolean;
  access_token: string | null;
  page_id: string | null;
  instagram_account_id: string | null;
}

async function publishToMeta(
  supabaseClient: any,
  userId: string,
  platform: string,
  primaryUrl: string,
  mediaUrls: string[] | null,
  caption: string,
  mediaType: "video" | "image"
) {
  // Get connected account info
  const { data: account, error: accountError } = await supabaseClient
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  if (accountError || !account) {
    throw new Error(`Account not connected for ${platform}`);
  }

  const typedAccount = account as ConnectedAccount;

  if (!typedAccount.is_connected || !typedAccount.access_token) {
    throw new Error(`Account not properly connected for ${platform}`);
  }

  const accessToken = typedAccount.access_token;
  const pageId = typedAccount.page_id;
  const instagramAccountId = typedAccount.instagram_account_id;

  // Check if it's a carousel
  const isCarousel = mediaUrls && mediaUrls.length > 1 && mediaType === "image";

  if (platform === "instagram") {
    if (isCarousel) {
      return await publishCarouselToInstagram(instagramAccountId!, accessToken, mediaUrls, caption);
    } else if (mediaType === "image") {
      return await publishImageToInstagram(instagramAccountId!, accessToken, primaryUrl, caption);
    } else {
      return await publishVideoToInstagram(instagramAccountId!, accessToken, primaryUrl, caption);
    }
  } else if (platform === "facebook") {
    if (isCarousel) {
      return await publishCarouselToFacebook(pageId!, accessToken, mediaUrls, caption);
    } else if (mediaType === "image") {
      return await publishImageToFacebook(pageId!, accessToken, primaryUrl, caption);
    } else {
      return await publishVideoToFacebook(pageId!, accessToken, primaryUrl, caption);
    }
  } else {
    throw new Error(`Platform ${platform} not supported`);
  }
}

// ============= VIDEO PUBLISHING =============

async function publishVideoToInstagram(
  instagramAccountId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  console.log("    Publishing video to Instagram...");
  
  // Step 1: Create media container for video (Reel)
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
  const containerParams = new URLSearchParams({
    video_url: videoUrl,
    caption: caption || "",
    media_type: "REELS",
    access_token: accessToken,
  });

  const containerResponse = await fetch(containerUrl, {
    method: "POST",
    body: containerParams,
  });
  const containerData = await containerResponse.json();

  if (containerData.error) {
    throw new Error(containerData.error.message);
  }

  const containerId = containerData.id;
  console.log("    Container created:", containerId);

  // Step 2: Wait for video processing
  let status = "IN_PROGRESS";
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max wait

  while (status === "IN_PROGRESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`;
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    
    status = statusData.status_code;
    console.log("    Container status:", status, "attempt:", attempts + 1);
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

  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    throw new Error(publishData.error.message);
  }

  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishVideoToFacebook(
  pageId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
) {
  console.log("    Publishing video to Facebook...");
  
  const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
  const uploadParams = new URLSearchParams({
    file_url: videoUrl,
    description: caption || "",
    access_token: accessToken,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: uploadParams,
  });
  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    throw new Error(uploadData.error.message);
  }

  return { success: true, postId: uploadData.id, platform: "facebook" };
}

// ============= IMAGE PUBLISHING =============

async function publishImageToInstagram(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  console.log("    Publishing image to Instagram...");
  
  // Step 1: Create media container for image
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption: caption || "",
    access_token: accessToken,
  });

  const containerResponse = await fetch(containerUrl, {
    method: "POST",
    body: containerParams,
  });
  const containerData = await containerResponse.json();

  if (containerData.error) {
    throw new Error(containerData.error.message);
  }

  const containerId = containerData.id;
  console.log("    Image container created:", containerId);

  // Step 2: Publish the container (images don't need async processing)
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    throw new Error(publishData.error.message);
  }

  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishImageToFacebook(
  pageId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  console.log("    Publishing image to Facebook...");
  
  const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const uploadParams = new URLSearchParams({
    url: imageUrl,
    caption: caption || "",
    access_token: accessToken,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: uploadParams,
  });
  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    throw new Error(uploadData.error.message);
  }

  return { success: true, postId: uploadData.id, platform: "facebook" };
}

// ============= CAROUSEL PUBLISHING =============

async function publishCarouselToInstagram(
  instagramAccountId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  console.log(`    Publishing carousel with ${imageUrls.length} images to Instagram...`);
  
  // Step 1: Create a container for each image (as carousel item)
  const childContainerIds: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    console.log(`    Creating carousel item ${i + 1}/${imageUrls.length}...`);
    
    const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
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
      console.error(`    Error creating carousel item ${i + 1}:`, containerData.error);
      throw new Error(containerData.error.message);
    }

    childContainerIds.push(containerData.id);
    console.log(`    Carousel item ${i + 1} created:`, containerData.id);
  }

  // Step 2: Create the carousel container with all children
  console.log("    Creating carousel container...");
  const carouselUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
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
    console.error("    Error creating carousel container:", carouselData.error);
    throw new Error(carouselData.error.message);
  }

  const carouselId = carouselData.id;
  console.log("    Carousel container created:", carouselId);

  // Step 3: Publish the carousel
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: carouselId,
    access_token: accessToken,
  });

  console.log("    Publishing Instagram carousel...");
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
  });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error("    Error publishing carousel:", publishData.error);
    throw new Error(publishData.error.message);
  }

  console.log("    Instagram carousel publish success:", publishData.id);
  return { success: true, postId: publishData.id, platform: "instagram" };
}

async function publishCarouselToFacebook(
  pageId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  console.log(`    Publishing carousel with ${imageUrls.length} images to Facebook...`);
  
  // Step 1: Upload each photo with published=false to get photo IDs
  const photoIds: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    console.log(`    Uploading photo ${i + 1}/${imageUrls.length}...`);
    
    const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
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
      console.error(`    Error uploading photo ${i + 1}:`, uploadData.error);
      throw new Error(uploadData.error.message);
    }

    photoIds.push(uploadData.id);
    console.log(`    Photo ${i + 1} uploaded:`, uploadData.id);
  }

  // Step 2: Create a feed post with all photos attached
  console.log("    Creating Facebook multi-photo post...");
  const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  
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
    console.error("    Error creating multi-photo post:", feedData.error);
    throw new Error(feedData.error.message);
  }

  console.log("    Facebook carousel publish success:", feedData.id);
  return { success: true, postId: feedData.id, platform: "facebook" };
}
