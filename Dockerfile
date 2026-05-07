# Étape 1 : Installation des dépendances (Garde en cache si les packages ne changent pas)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Étape 2 : Build de l'application Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# La commande de build trouvée dans ton package.json
RUN npm run build 

# Étape 3 : Image finale allégée pour la production (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

# Définition de l'environnement de production
ENV NODE_ENV production

# Copie uniquement des fichiers nécessaires depuis l'étape de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Next.js écoute par défaut sur le port 3000
EXPOSE 3000
ENV PORT 3000

# La commande de démarrage trouvée dans ton package.json
CMD ["npm", "run", "start"]