# Cloudflare Worker - Reddit API Proxy

## Despliegue rápido

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login a Cloudflare
```bash
wrangler login
```

### 3. Desplegar
```bash
cd cloudflare-worker
wrangler deploy
```

Esto va a crear un worker en: `https://reddit-rule-proxy.<tu-subdomain>.workers.dev`

### 4. (Opcional) Configurar dominio personalizado
Si tenés el dominio `reddit-rule-scanner.online` en Cloudflare:

1. Ir a Cloudflare Dashboard → Workers → reddit-rule-proxy → Settings → Triggers
2. Agregar Custom Domain: `reddit-proxy.reddit-rule-scanner.online`

O descomentar las líneas de `routes` en `wrangler.toml` y hacer `wrangler deploy` de nuevo.

### 5. (Opcional) Configurar API Key
```bash
wrangler secret put API_KEY
```

### 6. Configurar en Vercel
Agregar estas environment variables en Vercel:
```
NEXT_PUBLIC_REDDIT_PROXY_URL=https://reddit-rule-proxy.<tu-subdomain>.workers.dev
REDDIT_PROXY_URL=https://reddit-rule-proxy.<tu-subdomain>.workers.dev
```

O si usaste dominio personalizado:
```
NEXT_PUBLIC_REDDIT_PROXY_URL=https://reddit-proxy.reddit-rule-scanner.online
REDDIT_PROXY_URL=https://reddit-proxy.reddit-rule-scanner.online
```

## Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /both?subreddit=name` | Obtiene about + rules en una sola llamada |
| `GET /about?subreddit=name` | Solo info del subreddit |
| `GET /rules?subreddit=name` | Solo reglas |
| `GET /health` | Health check |

## Costo
Cloudflare Workers Free Tier:
- 100,000 requests/día
- 10ms CPU time por request
- **$0/mes** para el uso normal de esta app
