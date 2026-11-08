---
title: Clave — Empório da Música
emoji: 🎸
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 8000
pinned: false
short_description: API do agente de atendimento Clave (LangChain + Claude)
---

# Clave — API do agente de atendimento

Backend do desafio técnico de AI Engineer: agente de atendimento da **Empório da Música**, loja fictícia de
instrumentos em Campo Grande/MS. O site que conversa com esta API e todo o código estão em
[github.com/Hugueninfer/emporio-da-musica-agent](https://github.com/Hugueninfer/emporio-da-musica-agent).

- `POST /api/chat` — conversa no protocolo de stream do Vercel AI SDK
- `GET /health` — status e modelo

Este Space é gerado por `deploy/huggingface/publish.py` a partir do repositório; não edite aqui.
