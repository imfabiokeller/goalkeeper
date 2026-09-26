FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY usecase/lens.json usecase/inputs.json usecase/checks.ts ./usecase/
COPY usecase/inputs ./usecase/inputs
ENV ROLE=worker
CMD ["node", "src/worker/index.ts"]
