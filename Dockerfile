# Étape 1 : Installation des dépendances
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Étape 2 : Build de l'application Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# --- AJOUT CRUCIAL : Variables "bouchons" pour le build ---
# Next.js a besoin de ces variables pour compiler le code sans crasher.
ENV NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder"
ENV UPSTASH_REDIS_REST_URL="https://placeholder.upstash.io"
ENV UPSTASH_REDIS_REST_TOKEN="placeholder"
# ----------------------------------------------------------

RUN npm run build 

# Étape 3 : Image finale allégée pour la production (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "start"]