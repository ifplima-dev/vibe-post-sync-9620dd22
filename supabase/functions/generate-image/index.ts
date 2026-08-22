import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  prompt: z.string().min(3).max(2000),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"),
  quality: z.enum(["low", "medium", "high"]).default("low"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Prompt da imagem inválido (mínimo 3 caracteres)." }, 400);
    }
    const { prompt, size, quality } = parsed.data;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!lovableKey && !openaiKey) {
      return json({ error: "Nenhuma chave de IA configurada no backend." }, 500);
    }

    const callGateway = () =>
      fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-2",
          prompt,
          size,
          quality,
          n: 1,
        }),
      });

    const callOpenAI = () =>
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt,
          size,
          quality,
          n: 1,
        }),
      });

    let provider = "lovable";
    let response: Response | null = null;

    if (lovableKey) {
      response = await callGateway();
      if (!response.ok && openaiKey && [401, 402, 403, 429, 500, 502, 503].includes(response.status)) {
        const gatewayText = await response.text().catch(() => "");
        console.error("Gateway de imagem falhou, usando OPENAI_API_KEY", response.status, gatewayText);
        response = await callOpenAI();
        provider = "openai";
      }
    } else {
      response = await callOpenAI();
      provider = "openai";
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Erro na geração de imagem", provider, response.status, errorText);

      let message = `Falha na geração da imagem (${response.status}).`;
      try {
        const body = JSON.parse(errorText);
        if (body?.error?.message) message = body.error.message as string;
        else if (body?.message) message = body.message as string;
      } catch { /* mantém mensagem genérica */ }

      if (response.status === 402) {
        message = "Créditos de IA esgotados. Adicione créditos ou configure sua chave da OpenAI.";
      }
      if (response.status === 403) {
        message = "Uso de IA bloqueado no workspace.";
      }

      return json({ error: message }, response.status === 429 ? 429 : 502);
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return json({ error: "A IA não retornou nenhuma imagem. Tente novamente." }, 502);
    }

    return json({ image: `data:image/png;base64,${b64}`, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("generate-image error:", message);
    return json({ error: message }, 500);
  }
});
