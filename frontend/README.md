# Frontend — Empório da Música

Site da loja + chat com a Clave (assistente virtual).

- **Next.js 16** (App Router) · **Tailwind 4** · **shadcn/ui** · **Vercel AI SDK v7** (`useChat`)
- **three.js / react-three-fiber**: violão e ukulele em 3D (modelos gerados por `../tools/blender/`)
- **Bilíngue**: inglês em `/` (padrão), português em `/pt`

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

O chat conversa com `/api/chat`, um **mock** que fala o mesmo protocolo de stream do agente
Python. Para usar o agente real, defina `NEXT_PUBLIC_CHAT_API` com a URL do backend.

Scripts de dados (Python, rodar a partir da raiz do repositório):

- `python frontend/scripts/gen_mock.py data frontend/lib/mock` — mock do catálogo/pedidos a partir dos CSVs
- `python frontend/scripts/gen_clave_depth.py` (de dentro de `frontend/`) — mapa de profundidade do retrato da Clave
