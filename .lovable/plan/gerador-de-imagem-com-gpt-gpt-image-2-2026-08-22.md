# Gerador de imagem com GPT (gpt-image-2)

Vou adicionar o GPT Image como motor de imagem, com qualidade baixa para economizar.

## O que muda para você

- No gerador, o seletor de motor passa a ser apenas **GPT Image (OpenAI)** ao lado de Flux / Turbo / Kontext.
- GPT Image, a imagem é gerada pela OpenAI em 1024x1024, qualidade "low" (mais barata).
- A frase de impacto, o recorte por formato (1:1, 4:5, 9:16) e o botão "Usar nesta postagem" continuam funcionando igual.
  Vai usar apenas o gpt

## Detalhes técnicos

1. Nova edge function `generate-image`:
  - Valida o corpo com Zod: `prompt` (obrigatório), `size` (default `1024x1024`), `quality` (default `low`).
  - Chamada 1 (padrão): `POST https://ai.gateway.lovable.dev/v1/images/generations` com `LOVABLE_API_KEY` e corpo `{ model: "openai/gpt-image-2", prompt, size: "1024x1024", quality: "low", n: 1 }` (sem `stream` — resposta JSON única, mais simples para devolver ao cliente).
  - Chamada 2 (reserva): se o gateway retornar 401/402/403/429/5xx e `OPENAI_API_KEY` existir, repete em `https://api.openai.com/v1/images/generations` com `model: "gpt-image-2"`, `quality: "low"`, `size: "1024x1024"`.
  - Retorna `{ image: "data:image/png;base64,..." , provider }`; em falha terminal retorna erro com mensagem clara (sem loop de retries).
  - Sem `AbortSignal.timeout` — geração pode levar dezenas de segundos.
2. `src/pages/Generate.tsx`:
  - `EngineKey` ganha `"gpt-image"`; quando selecionado, em vez de montar URL do Pollinations, chama `supabase.functions.invoke("generate-image", { body: { prompt: imagePrompt } })` e usa o data URL retornado em `imageUrl`.
  - Estado de carregamento reaproveitado (blur no preview) e toast de erro com fallback para Pollinations.
  - O canvas já lê de `imageUrl`; data URL não sofre restrição de CORS, então o overlay de texto e o `toBlob` seguem funcionando.
3. Teste da função após criar: invocar uma vez e confirmar que a imagem volta.