# Deploy — Reserva Roxou

## Build local

```bash
npm install   # ou bun install
npm run build
```

Saída em `dist/` (pasta estática pronta para servir).

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_MAPS_API_KEY=<chave-google-maps>
```

### Google Maps Platform

No Google Cloud Console, na chave usada em `VITE_GOOGLE_MAPS_API_KEY`, habilite as APIs:

- **Maps JavaScript API** (autocomplete e mapas no browser)
- **Places API (New)** (sugestões de endereço e detalhes de lugar)
- **Routes API** (cálculo de distância e duração)
- **Geocoding API** (opcional, fallback de texto livre)

Restrinja a chave por HTTP referrer para `https://reserva.roxou.com.br/*` e `https://*.lovable.app/*`.

## VPS (Nginx)

1. Suba a pasta `dist/` para a VPS, ex: `/var/www/reserva-roxou/dist`.
2. Copie `deploy/nginx.conf.example` para `/etc/nginx/sites-available/reserva.roxou.com.br` e ajuste paths SSL.
3. Ative:
   ```bash
   sudo ln -s /etc/nginx/sites-available/reserva.roxou.com.br /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Gere SSL com certbot:
   ```bash
   sudo certbot --nginx -d reserva.roxou.com.br
   ```

## Banco de dados

Aplique `supabase/schema.sql` em um projeto Supabase novo, configure o provedor Google em Auth → Providers, e pronto.