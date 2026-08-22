# Gerador de Postagens por Tema

Você digita um tema (ex: "café da manhã saudável") e o app gera automaticamente uma imagem e uma legenda pronta, com botão para levar tudo direto para o agendamento.

## Como vai funcionar

1. Nova página **Gerador** (rota `/generate`), acessível pela navegação inferior.
2. Campo de tema + opções rápidas: tom da legenda (descontraído, profissional, vendas), formato da imagem (1:1, 4:5, 9:16) e idioma português.
3. Botão **Gerar**:
   - Imagem via **Pollinations** (gratuito, sem chave) — o tema é transformado em um prompt visual melhorado antes de gerar.
   - Legenda + hashtags via IA de texto (backend), respeitando o limite de 2.200 caracteres do Instagram.
4. Resultado mostrado em preview com a imagem no formato escolhido, legenda editável e botões **Regenerar imagem**, **Regenerar legenda**.
5. Botão **Usar nesta postagem**: salva a imagem no storage, e abre a tela de Upload já preenchida com a imagem, título e descrição — daí você escolhe plataformas e data como já faz hoje.

## Detalhes técnicos

- **Edge function `generate-post`** (nova):
  - Valida entrada com Zod (tema obrigatório, tom, formato).
  - Chama a IA de texto pelo AI Gateway (`LOVABLE_API_KEY`, sem chave nova do usuário) para retornar JSON: `imagePrompt`, `title`, `caption`, `hashtags[]`.
  - Não gera a imagem: devolve apenas o `imagePrompt` (Pollinations é chamado direto pelo cliente via URL).
  - Erros do gateway (402/429/4xx) são repassados com mensagem clara na UI.
  - CORS via `npm:@supabase/supabase-js@2/cors`; JWT validado em código.
- **Imagem Pollinations**: `https://image.pollinations.ai/prompt/{prompt}?width=..&height=..&nologo=true&seed=..` com dimensões conforme o formato (1024x1024, 1024x1280, 1024x1820). "Regenerar imagem" só troca o `seed`.
- **Upload no storage**: ao clicar em "Usar nesta postagem", o cliente faz `fetch` da URL da Pollinations, converte para `File` (.jpg), comprime com o utilitário existente (`compressImage`) e envia para o bucket `videos` no padrão obrigatório `user_id/uuid.jpg`.
- **Handoff para o Upload**: `navigate("/upload", { state: { generated: { url, title, description, ratio } } })`; `Upload.tsx` recebe via `useLocation()` num `useEffect` e popula `mediaPreviews`, `mediaFiles`/URL já enviada, `title`, `description` e `selectedRatio`. Nenhuma mudança na lógica de publicação/agendamento existente.
- **Visual**: mesmo tema escuro com gradientes e glassmorphism já usado, preview quadrado compacto no estilo Instagram.

## Fora do escopo

- Geração de vídeo.
- Carrossel gerado por IA (uma imagem por geração nesta versão).
