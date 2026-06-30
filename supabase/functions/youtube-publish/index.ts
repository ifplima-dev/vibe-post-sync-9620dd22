import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error("Falha ao renovar token YouTube. Reconecte sua conta.");
  }
  return { accessToken: data.access_token as string, expiresIn: (data.expires_in as number) || 3600 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, videoUrl, title, description, privacyStatus = "public" } = await req.json();

    if (!userId || !videoUrl) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: userId, videoUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: account, error: accErr } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .eq("is_connected", true)
      .maybeSingle();

    if (accErr || !account) {
      throw new Error("Conta YouTube não conectada");
    }

    let accessToken = account.access_token as string;
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;

    // Refresh if expired or expiring in next 60s
    if (!accessToken || expiresAt - Date.now() < 60_000) {
      if (!account.refresh_token) {
        throw new Error("Token YouTube expirado e refresh token ausente. Reconecte sua conta.");
      }
      console.log("Refreshing YouTube access token...");
      const refreshed = await refreshAccessToken(account.refresh_token);
      accessToken = refreshed.accessToken;
      await supabase.from("connected_accounts").update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      }).eq("id", account.id);
    }

    // Download video bytes
    console.log("Downloading video from:", videoUrl);
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error(`Falha ao baixar vídeo: ${videoResp.status}`);
    const videoBlob = await videoResp.blob();
    const videoSize = videoBlob.size;
    const contentType = videoResp.headers.get("content-type") || "video/*";
    console.log("Video size:", videoSize, "type:", contentType);

    const metadata = {
      snippet: {
        title: (title || "Vídeo").substring(0, 100),
        description: (description || "").substring(0, 5000),
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus, // "public" | "unlisted" | "private"
        selfDeclaredMadeForKids: false,
      },
    };

    // Resumable upload: step 1 - initiate
    const initResp = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoSize),
          "X-Upload-Content-Type": contentType,
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResp.ok) {
      const errText = await initResp.text();
      console.error("YouTube init upload error:", errText);
      throw new Error(`Falha ao iniciar upload no YouTube: ${errText}`);
    }

    const uploadUrl = initResp.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube não retornou URL de upload");

    // Step 2 - upload bytes
    console.log("Uploading video bytes to YouTube...");
    const uploadResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(videoSize),
      },
      body: videoBlob,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      console.error("YouTube upload error:", errText);
      throw new Error(`Falha no upload do vídeo: ${errText}`);
    }

    const result = await uploadResp.json();
    console.log("YouTube upload success, video id:", result.id);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: result.id,
        url: `https://youtube.com/watch?v=${result.id}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("youtube-publish error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro ao publicar no YouTube" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
