import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const SettingsSchema = z.object({
  enabled: z.boolean().default(true),
  captionLength: z.enum(["curta", "media", "longa"]).default("media"),
  useEmoji: z.boolean().default(true),
  hashtagCount: z.number().int().min(0).max(20).default(10),
  cta: z.string().max(140).optional(),
  extraInstructions: z.string().max(500).optional(),
});

const BodySchema = z.object({
  theme: z.string().min(2).max(300),
  tone: z.enum(["descontraido", "profissional", "vendas"]).default("descontraido"),
  ratio: z.enum(["1:1", "4:5", "9:16"]).default("1:1"),
  style: z.enum(["ilustracao", "pintura", "foto"]).default("ilustracao"),
  settings: SettingsSchema.optional(),
});

const LENGTH_BRIEF: Record<string, string> = {
  curta: "entre 120 e 250 caracteres",
  media: "entre 300 e 700 caracteres",
  longa: "entre 800 e 1400 caracteres",
};


const STYLE_BRIEF: Record<string, string> = {
  ilustracao:
    "cinematic digital illustration, painterly concept-art style, warm golden hour light, dramatic god rays, rich amber and teal palette, symbolic storytelling composition, highly detailed, emotional and inspirational",
  pintura:
    "classical oil painting, thick expressive brush strokes, chiaroscuro lighting, warm renaissance palette, canvas texture, dramatic and reverent atmosphere",
  foto:
    "photorealistic editorial photograph, natural cinematic lighting, shallow depth of field, 50mm lens, rich detail, real people and real places",
};

const NEGATIVES =
  "no text, no letters, no words, no watermark, no logo, not anime, not manga, no solo female portrait, no selfie, no close-up face only, avoid generic beauty portrait";


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

    const { theme, tone, ratio, style } = parsed.data;

    const systemPrompt = `Você é um social media brasileiro especialista em Instagram, Facebook e TikTok.
Responda SEMPRE em JSON válido com as chaves exatas: imagePrompt, title, caption, hashtags.

Regras:
- "imagePrompt": prompt em INGLÊS. Traduza e INTERPRETE o tema como uma CENA SIMBÓLICA e narrativa (pessoas, ambiente, objetos, metáforas visuais que representem a mensagem), nunca um retrato genérico. Descreva composição, luz, cores e emoção. Estilo obrigatório: ${STYLE_BRIEF[style]}. Formato ${ratio}. Finalize com: ${NEGATIVES}.
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

      // 402 (sem créditos) e 403 (IA bloqueada): não travam o gerador.
      // Devolvemos uma legenda simples gerada localmente + prompt de imagem,
      // para o Pollinations (grátis) continuar funcionando.
      if (aiResponse.status === 402 || aiResponse.status === 403) {
        const clean = theme.trim();
        const slug = clean
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4);
        const captionBase: Record<string, string> = {
          descontraido: `${clean} do jeito que a gente gosta ✨\n\nSalva esse post e conta aqui nos comentários o que você achou!`,
          profissional: `${clean}.\n\nConteúdo pensado para quem busca resultado com consistência. Acompanhe para mais.`,
          vendas: `${clean} 🚀\n\nAproveite agora: chame no direct e garanta o seu antes que acabe!`,
        };
        return json({
          imagePrompt: `${STYLE_BRIEF[style]}, a symbolic narrative scene that visually represents this Portuguese message: "${clean}", meaningful environment with people and symbolic objects, storytelling composition, ${NEGATIVES}`,
          title: clean.slice(0, 80),
          caption: captionBase[tone] ?? captionBase.descontraido,
          hashtags: ["#" + (slug[0] ?? "post"), ...slug.slice(1).map((w) => "#" + w), "#dicas", "#inspiracao"],
          notice:
            aiResponse.status === 402
              ? "Créditos de IA esgotados: legenda gerada em modo simples. Adicione créditos para legendas com IA."
              : "Uso de IA bloqueado no workspace: legenda gerada em modo simples.",
        });
      }
      if (aiResponse.status === 429) {
        return json({ error: "Muitas solicitações em sequência. Aguarde alguns segundos e tente de novo." }, 429);
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
