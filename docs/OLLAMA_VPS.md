# Ollama num VPS para a análise de IA (`analisar-lesao`)

A Edge Function `supabase/functions/analisar-lesao` roda na nuvem da Supabase e
faz `POST {OLLAMA_HOST}/api/generate` com a foto da lesão em base64. Ela precisa
de um endereço **HTTPS público** e, se `OLLAMA_TOKEN` estiver setado, manda
`Authorization: Bearer <token>`.

Este guia sobe o Ollama num VPS Linux, com HTTPS + token via Caddy.

Modelo escolhido: **`qwen2.5vl`** (Qwen2.5-VL 7B, ~6 GB).

---

## 1. Escolher o VPS

| Cenário | Máquina sugerida | Custo aprox. | Latência/imagem |
| --- | --- | --- | --- |
| Piloto, volume baixo (CPU) | Hetzner **CPX41** (8 vCPU, 16 GB RAM) | ~€28/mês | 30–90 s |
| Piloto confortável (GPU) | Hetzner **GEX44** (RTX 4000 SFF, 20 GB) ou RunPod L4 | ~€200/mês / ~$0,4/h | 2–6 s |
| Sob demanda | RunPod / Vast.ai (liga só quando precisa) | por hora | 2–6 s |

Requisitos mínimos: **16 GB de RAM** (CPU) ou **8 GB de VRAM** (GPU), 20 GB de disco livre, Ubuntu 24.04.

> ⚠️ **Timeout:** a Edge Function tem limite de ~150 s de wall-clock. Em CPU com
> imagem grande isso pode estourar. Se acontecer, use GPU ou reduza a resolução
> da foto antes do upload.

Antes de continuar você precisa de:
- IP do VPS + acesso `ssh root@IP`
- Um subdomínio apontando pro IP, ex. `ia.dermia.tech` (registro A no DNS)

---

## 2. Setup do servidor

SSH no VPS como root e rode:

```bash
# --- Ollama ---
curl -fsSL https://ollama.com/install.sh | sh

# manter o modelo carregado na RAM/VRAM entre chamadas (evita reload de ~10 s)
mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_KEEP_ALIVE=-1"
Environment="OLLAMA_HOST=127.0.0.1:11434"
EOF
systemctl daemon-reload
systemctl restart ollama

# baixar o modelo de visão (~6 GB)
ollama pull qwen2.5vl

# --- token ---
TOKEN=$(openssl rand -hex 32)
echo "OLLAMA_TOKEN = $TOKEN"   # >>> ANOTE, vai pro secret da Supabase <<<

# --- Caddy (HTTPS automático + checagem do Bearer) ---
apt-get update && apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

cat >/etc/caddy/Caddyfile <<EOF
ia.dermia.tech {
    @noauth not header Authorization "Bearer $TOKEN"
    respond @noauth "unauthorized" 401

    reverse_proxy 127.0.0.1:11434 {
        transport http {
            read_timeout 300s
            write_timeout 300s
        }
    }
}
EOF
systemctl restart caddy

# --- firewall: só SSH e HTTPS pra fora; 11434 fica só no localhost ---
ufw allow OpenSSH
ufw allow 443/tcp
ufw allow 80/tcp
ufw --force enable
```

Troque `ia.dermia.tech` pelo seu subdomínio nos dois lugares.

---

## 3. Testar o endpoint

Do seu PC (não do VPS):

```bash
curl https://ia.dermia.tech/api/generate \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"model":"qwen2.5vl","prompt":"responda apenas: ok","stream":false}'
```

Deve voltar um JSON com `"response"`. Sem o header → `401 unauthorized`.

---

## 4. Setar os secrets na Supabase

No repo (`c:\Users\pedro\Documents\Repos\dermia`):

```bash
npx supabase secrets set \
  OLLAMA_HOST=https://ia.dermia.tech \
  OLLAMA_MODELO=qwen2.5vl \
  OLLAMA_TOKEN=SEU_TOKEN

npx supabase functions deploy analisar-lesao
```

Confirir: `npx supabase secrets list`.

---

## 5. Validar ponta a ponta

1. No app, capture/anexe uma foto de lesão → cria uma linha em `analises_ia`.
2. A função é chamada; em alguns segundos o `status` vira `concluida` com
   `resultado`, `confianca`, `modelo`, `latencia_ms` preenchidos.
3. Se der `erro`, olhe `erro_mensagem` na linha e os logs:
   `npx supabase functions logs analisar-lesao`.

Erros comuns:
- `OLLAMA_HOST não configurado` → secret não subiu / faltou redeploy.
- `Ollama respondeu 401` → `OLLAMA_TOKEN` diferente do Caddyfile.
- `Ollama respondeu 404` → modelo não baixado (`ollama pull qwen2.5vl`).
- timeout / 502 → inferência em CPU passou do limite; use GPU.

---

## Manutenção

- Atualizar Ollama: `curl -fsSL https://ollama.com/install.sh | sh && systemctl restart ollama`
- Ver uso: `journalctl -u ollama -f`
- Rotacionar token: gere outro, edite o `Caddyfile`, `systemctl restart caddy`,
  `npx supabase secrets set OLLAMA_TOKEN=novo` e redeploy da função.
