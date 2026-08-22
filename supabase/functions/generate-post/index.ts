import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  theme: z.string().min(2).max(300),
  tone: z.enum(["descontraido", "profissional", "vendas"]).default("descontraido"),
  ratio: z.enum(["1:1", "4:5", "9:16"]).default("1:1"),
});

const TONE_LABEL: Record<string, string> = {
  descontraido: "descontraído, leve e divertido, com emojis",
  profissional: "profissional, claro e confiável, poucos emojis",
  vendas: "persuasivo e focado em conversão, com chamada para ação forte",
};

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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY não configurada no backend." }, 500);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Informe um tema com pelo menos 2 caracteres." }, 400);
    }

    const { theme, tone, ratio } = parsed.data;

    const systemPrompt = `Você é um social media brasileiro especialista em Instagram, Facebook e TikTok.
Responda SEMPRE em JSON válido com as chaves exatas: imagePrompt, title, caption, hashtags.

Regras:
- "imagePrompt": prompt em INGLÊS, detalhado (câmera, luz, cores, composição, estilo fotográfico), para gerar uma imagem impactante sobre o tema. Sem texto/letras na imagem. Formato ${ratio}.
- "title": título curto em português, no máximo 80 caracteres.
- "caption": legenda em português com tom ${TONE_LABEL[tone]}, entre 300 e 700 caracteres, quebrada em pequenos parágrafos, terminando com uma chamada para ação. NÃO inclua hashtags na caption.
- "hashtags": array com 8 a 12 hashtags em português relevantes, cada uma começando com #.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tema da postagem: ${theme}. Retorne apenas o json.` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error", aiResponse.status, errorText);

      if (aiResponse.status === 402) {
        return json(
          { error: "Créditos de IA esgotados. Adicione créditos no workspace para continuar gerando." },
          402,
        );
      }
      if (aiResponse.status === 429) {
        return json({ error: "Muitas solicitações em sequência. Aguarde alguns segundos e tente de novo." }, 429);
      }
      if (aiResponse.status === 403) {
        return json({ error: "Uso de IA bloqueado nas configurações do workspace." }, 403);
      }
      return json({ error: `Falha na geração de texto (${aiResponse.status}).` }, 502);
    }

    const aiData = await aiResponse.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";

    let result: { imagePrompt?: string; title?: string; caption?: string; hashtags?: unknown };
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return json({ error: "A IA respondeu num formato inesperado. Tente gerar de novo." }, 502);
      }
      result = JSON.parse(match[0]);
    }

    const hashtags = Array.isArray(result.hashtags)
      ? result.hashtags
          .filter((h): h is string => typeof h === "string")
          .map((h) => (h.startsWith("#") ? h : `#${h.replace(/\s+/g, "")}`))
          .slice(0, 12)
      : [];

    const title = (result.title ?? theme).toString().slice(0, 80);
    const caption = (result.caption ?? "").toString().slice(0, 1800);
    const imagePrompt = (result.imagePrompt ?? theme).toString().slice(0, 600);

    return json({ imagePrompt, title, caption, hashtags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("generate-post error:", message);
    return json({ error: message }, 500);
  }
});
