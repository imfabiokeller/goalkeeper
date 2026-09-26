> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

# MongoDB Agent Skills

MongoDB Agent Skills are pre-built, reusable instructions that help AI coding agents perform common MongoDB tasks efficiently. These skills provide agents with expert knowledge about MongoDB best practices, enabling them to help you build applications faster and with fewer errors.

## What are Agent Skills?

Agent skills are specialized instructions that teach AI coding agents how to:

- Set up and configure MongoDB connections

- Design and implement database schemas

- Write efficient queries and aggregations

When you install MongoDB agent skills, your AI coding agent gains access to MongoDB-specific knowledge and can provide more accurate, context-aware assistance for your MongoDB development tasks.

## Available Skills

The MongoDB agent skills collection includes the following skills.

#### Infrastructure

##### MongoDB MCP Setup

Guides the agent through setting up the MongoDB MCP (Model Context Protocol) Server, which enables direct interaction with your MongoDB databases. This skill helps configure authentication credentials and connection settings.

##### MongoDB Connection

Optimize MongoDB client connection configuration (pools, timeouts, patterns) to configure connection pools, debug or troubleshoot connection errors, and optimize performance issues related to connections. Inlcudes building serverless functions with MongoDB, creating API endpoints that use MongoDB, optimizing high-traffic MongoDB applications, creating long-running tasks and concurrency, or debugging connection-related failures.

#### Data Modeling

##### Schema Design

Guides developers through MongoDB schema design best practices. This skill helps design efficient document structures, implement validation rules, and optimize schemas for specific use cases.

#### Advanced Features

##### Atlas Stream Processing

Comprehensive skill for building, operating, and debugging MongoDB Atlas Stream Processing pipelines. Handles workspace provisioning, data source/sink connections, processor lifecycle operations, debugging diagnostics, and tier sizing. Supports Kafka, Atlas clusters, S3, HTTPS, and Lambda integrations for streaming data workloads and event processing.

##### Natural Language Querying

Translates natural language descriptions into MongoDB queries and aggregation pipelines. This skill uses collection schemas, sample documents, and index information to generate accurate, optimized queries. Supports complex operations like geospatial queries, text search, and multi-collection joins. Distinct from MongoDB Atlas Search and Vector Search (see Search and AI Recommendations skill below).

##### Query Optimizer

Analyzes and optimizes MongoDB query performance. This skill ensures queries are properly indexed, debugs slow queries using Atlas Performance Advisor, and provides best practice recommendations for aggregation pipelines.

##### Search and AI Recommendations

Provides guidance for implementing MongoDB Atlas Search and AI-powered recommendations. This skill helps configure search indexes, build search queries, and integrate AI capabilities into applications.

## Installation

MongoDB agent skills are available for multiple AI coding platforms. You can install MongoDB agent skills from official plugins, the Vercel Skills Marketplace, or manually from the [MongoDB agent-skills repository.](https://github.com/mongodb/agent-skills)

### Install from Official Plugins

Install MongoDB agent skills from official plugins for your AI coding platform:

- **Claude Code**: Install from the official MongoDB Claude Plugin. See the [Install the MongoDB Claude Plugin](https://www.mongodb.com/docs/claude.md#std-label-claude-plugin-install) page for more information.

- **Codex**: Install from the official MongoDB Codex Plugin. See the [Install the MongoDB Codex Plugin](https://www.mongodb.com/docs/codex.md#std-label-codex-plugin-install) page for more information.

- **Cursor**: Install from the Cursor marketplace. See the [Install the MongoDB Cursor Plugin](https://www.mongodb.com/docs/cursor.md#std-label-cursor-plugin-install) page for more information.

- **Gemini CLI**: Install as a Gemini CLI extension. See the [Install the MongoDB Gemini Extension from Gemini](https://www.mongodb.com/docs/gemini.md#std-label-gemini-plugin-install) page for more information.

- **VS Code Extension**: Install from the official MongoDB VS Code Extension. See the [Install MongoDB for VS Code Extension](https://www.mongodb.com/docs/mongodb-vscode/install/) page for more information.

**Note: MongoDB Plugins Include the MCP Server**

Official MongoDB plugins for AI coding platforms bundle the MongoDB MCP Server and pre-built agent skills. To configure the MCP Server, see [MongoDB MCP Server Get Started.](https://www.mongodb.com/docs/mcp-server/get-started/)

### Install from Vercel's Agent Skills Directory

Install MongoDB agent skills from Vercel's [Agent Skills Directory](https://skills.sh/mongodb/agent-skills) using the Vercel CLI.

1. Run the following command (requires Node.js):

   ```bash
   npx skills add mongodb/agent-skills
   ```

2. Follow the prompts to complete the installation.

3. If you are using the MCP Server, configure the MCP Server with your MongoDB connection details:

   ```bash
   `npx mongodb-mcp-server@1 setup`
   ```

4. Follow the instructions to complete the setup.

### Install from GitHub Repository

Manually install MongoDB agent skills from the [MongoDB agent-skills repository.](https://github.com/mongodb/agent-skills)

1. Clone the repository:

   ```bash
   git clone https://github.com/mongodb/agent-skills.git
   ```

2. Install the skills for your platform:

   **Supported platforms (Claude Code, Codex, Cursor, Gemini CLI)**

   Copy the appropriate plugin directory to your project root:

   - For Claude Code: Copy the `.claude-plugin/` directory

   - For Codex: Copy the `.codex-plugin/` directory

   - For Cursor: Copy the `.cursor-plugin/` directory

   - For Gemini CLI: Copy the `skills/` directory

   **Other platforms**

   Copy the `skills/` directory to the location where your coding agent reads its skills or context files. Refer to your agent's documentation for the correct path.

3. Copy `mcp.json` to your project root (if using MCP Server).

4. If using MCP Server, configure the MCP Server with your MongoDB connection details.

## Configure the MCP Server

Configure the MongoDB MCP Server for the skills that access a live database. You can use Skills focused on design, tuning, and best-practices guidance without MCP, though some provide a richer experience when you enable it.

For complete MCP Server configuration options, see [MongoDB MCP Server Get Started.](https://www.mongodb.com/docs/mcp-server/get-started/)

## Using Agent Skills

Once installed, agent skills work automatically in the background. When you ask your AI coding agent for help with MongoDB tasks, it will use the installed skills to provide more accurate and helpful responses.

Example interactions:

- "Help me set up a MongoDB connection in my Node.js application"

- "Create a schema for a user collection with email validation"

- "Write an aggregation pipeline to calculate monthly sales totals"

- "Show me how to implement pagination for this query"

The agent will use the MongoDB skills to provide responses that follow MongoDB best practices and are tailored to your specific use case.

### Invoke Agent Skills

Agent skills are invoked automatically when you ask your AI coding agent for help with MongoDB tasks. Some platforms allow you to invoke skills manually.

For example, you can invoke a skill directly in Claude Code using `/<skill-name>`.

## Learn More

- [MongoDB Agent Skills Repository](https://github.com/mongodb/agent-skills)

- [MongoDB MCP Server Documentation](https://www.mongodb.com/docs/mcp-server/)
