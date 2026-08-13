FROM node:24-alpine

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY db.mjs auth.mjs errors.mjs rateLimit.mjs app.mjs index.mjs ./
COPY platform ./platform
COPY certs ./certs

RUN chown -R app:app /app
USER app

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

CMD ["node", "index.mjs"]
