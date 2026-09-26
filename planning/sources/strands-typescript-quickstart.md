# TypeScript Quickstart

This quickstart takes you to a first running agent in TypeScript: install the SDK, pick
a model provider, run the agent, then give it a tool. Everything past that (streaming,
memory, observability, deployment) has its own guide, linked from
next steps.

Using a coding agent? Copy this prompt into Codex, Claude Code, Kiro, or any coding assistant and it will walk you through this page, ask which model provider you want, and offer to set up the Strands MCP server.
Copy promptHelp me build my first agent with the Strands Harness SDK in TypeScript. Work through
these steps in order, checking with me before anything that installs software or writes
files.

Step 1: Environment
Confirm Node.js 20+ and npm are available. In a new project directory run:
  npm init -y
  npm pkg set type=module
  npm install @strands-agents/sdk zod
  npm install --save-dev @types/node typescript

Step 2: Pick a model provider and run a first agent
Ask me which model provider I want to use: Amazon Bedrock (default, needs AWS credentials
or a Bedrock API key in AWS_BEARER_TOKEN_BEDROCK), Anthropic (ANTHROPIC_API_KEY, npm
install @anthropic-ai/sdk), OpenAI (OPENAI_API_KEY, npm install openai), or Google
(GEMINI_API_KEY, npm install @google/genai). Then create src/agent.ts with the snippet
for my provider. The model is one object handed to the Agent; everything else is the
same across providers.

  // Amazon Bedrock (default): no model object needed
  import { Agent } from '@strands-agents/sdk'
  const agent = new Agent()
  const result = await agent.invoke('What is an agent harness, in one sentence?')
  console.log(result.lastMessage)

  // Anthropic
  import { Agent } from '@strands-agents/sdk'
  import { AnthropicModel } from '@strands-agents/sdk/models/anthropic'
  const model = new AnthropicModel({ modelId: 'claude-sonnet-5' })
  const agent = new Agent({ model })
  const result = await agent.invoke('What is an agent harness, in one sentence?')
  console.log(result.lastMessage)

  // OpenAI
  import { Agent } from '@strands-agents/sdk'
  import { OpenAIModel } from '@strands-agents/sdk/models/openai'
  const model = new OpenAIModel({ modelId: 'gpt-5.4' })
  const agent = new Agent({ model })
  const result = await agent.invoke('What is an agent harness, in one sentence?')
  console.log(result.lastMessage)

  // Google
  import { Agent } from '@strands-agents/sdk'
  import { GoogleModel } from '@strands-agents/sdk/models/google'
  const model = new GoogleModel({ modelId: 'gemini-2.5-flash' })
  const agent = new Agent({ model })
  const result = await agent.invoke('What is an agent harness, in one sentence?')
  console.log(result.lastMessage)

Run it with: npx tsx src/agent.ts

