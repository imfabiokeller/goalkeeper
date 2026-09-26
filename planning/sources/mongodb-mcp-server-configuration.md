> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

# MongoDB MCP Server Configuration

Configure the MCP Server to interact with your MongoDB clusters from AI clients.

This page describes AI client compatibility and prerequisites, and has links to pages with the MCP Server configuration options. For a simple MCP Server configuration and introduction, see [Get Started with the MongoDB MCP Server.](https://www.mongodb.com/docs/mcp-server/get-started.md#std-label-mcp-get-started)

## AI Client Compatibility

The MCP Server is compatible with AI clients that support MCP. For example, you can use these AI clients:

- [Claude Desktop](https://modelcontextprotocol.io/quickstart/user)

- [Claude Code](https://code.claude.com/docs/en/mcp)

- [Cursor](https://docs.cursor.com/context/model-context-protocol)

- [fx](https://fx.sh/docs/capabilities/mcp)

The JSON configuration file structure can vary for each AI client. Read the AI client documentation for details.

For a list of clients that support MCP, see [MCP Clients.](https://modelcontextprotocol.io/clients)

## Prerequisites

Ensure you have already installed the software as specified in [MCP Server software prerequisites.](https://www.mongodb.com/docs/mcp-server/get-started.md#std-label-mcp-get-started-prerequisites)

The MCP Server can run Atlas tools that perform various Atlas operations. To run the Atlas tools, your Atlas cluster requires a service account with the appropriate permissions.

To set up a service account, see [MongoDB MCP Server Prerequisites for Running Atlas Tools.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites)

For a list of the tools, see [MongoDB MCP Server Tools.](https://www.mongodb.com/docs/mcp-server/tools.md#std-label-mcp-server-tools)

## MongoDB MCP Server Configuration Tasks and Operations

To perform MongoDB MCP Server configuration tasks and operations, see the following pages:

| Page | Description |
| --- | --- |
| [Options](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/options.md#std-label-mcp-server-configuration-options) | View MCP Server options that specify how to connect to a cluster and control MCP Server operations. |
| [Methods](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/methods.md#std-label-mcp-server-configuration-methods) | Set MCP Server options in a JSON configuration file, a command line, and environment variables. |
| [Enable or disable features](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-enable-or-disable-features) | Enable or disable MCP Server features such as read-only mode, specific MCP tools, telemetry data collection about system use, and using indexes in queries. |
| [Export data](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/export-data.md#std-label-mcp-server-configuration-export-data) | Export results returned by queries and aggregation pipelines to files. |
| [Standalone service](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/standalone-service.md#std-label-mcp-server-configuration-standalone-service) | Configure the MCP Server to run as a standalone service. |
| [Troubleshoot problems](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/troubleshooting.md#std-label-mcp-server-configuration-troubleshooting) | Examine MCP Server logs for information that can help resolve problems. |

## Learn More

- [MongoDB MCP Server Tools](https://www.mongodb.com/docs/mcp-server/tools.md#std-label-mcp-server-tools)

- [MongoDB MCP Server Usage Examples](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

- [MongoDB MCP Server Security](https://www.mongodb.com/docs/mcp-server/local-mcp/security.md#std-label-mcp-server-security)

- [MongoDB MCP Server Security Best Practices](https://www.mongodb.com/docs/mcp-server/local-mcp/security-best-practices.md#std-label-mcp-server-security-best-practices)
