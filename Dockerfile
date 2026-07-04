# Mesma imagem serve os DOIS serviços no Easypanel:
#   - web:    comando padrão (next start)
#   - worker: sobrescrever o comando para `npm run worker`
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variáveis NEXT_PUBLIC_* precisam existir no build; passe-as como build args
# no Easypanel (Build > Args) além das env de runtime.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
EXPOSE 3000

CMD ["npm", "run", "start"]
