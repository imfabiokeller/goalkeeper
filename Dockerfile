FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
# The use case as the worker and the planner read it: lens and inputs for
# the seed, checks and sandbox for the gate, answers for the score step.
COPY usecase/lens.json usecase/inputs.json usecase/checks.ts usecase/sandbox.ts ./usecase/
COPY usecase/inputs ./usecase/inputs
COPY usecase/answers ./usecase/answers
ENV ROLE=worker
CMD ["node", "src/worker/index.ts"]