Step 3: Add tools to the agent
Tools come from two places: vended tools that ship with the Strands Harness SDK
(@strands-agents/sdk/vended-tools/*) and custom tools made with tool(). Add one of each.
Put this at the top of src/agent.ts:

  import { Agent, tool } from '@strands-agents/sdk'
  import { fileEditor } from '@strands-agents/sdk/vended-tools/file-editor'
  import z from 'zod'

  const letterCounter = tool({
    name: 'letter_counter',
    description:
      'Count occurrences of a specific letter in a word. Performs case-insensitive matching.',
    inputSchema: z
      .object({
        word: z.string().describe('The input word to search in'),
        letter: z.string().describe('The specific letter to count'),
      })
      .refine((data) => data.letter.length === 1, {
        message: "The 'letter' parameter must be a single character",
      }),
    callback: (input) => {
      const { word, letter } = input
      let count = 0
      for (const char of word.toLowerCase()) {
        if (char === letter.toLowerCase()) count++
      }
      return `The letter '${letter}' appears ${count} time(s) in '${word}'`
    },
  })

Then change the agent creation to pass both tools (keep the model option if I chose a
non-Bedrock provider) and use this prompt:

  const agent = new Agent({ tools: [letterCounter, fileEditor] })
  const result = await agent.invoke(
    `How many letter R's are in the word "strawberry"? Write the answer to answer.txt.`
  )
  console.log(result.lastMessage)

Run it again and confirm answer.txt was created. Explain briefly that the model routed the
counting to letter_counter and the file write to fileEditor.

Step 4: Offer the Strands MCP server (ask first, do not install without confirmation)
Strands ships an MCP server that gives you live access to the Strands documentation while
you work, so the code you generate follows current APIs. Ask me whether I want it set up
in this coding tool. If I say yes, it requires uv (https://github.com/astral-sh/uv).
The server runs as: command "uvx", args ["strands-agents-mcp-server"]. Config locations:
  - Kiro: ~/.kiro/settings/mcp.json under "mcpServers"
  - Cursor: ~/.cursor/mcp.json under "mcpServers"
  - Claude Code: run `claude mcp add strands uvx strands-agents-mcp-server`
  - Codex: ~/.codex/config.toml as [mcp_servers.strands-agents]
  - VS Code: mcp.json under "servers"
If I say no, skip this step entirely.

Throughout: prefer the Strands docs at https://strandsagents.com/docs/ over memory. Use
tools from the Strands Harness SDK (vended tools) or custom tools instead of a separate community package.

## Install the Strands Harness SDK
Section titled “Install the Strands Harness SDK”

Make sure you have Node.js 22+ and npm installed. See the
npm docs if you need
to set them up. Then, in a new project directory, initialize it and install the SDK:

- Terminal window
```
npm init -ynpm pkg set type=modulenpm install @strands-agents/sdk zodnpm install --save-dev @types/node typescript
```

## Run your first agent
Section titled “Run your first agent”

Strands works with any major model provider. The model is one object you hand to the
agent, and the rest of your code is the same no matter which provider is behind it. The
tabs below cover the most common providers; pick the one you already have access to,
then create src/agent.ts with the snippet from that tab:

- Amazon Bedrock
- Anthropic
- OpenAI
- Google

Amazon Bedrock is the default provider, using Claude Sonnet 4.6, so no extra install or
model object is needed.

```
import { Agent } from '@strands-agents/sdk'
// Bedrock is the default, so no model object is needed.const agent = new Agent()const result = await agent.invoke('What is an agent harness, in one sentence?')console.log(result.lastMessage)
```

Give the SDK AWS credentials with permission to invoke the model, using one of:

- Bedrock API key: set the AWS_BEARER_TOKEN_BEDROCK environment variable to a
Bedrock API key.
Quickest for local development.

- AWS credentials: aws configure, or the AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
and optionally AWS_SESSION_TOKEN environment variables

- IAM roles: on AWS services like EC2, ECS, or Lambda

Enable access to the models you use in the Amazon Bedrock console, following the
AWS documentation.

Terminal window
```
npm install @anthropic-ai/sdkexport ANTHROPIC_API_KEY=<your key>
```

">

```
import { Agent } from '@strands-agents/sdk'import { AnthropicModel } from '@strands-agents/sdk/models/anthropic'
// Reads ANTHROPIC_API_KEY from the environment.const model = new AnthropicModel({ modelId: 'claude-sonnet-5' })const agent = new Agent({ model })const result = await agent.invoke('What is an agent harness, in one sentence?')console.log(result.lastMessage)
```

Terminal window
```
npm install openaiexport OPENAI_API_KEY=<your key>
```

">

```
import { Agent } from '@strands-agents/sdk'import { OpenAIModel } from '@strands-agents/sdk/models/openai'
// Reads OPENAI_API_KEY from the environment.const model = new OpenAIModel({ modelId: 'gpt-5.4' })const agent = new Agent({ model })const result = await agent.invoke('What is an agent harness, in one sentence?')console.log(result.lastMessage)
```

Terminal window
```
npm install @google/genaiexport GEMINI_API_KEY=<your key>
```

">

```
import { Agent } from '@strands-agents/sdk'import { GoogleModel } from '@strands-agents/sdk/models/google'
// Reads GEMINI_API_KEY from the environment.const model = new GoogleModel({ modelId: 'gemini-2.5-flash' })const agent = new Agent({ model })const result = await agent.invoke('What is an agent harness, in one sentence?')console.log(result.lastMessage)
```

Run it with tsx:

Terminal window
```
npx tsx src/agent.ts
```

Don’t see your provider? Strands also supports the OpenAI Responses API, any
provider in the Vercel AI SDK ecosystem, and any model behind a custom provider you
write. Local models through Ollama are available in the Python SDK.
See all supported model providers.

## Add tools to your agent
Section titled “Add tools to your agent”

You now have a working agent loop, but the agent has nothing to act with. It can only
answer from what the model already knows. Tools are what let an agent do things: read a
file, call an API, run a command, or look something up.

A tool is a function the model can decide to call. Tools come from two places: Strands
ships vended tools for common jobs like editing files,
running shell commands, and making HTTP requests, and you can turn any function of your
own into a tool with tool(). You’ll use one of each.

Add this to the top of src/agent.ts. It imports the fileEditor vended tool and defines
a custom letterCounter tool. The description and the Zod schema are what the model
reads to decide when to call the tool and what to pass it:

```
import { Agent, tool } from '@strands-agents/sdk'import { fileEditor } from '@strands-agents/sdk/vended-tools/file-editor'import z from 'zod'
// Define a custom tool as a TypeScript functionconst letterCounter = tool({  name: 'letter_counter',  description:    'Count occurrences of a specific letter in a word. Performs case-insensitive matching.',  // Zod schema for letter counter input validation  inputSchema: z    .object({      word: z.string().describe('The input word to search in'),      letter: z.string().describe('The specific letter to count'),    })    .refine((data) => data.letter.length === 1, {      message: "The 'letter' parameter must be a single character",    }),  callback: (input) => {    const { word, letter } = input
    // Convert both to lowercase for case-insensitive comparison    const lowerWord = word.toLowerCase()    const lowerLetter = letter.toLowerCase()
    // Count occurrences    let count = 0    for (const char of lowerWord) {      if (char === lowerLetter) {        count++      }    }
    return `The letter '${letter}' appears ${count} time(s) in '${word}'`  },})
```

 data.letter.length === 1, {      message: "The 'letter' parameter must be a single character",    }),  callback: (input) => {    const { word, letter } = input    // Convert both to lowercase for case-insensitive comparison    const lowerWord = word.toLowerCase()    const lowerLetter = letter.toLowerCase()    // Count occurrences    let count = 0    for (const char of lowerWord) {      if (char === lowerLetter) {        count++      }    }    return `The letter '${letter}' appears ${count} time(s) in '${word}'`  },})">

Then replace the agent creation with this. Both tools go in the tools array, and the
prompt asks for something that needs each of them (keep your model line if you set one):

- Amazon Bedrock
- Anthropic
- OpenAI
- Google

```
const agent = new Agent({ tools: [letterCounter, fileEditor] })const result = await agent.invoke(  `How many letter R's are in the word "strawberry"? Write the answer to answer.txt.`)console.log(result.lastMessage)
```

```
const model = new AnthropicModel({ modelId: 'claude-sonnet-5' })const agent = new Agent({ model, tools: [letterCounter, fileEditor] })const result = await agent.invoke(  `How many letter R's are in the word "strawberry"? Write the answer to answer.txt.`)console.log(result.lastMessage)
```

```
const model = new OpenAIModel({ modelId: 'gpt-5.4' })const agent = new Agent({ model, tools: [letterCounter, fileEditor] })const result = await agent.invoke(  `How many letter R's are in the word "strawberry"? Write the answer to answer.txt.`)console.log(result.lastMessage)
```

```
const model = new GoogleModel({ modelId: 'gemini-2.5-flash' })const agent = new Agent({ model, tools: [letterCounter, fileEditor] })const result = await agent.invoke(  `How many letter R's are in the word "strawberry"? Write the answer to answer.txt.`)console.log(result.lastMessage)
```

Run it again. The model works out that counting letters is what letter_counter is for
and that writing a file is what fileEditor is for, calls both, and you end up with an
answer.txt in your working directory. You wrote one of those tools; the other came with
the SDK.

Note
The tool() function also accepts plain JSON Schema objects instead of Zod. See Creating Custom Tools for details.

## What just happened
Section titled “What just happened”

The agent decides when to call a tool based on the request, loops until it has an
answer, and streams the response to your console.

```
flowchart LR    A[Input & Context] --> Loop
    subgraph Loop[" "]        direction TB        B["Reasoning (LLM)"] --> C["Tool Selection"]        C --> D["Tool Execution"]        D --> B    end
    Loop --> E[Response]
```

 Loop    subgraph Loop[" "]        direction TB        B["Reasoning (LLM)"] --> C["Tool Selection"]        C --> D["Tool Execution"]        D --> B    end    Loop --> E[Response]">

Every invocation returns an AgentResult carrying the run’s messages, metrics, and
traces. The Agent Loop explains the cycle above, and
Observability covers reading traces and
metrics. To silence the streamed console output, pass printer: false when creating the
agent.

## Connect your AI coding assistant
Section titled “Connect your AI coding assistant”

Strands ships an MCP server
that gives AI coding assistants in your IDE live access to the Strands documentation —
search, section browsing, and on-demand fetching — so the code they generate follows
current APIs. It helps you build, but it isn’t required to run an agent.

The server requires uv. Once uv is
installed, add the server to your AI coding tool:

- Kiro
- Claude Code
- Cursor
- Codex
- VS Code
- Other

Add the following to ~/.kiro/settings/mcp.json:

```
{  "mcpServers": {    "strands-agents": {      "command": "uvx",      "args": ["strands-agents-mcp-server"],      "disabled": false,      "autoApprove": ["search_docs", "fetch_doc"]    }  }}
```

See the Kiro MCP documentation for more details.

Run the following command:
Terminal window
```
claude mcp add strands uvx strands-agents-mcp-server
```

See the Claude Code MCP documentation for more details.

Add the following to ~/.cursor/mcp.json:

```
{  "mcpServers": {    "strands-agents": {      "command": "uvx",      "args": ["strands-agents-mcp-server"]    }  }}
```

See the Cursor MCP documentation for more details.

Add the following to ~/.codex/config.toml:

```
[mcp_servers.strands-agents]command = "uvx"args = ["strands-agents-mcp-server"]
```

See the Codex MCP documentation for more details.

Add the following to your mcp.json file:

```
{  "servers": {    "strands-agents": {      "command": "uvx",      "args": ["strands-agents-mcp-server"]    }  }}
```

See the VS Code MCP documentation for more details.

The Strands MCP server works with 40+ applications that support MCP.
The general configuration is:

- Command: uvx

- Args: ["strands-agents-mcp-server"]

Verify the connection with the MCP Inspector:

Terminal window
```
npx @modelcontextprotocol/inspector uvx strands-agents-mcp-server
```

## Next Steps
Section titled “Next Steps”

You have a running agent with a tool. From here:

- Vended Tools - file editing, shell, HTTP, and more, ready to drop into tools

- MCP Tools - connect to external tool servers

- Examples - agents for many use cases

- Model Providers - every supported provider and its options

- Agent Loop - how Strands agents work under the hood

- Context Management - keep long conversations inside the model’s context window

- Memory - give the agent long-term memory across sessions with memory stores

- State - how agents keep context across a conversation

- Streaming - stream events to a UI with async iterators

- TypeScript SDK Repository - explore the source and contribute

- Operating Agents in Production - take agents from development to production at scale

Tags
quickstart7
quickstart7 pages×
- Choosing an Agent Foundation
- Get started
- Python Quickstart
- Strands evaluation quickstart
- Strands Shell quickstart
- Red teaming quickstart
- Build a voice agent
