# Disparador de Conteúdo Semanal

Criar uma nova página onde você lista os 7 temas da semana, escolhe horário e plataformas, e o app gera imagem + legenda para cada tema e agenda tudo automaticamente.

## Como vai funcionar

1. Nova página **/semana** ("Semana") com:
   - 7 campos de tema (Seg a Dom), preenchimento livre.
   - Data de início da semana (padrão: próxima segunda) e horário único de publicação (ex. 19:00, horário de Brasília) — com opção de horário diferente por dia.
   - Estilo da imagem (Ilustração / Pintura / Foto), modelo do Pollinations, formato (1:1, 4:5, 9:16).
   - Frase de impacto opcional por dia (mesma lógica de overlay do gerador atual).
   - Seleção de plataformas (Instagram, Facebook, YouTube, TikTok) igual à tela de upload.
2. Botão **"Gerar e agendar semana"**: para cada tema, o app chama a função de geração (legenda + prompt), respeitando suas configurações de Legendas com IA do Perfil, gera a imagem, aplica a frase de impacto, faz upload no storage e cria o post agendado.
3. A publicação em si continua com o processador de agendamentos que já existe (roda a cada minuto) — nada novo é necessário no publicador.
4. Progresso por linha: "Gerando…", "Agendado", "Erro" com botão de tentar novamente por dia. Se os créditos de IA estiverem esgotados, entra o modo simples (legenda local + imagem gratuita), como já acontece no gerador.
5. Ao final: resumo ("7 de 7 agendados") e link para a tela de Agendados, onde os posts aparecem com miniatura e podem ser editados/excluídos.

## Detalhes técnicos

- Novo componente `src/pages/WeeklyDispatch.tsx` + rota protegida em `App.tsx` e item no menu/bottom nav.
- Novo hook `src/hooks/useWeeklyDispatch.ts`: fila sequencial (um tema por vez, para não estourar rate limit), reutilizando a lógica de geração/overlay de `Generate.tsx` extraída para `src/lib/postGenerator.ts` (sem mudar o comportamento atual do gerador).
- Reuso de `generate-post` (nenhuma edge function nova), upload em `user_id/uuid.jpg` conforme a regra de storage, e inserção via `useCreateScheduledPost` com `media_urls`/`media_type: "image"`.
- Horários convertidos de BRT para UTC com `src/lib/timezone.ts`.
- Opcional (posso incluir): salvar o conjunto da semana como rascunho local (localStorage) para retomar se a página for fechada no meio da geração.
