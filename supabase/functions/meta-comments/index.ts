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
    const { action, userId, platform, postId, commentId, message } = await req.json();

    console.log("Meta comments request:", { action, userId, platform, postId });

    if (!userId || !platform) {
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

    if (accountError || !account || !account.is_connected) {
      return new Response(
        JSON.stringify({ error: "Account not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = account.access_token;
    let result;

    switch (action) {
      case "fetch":
        result = await fetchComments(postId, accessToken, platform);
        break;
      case "reply":
        result = await replyToComment(commentId, message, accessToken);
        break;
      case "hide":
        result = await hideComment(commentId, accessToken);
        break;
      case "delete":
        result = await deleteComment(commentId, accessToken);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in meta-comments:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchComments(postId: string, accessToken: string, platform: string) {
  console.log("Fetching comments for post:", postId);
  
  const fieldsParam = platform === "instagram" 
    ? "id,text,timestamp,username,like_count,replies{id,text,timestamp,username}"
    : "id,message,created_time,from,like_count,comments{id,message,created_time,from}";
  
  const url = `https://graph.facebook.com/v19.0/${postId}/comments?fields=${fieldsParam}&access_token=${accessToken}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.error("Error fetching comments:", data.error);
    throw new Error(data.error.message);
  }

  // Normalize comments format
  const comments = (data.data || []).map((comment: any) => ({
    id: comment.id,
    text: platform === "instagram" ? comment.text : comment.message,
    authorName: platform === "instagram" ? comment.username : comment.from?.name,
    authorId: platform === "instagram" ? null : comment.from?.id,
    createdAt: platform === "instagram" ? comment.timestamp : comment.created_time,
    likeCount: comment.like_count || 0,
    replies: (comment.replies?.data || comment.comments?.data || []).map((reply: any) => ({
      id: reply.id,
      text: platform === "instagram" ? reply.text : reply.message,
      authorName: platform === "instagram" ? reply.username : reply.from?.name,
      createdAt: platform === "instagram" ? reply.timestamp : reply.created_time,
    })),
  }));

  console.log(`Fetched ${comments.length} comments`);
  return { success: true, comments };
}

async function replyToComment(commentId: string, message: string, accessToken: string) {
  console.log("Replying to comment:", commentId);
  
  const url = `https://graph.facebook.com/v19.0/${commentId}/replies`;
  const params = new URLSearchParams({
    message: message,
    access_token: accessToken,
  });

  const response = await fetch(url, {
    method: "POST",
    body: params,
  });
  const data = await response.json();

  if (data.error) {
    console.error("Error replying to comment:", data.error);
    throw new Error(data.error.message);
  }

  console.log("Reply sent:", data.id);
  return { success: true, replyId: data.id };
}

async function hideComment(commentId: string, accessToken: string) {
  console.log("Hiding comment:", commentId);
  
  const url = `https://graph.facebook.com/v19.0/${commentId}`;
  const params = new URLSearchParams({
    is_hidden: "true",
    access_token: accessToken,
  });

  const response = await fetch(url, {
    method: "POST",
    body: params,
  });
  const data = await response.json();

  if (data.error) {
    console.error("Error hiding comment:", data.error);
    throw new Error(data.error.message);
  }

  console.log("Comment hidden");
  return { success: true };
}

async function deleteComment(commentId: string, accessToken: string) {
  console.log("Deleting comment:", commentId);
  
  const url = `https://graph.facebook.com/v19.0/${commentId}?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: "DELETE",
  });
  const data = await response.json();

  if (data.error) {
    console.error("Error deleting comment:", data.error);
    throw new Error(data.error.message);
  }

  console.log("Comment deleted");
  return { success: true };
}