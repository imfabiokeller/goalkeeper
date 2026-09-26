> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  other tabs: atlas-cli, atlas-admin-api, data-exploration, code-generation
-->

# Get Started with the MongoDB MCP Server

In this guide, you learn how to get started with the MongoDB MCP Server by configuring and using it in your AI client.

**Tip:**

Select your desired AI Client from the **AI Client** dropdown below for setup instructions.

Claude Code supports the following setup methods:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Plugin for Local MCP**: This option allows you to connect to your local MongoDB cluster using the plugin.

* **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Plugin Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Plugin for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Claude Code CLI session.

2. Install the plugin.

   Run:

   ```none
   /plugin install mongodb-atlas@claude-plugins-official
   ```

   Follow the prompts to complete the installation.

3. Apply changes.

   Run `/reload-plugins`.

4. Login to Atlas.

   Run `/mcp`, select **plugin:mongodb-atlas:mongodb-atlas**, and select **Authenticate**.

5. Confirm the requested permissions.

   Complete the guided Atlas [OAuth flow](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security) and click **Authorize**.

### Manual Setup: Atlas Managed MCP Server

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```json
   cat > mcp-client-config.json <<EOF
   {
     "mcpServers": {
        "mongodb-atlas-mcp-remote": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "mongodb-atlas-mcp-remote@latest"],
          "env": {
            "MDB_MCP_API_CLIENT_ID": "$CLIENT_ID",
            "MDB_MCP_API_CLIENT_SECRET": "$SECRET"
          }
        }
      }
   }
   EOF
   ```

   Open `mcp-client-config.json` and paste its contents into your MCP client's settings.

## Self-Managed MongoDB

### Plugin Setup: Local MCP Server

#### Set up the Plugin for Local MCP.

1. Open a Claude Code CLI session.

2. Install the plugin.

   Run:

   ```none
   /plugin install mongodb@claude-plugins-official
   ```

   Follow the prompts to complete the installation.

3. Set up the plugin.

   Run the `/mongodb:mongodb-mcp-setup` skill and follow the prompts.

### Manual Setup: Local MCP Server

#### Set up Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

Claude Desktop & Web support the following setup methods:

- **Connector for MongoDB Atlas (Managed MCP Server) (Recommended)**: This option allows you to connect to your MongoDB Atlas cluster using the connector.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Connector Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Connector for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Claude Desktop or Claude Web session.

2. Open your Settings:

   In the bottom-left corner, click the card with your profile name and select Settings.

3. Find the MongoDB Atlas Connector.

   In the Settings menu, click Connectors. Click the Add dropdown and select Browse connectors. Search for and select the **MongoDB Atlas** connector.

4. Login to Atlas.

   Click Connect and complete the guided Atlas [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

5. Grant access to Atlas.

   Click Authorize.

### Manual Setup: Atlas Managed MCP Server (Claude Desktop)

#### Set up MongoDB Atlas Managed MCP Server (Claude Desktop)

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```json
   cat > mcp-client-config.json <<EOF
   {
       "mcpServers": {
           "mongodb-atlas-mcp-remote": {
               "type": "stdio",
               "command": "npx",
               "args": ["-y", "mongodb-atlas-mcp-remote@latest"],
               "env": {
                   "MDB_MCP_API_CLIENT_ID": "$CLIENT_ID",
                   "MDB_MCP_API_CLIENT_SECRET": "$SECRET"
               }
           }
       }
   }
   EOF
   ```

   Open `mcp-client-config.json` and paste its contents into your `Claude/claude_desktop_config.json` file. If you have other MCP servers configured, you can add only the `mongodb-atlas-mcp-remote` configuration to your existing `mcpServers` object.

   Restart Claude Desktop to apply the new configuration.

## Self-Managed MongoDB

### Manual Setup: Local MCP Server (Claude Desktop)

#### Set up Local MCP for MongoDB MCP Server (Claude Desktop).

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

ChatGPT Desktop & Web support the following setup method:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

**Note:**

ChatGPT does not support Self-Managed MongoDB.

## MongoDB Atlas

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

To set up the MongoDB Atlas plugin in ChatGPT Desktop or Web, follow these steps:

1. Open a ChatGPT session.

2. Install the plugin.

   Go to **Settings → Plugins → Browse directory**.

   Search for **MongoDB Atlas**, select it, and click **Install plugin**.

3. Login to Atlas.

   Click **Connect to MongoDB Atlas** and complete the guided Atlas [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

4. Confirm the requested permissions.

   Click **Authorize**.

Cursor supports the following setup methods:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Plugin for Local MCP**: This option allows you to connect to your local MongoDB cluster using the plugin.

* **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Plugin Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Plugin for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Cursor session.

2. Install the plugin.

   Go to **Cursor Settings → Customize → Browse Marketplace**.

   Search for **MongoDB Atlas** and click **Add**.

3. Login to Atlas.

   Go to **Tools & MCPs → Authenticate → MongoDB-Atlas** and complete the guided [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

4. Confirm the requested permissions.

   Click **Authorize**.

### Manual Setup: Atlas Managed MCP Server

#### MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```json
   cat > mcp-client-config.json <<EOF
   {
     "mcpServers": {
        "mongodb-atlas-mcp-remote": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "mongodb-atlas-mcp-remote@latest"],
          "env": {
            "MDB_MCP_API_CLIENT_ID": "$CLIENT_ID",
            "MDB_MCP_API_CLIENT_SECRET": "$SECRET"
          }
        }
      }
   }
   EOF
   ```

   Open `mcp-client-config.json` and paste its contents into your `.cursor/mcp.json` file in your project or home directory.

## Self-Managed MongoDB

### Plugin Setup: Local MCP Server

#### Set up the Plugin for MongoDB (Self-Managed MCP Server).

1. Open a Cursor session.

2. Install the plugin.

   Go to **Cursor Settings → Customize → Browse Marketplace**.

   Search for **MongoDB** and click **Add**.

3. Complete setup.

   Open a **New Agent**, run the `/mongodb-mcp-setup` skill, and follow the prompts.

### Manual Setup: Local MCP Server

#### Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

Codex supports the following setup methods:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Plugin Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Plugin for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Codex session.

2. Install the plugin.

   Go to **Settings → Plugins → Search plugins**.

   Search for **MongoDB Atlas** and select it.

3. Authorize the plugin.

   Click **Continue to MongoDB Atlas** and complete the guided Atlas [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

4. Confirm the requested permissions.

   Click **Authorize**.

### Manual Setup: Atlas Managed MCP Server

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```toml
   cat > mcp-client-config.toml <<EOF
   [mcp_servers.mongodb-atlas-mcp-remote]
   command = "npx"
   args = ["-y", "mongodb-atlas-mcp-remote@latest"]

   [mcp_servers.mongodb-atlas-mcp-remote.env]
   MDB_MCP_API_CLIENT_ID = "$CLIENT_ID"
   MDB_MCP_API_CLIENT_SECRET = "$SECRET"
   EOF
   ```

   Copy the contents of `mcp-client-config.toml` and paste it at the end of your `~/.codex/config.toml` file.

## Self-Managed MongoDB

### Manual Setup: Local MCP Server

#### Set up Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

Devin AI supports the following setup methods:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

## MongoDB Atlas

### Plugin Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Plugin for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Devin AI session.

2. Install the plugin.

   Go to **Settings → Connections**.

   Select the **MongoDB Atlas** MCP Server.

   Click **Install and enable**.

   In the security notice pop-up window, confirm **Install and enable**.

3. Login to Atlas.

   Complete the guided Atlas [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

4. Confirm the requested permissions.

   Devin requests access to MongoDB Atlas. Click **Authorize**.

   Devin redirects you back to your Devin app and displays a confirmation that the MCP Server installed successfully.

### Manual Setup: Atlas Managed MCP Server

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```json
   cat > mcp-client-config.json <<EOF
   {
     "mcpServers": {
        "mongodb-atlas-mcp-remote": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "mongodb-atlas-mcp-remote@latest"],
          "env": {
            "MDB_MCP_API_CLIENT_ID": "$CLIENT_ID",
            "MDB_MCP_API_CLIENT_SECRET": "$SECRET"
          }
        }
      }
   }
   EOF
   ```

   In Devin, click **Add a Custom MCP**. Click **Import JSON**, then paste the contents of `mcp-client-config.json`.

## Self-Managed MongoDB

**Note:**

Devin AI does not support Self-Managed MongoDB.

Grok Build supports the following setup methods:

- **Plugin for MongoDB Atlas (Managed MCP Server) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster using the plugin.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Plugin for Local MCP**: This option allows you to connect to your local MongoDB cluster using the plugin.

* **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Plugin Setup: Atlas Managed MCP Server (Recommended)

#### Set up the Plugin for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Open a Grok Build CLI session.

2. Install the plugin.

   Run the `/plugins` command and click **Marketplace**.

   Search for **mongodb-atlas** and press the `i` key.

3. Authorize the plugin.

   Browse to the **MCP Servers** tab and click **mongodb-atlas**.

4. Confirm the requested permissions.

   To confirm the requested permissions, click **Authorize**.

### Manual Setup: Atlas Managed MCP Server

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```bash
   cat > ~/.mcp-env <<EOF
   export MDB_MCP_API_CLIENT_ID="$CLIENT_ID"
   export MDB_MCP_API_CLIENT_SECRET="$SECRET"
   EOF
   chmod 600 ~/.mcp-env
   ```

   After you create your configuration file, run the following command to load your configuration into your current shell session:

   ```bash
   source ~/.mcp-env
   ```

## Self-Managed MongoDB

### Plugin Setup: Local MCP Server

#### Set up the Plugin for MongoDB (Self-Managed MCP Server).

1. Open a Grok Build CLI session.

2. Install the plugin.

   Run the `/plugins` command and click **Marketplace**.

   Search for **mongodb** and press the `i` key.

3. Complete setup.

   Run the `/mongodb-mcp-setup` skill and follow the prompts.

### Manual Setup: Local MCP Server

#### Set up Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

The fx CLI supports the following setup methods:

- **MongoDB Atlas Managed MCP Server (User Delegation) (Recommended):** This option allows you to connect to your MongoDB Atlas cluster by authorizing your AI client to act with your Atlas identity.

* **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

- **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### MongoDB Atlas Managed MCP Server (User Delegation) (Recommended)

#### Set up user-delegated access for MongoDB Atlas (Managed MCP Server).

**Important:**

An organization owner must enable the AI Clients setting before members can connect with a plugin. To learn how to enable AI client connections, see [Enable AI Clients.](https://www.mongodb.com/docs/mcp-server/prerequisites.md#std-label-mcp-server-prerequisites-enable-ai-clients)

1. Create your fx MCP configuration file.

   Create a file named `mcp.json` in the `~/.fx` directory.

2. Add the MongoDB Atlas Managed MCP Server configuration.

   Add the following configuration to `~/.fx/mcp.json`:

   ```json
   {
     "mcp": {
       "mongodb": {
         "type": "http",
         "url": "https://mcp.mongodb.com",
         "oauth": {
           "client_id": "fx"
         }
       }
     }
   }
   ```

3. Enable the MongoDB MCP Server in fx.

   Open an fx session and run:

   ```none
   /mcp auth mongodb --open
   ```

   Complete the guided [OAuth flow.](https://www.mongodb.com/docs/mcp-server/remote-mcp/security.md#std-label-remote-mcp-security)

4. Authorize access.

   To grant fx access to your Atlas resources, click Authorize.

### Manual MongoDB Atlas Managed MCP Server (Client Credentials)

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Run the following command to create your configuration file:

   ```json
   cat > mcp-client-config.json <<EOF
   {
     "mcp": {
       "mongodb-atlas-mcp-remote": {
         "type": "stdio",
         "command": ["npx", "-y", "mongodb-atlas-mcp-remote@latest"],
         "environment": {
           "MDB_MCP_API_CLIENT_ID": "$CLIENT_ID",
           "MDB_MCP_API_CLIENT_SECRET": "$SECRET"
         }
       }
     }
   }
   EOF
   ```

   Open `mcp-client-config.json` and paste its contents into your `~/.fx/mcp.json` file.

## Self-Managed MongoDB

### Manual Setup: Local MCP Server

#### Set up Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

You can use any other AI client with the following setup methods:

- **Manual Setup for MongoDB Atlas Managed MCP Server**: This option allows you to connect to your MongoDB Atlas cluster after you set up Atlas access using the Atlas CLI or Atlas API.

* **Manual Setup for Local MCP**: This option allows you to connect to your local MongoDB cluster after you manually set up the Local MCP environment.

## MongoDB Atlas

### Manual Setup: Atlas Managed MCP Server (Recommended)

#### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Write your MCP client configuration.

   Write your MCP cient configuration using the values you obtained in the previous steps.

## Self-Managed MongoDB

### Manual Setup: Local MCP Server

#### Set up Local MCP for MongoDB MCP Server.

To use the MongoDB MCP server, you must have the following:

- A self-hosted MongoDB deployment. To learn more, see [Install MongoDB.](https://www.mongodb.com/docs/manual/installation.md#std-label-tutorials-installation)

- Any [supported MCP client.](https://modelcontextprotocol.io/clients)

- You also need your MongoDB cluster connection string. To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

- [Node.js](https://www.nodejs.org/) installed, using version 22.12.0 or later.

  To examine your `Node.js` version, run the following command:

  ```bash
  node --version
  ```

  **Note:**

  The MongoDB MCP Server previously supported Node.js version 20.19.0 and later. Node.js version 20.x reached end of life on April 30, 2026. While the MCP server may continue to work using Node.js version 20.x, we cannot guarantee the expected behavior and recommend upgrading to a supported version of Node.js.

  Alternatively, you can run the server in Docker container, which does not require installing Node.js. To learn more, see [Using Docker.](https://github.com/mongodb-js/mongodb-mcp-server#option-5-using-docker)

#### Configure MCP Server File

The MongoDB MCP Server JSON configuration file tells the server how to connect to MongoDB and how to share that data with MCP clients.

To create an initial JSON file, use the MCP Server setup utility. The utility guides you through the configuration process. Follow these steps:

1. Run utility.

   From the command line, run:

   ```shell
   npx mongodb-mcp-server@latest setup
   ```

2. Provide read-only mode setting.

   You can limit the MCP Server to perform only read operations using read-only mode. To enable read-only mode, enter `Y`.

   For security, always enable read-only mode unless you must perform write operations. You can enable write operations later. For details, see [MCP Server Read-Only Mode.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/enable-or-disable-features.md#std-label-mcp-server-configuration-read-only-mode)

3. Enter connection string.

   Enter the connection string for your MongoDB cluster.

   For example, `mongodb+srv://user:D1fficultP%40ssw0rd@mycluster.abcd1.mongodb.net/myDatabase?retryWrites=true&w=majority`.

   To learn more, see [Find Your Connection String.](https://www.mongodb.com/docs/manual/reference/connection-string.md#std-label-mongodb-uri)

4. (Optional) Enter path for configuration file.

   If you want to use a different path for the configuration file, enter the path to save the configuration file.

   For example, `/Users/user.name/Library/Application Support/Code/User/mcp.json`.

The utility creates the configuration file. Read the instructions on how to use the configuration file with your AI client. The utility also provides the location of the configuration file.

#### Use the MCP Server

Restart your AI client so that it uses the JSON configuration file you created or updated in the previous section.

After you configure the MongoDB MCP Server, you can access the MongoDB cluster from your AI client.

1. Check that the server is running.

   In your AI client, check that the MongoDB MCP server is running and verify that your list of MCP tools includes the MongoDB MCP tools if possible.

2. Test the MCP server tools.

   Run prompts in your AI client to test the MongoDB MCP Server tools. Your exact responses will vary depending on the data in your MongoDB deployment, and the AI client and model that you're using. The following sample prompts assume that the MCP server has both read and write access to your MongoDB deployment.

   First, create a new database and collection to work with by running the following prompt:

   ```text
   Create a new MongoDB collection named "products" and insert
   some sample data into the collection with the following fields:

   - name (string)
   - price (number)
   - category (string)
   - quantity (number)
   - inStock (boolean)
   ```

   **Output:**

   ```text
   I'll help you insert sample data into a MongoDB collection named "products" with the specified fields. Let me set this up for you.
     Ran `list-databases` - MongoDB (MCP Server)
   I'll create a sample database called "sample_store" and insert some product data into a "products" collection. Let's create the collection first:
     Ran `create-collection` - MongoDB (MCP Server)
   Now I'll insert sample product data into the "products" collection with all the required fields:
     Ran `insert-many` - MongoDB (MCP Server)
   Let's verify the data was inserted properly by querying the collection:
     Ran `find` - MongoDB (MCP Server)
   The sample data has been successfully inserted into the "products" collection. Here are some details of the inserted documents:

   Laptop:
    Price: $1,299.99
    Category: Electronics
    Quantity: 15
    InStock: true

   Smartphone:
    Price: $799.99
    Category: Electronics
    Quantity: 25
    InStock: true

   Headphones:
    Price: $149.99
    Category: Audio
    Quantity: 40
    InStock: true

   ...
   ```

   Now that you have a MongoDB collection with some sample data, run prompts to interact with it using the MCP tools:

   ### Explore and query

   Run the following prompts in your AI client to explore and query your data in natural language:

   ```text
   Explain the schema of the "products" collection and provide a summary
   of the data.
   ```

   **Output:**

   ```text
   I'll help you explain the schema of the "products" collection and provide a summary of the data. Let me interact with your MongoDB database through the MCP server to get this information.
     Ran `collection-schema` - MongoDB (MCP Server)
   Now, let me fetch some sample data from the collection to provide you with a summary:
     Ran `find` - MongoDB (MCP Server)
   Let's also get a count of the total number of documents in the collection:
     Ran `count` - MongoDB (MCP Server)
   Let me get some aggregated statistics about the data:
     Ran `aggregate` - MongoDB (MCP Server)
     Ran `aggregate` - MongoDB (MCP Server)

   Schema and Data Summary for the "products" Collection

   Schema Overview

   The "products" collection has the following schema:
   1. _id: ObjectId - MongoDB's default unique identifier for each document
   2. name: String - The name of the product
   3. price: Number - The price of the product in USD
   4. category: String - The category the product belongs to
   5. quantity: Number - The available quantity of the product
   6. inStock: Boolean - Flag indicating whether the product is in stock or not

   Data Summary

   Overall Statistics:
   - Total number of products: 10
   - Products in stock: 8
   - Products out of stock: 2
   - Categories Distribution:
   - Electronics: 3 products (Laptop, Smartphone, Gaming Console)
   - Audio: 2 products (Headphones, Bluetooth Speaker)
   - Kitchen: 2 products (Coffee Maker, Blender)
   - Furniture: 1 product (Office Chair)
   - Home: 1 product (Desk Lamp)
   - Wearables: 1 product (Fitness Tracker)

   Price Range:
   - Lowest priced item: $29.99 (Desk Lamp)
   - Highest priced item: $1,299.99 (Laptop)

   Inventory Status:
   - Total inventory quantity: 153 items
   - Average price across all products: approximately $313.99
   - Products with zero quantity: 2 (Fitness Tracker, Blender) - these are marked as out of stock

   Category Insights:
   - Electronics has the highest average price at approximately $866.66
   - Audio products have the highest total quantity (60 items)
   - All zero-quantity products are correctly marked as out of stock (false)

   This collection appears to be a simple product catalog for a store with various categories of merchandise, including pricing and inventory information
   ```

   ```text
   Find all products in the "products" collection that are out of stock
   and update them to "in stock".
   ```

   **Output:**

   ```text
   I'll help you find all products in the "products" collection that are out of stock and update them to be in stock. Let me interact with your MongoDB database through the MCP server to accomplish this.
   First, let's find all products that are currently out of stock:
     Ran `find` - MongoDB (MCP Server)
   Now I'll update these out-of-stock products to be in stock. For this example, I'll also set a reasonable quantity value for each item:
     Ran `update-many` - MongoDB (MCP Server)
   Let's verify the updates by checking all products that were previously out of stock:
     Ran `find` - MongoDB (MCP Server)

   Great! I've successfully:

   1. Found all products that were out of stock (2 products):
      - Fitness Tracker (Wearables category)
      - Blender (Kitchen category)

   2. Updated these products to:
      - Set them as in stock (inStock: true)
      - Set their quantity to 10 units each

   The update has been completed successfully, and both products are now marked as in stock with 10 units available for each. The MongoDB update operation matched 2 documents and modified 2 documents, confirming that all out-of-stock products have been updated as requested.
   ```

   **Note:**

   Watch a video that demonstrates data exploration and querying through the MongoDB MCP Server.

For more examples of what you can do with the MCP Server, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)

#### Uninstall

To remove the MongoDB MCP Server, follow the steps for your installation method.

##### Plugin or Extension Install

For Claude Code, Codex, Cursor, or Gemini plugins, uninstall the MongoDB MCP Server through your AI client's plugin or extension manager.

##### Configuration File Install

Remove the `mongodb` entry from your AI client's MCP configuration file. In most clients, this entry is under `mcpServers`; for Codex, remove the `[mcp_servers.mongodb]` section. After you remove the entry, restart your AI client.

The configuration file location depends on your AI client:

| AI client | Configuration file location |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in your project or home directory |
| Gemini CLI | `~/.gemini/mcp.json` (user) or `.gemini/mcp.json` (project) |
| Codex | `~/.codex/config.toml` (user) or `.codex/config.toml` (project) |

## Manual Setup: Atlas Managed MCP Server

### Set up MongoDB Atlas Managed MCP Server.

### Atlas CLI

1. Login to Atlas.

   **Important:**

   You need **Atlas CLI 1.58.0** or later to complete this procedure. You can check your version by running `atlas --version` in your terminal. If you need to upgrade, see [MongoDB Atlas CLI Download](https://www.mongodb.com/try/download/atlascli).

   In your terminal, run the following command:

   ```bash
   atlas auth login -P mcp
   ```

   Select **UserAccount**. This returns a one-time verification code and directs you to an external browser window. Log in and verify your account using the one-time code, then come back to the terminal.

   Follow the prompts in terminal to finish configuring your profile.

2. Set your organization or project ID environment variable.

   Run the following command in your terminal to set your environment variables for an **organization-level** configuration, replacing `<ORG_ID>` with your organization ID.

   ```bash
   export ORG_ID="<ORG_ID>" # Set to use org-level config
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, you can set your project ID instead of your organization ID. Replace `<GROUP_ID>` with your project ID and run:

   ```bash
   export GROUP_ID="<GROUP_ID>" # Set to use project-level config instead of ORG_ID
   ```

3. Set your IP.

   Run the following command, replacing `<YOUR_IP_ADDRESS>` with your IP address:

   ```bash
   export MY_IP="<YOUR_IP_ADDRESS>"
   ```

4. Create your MCP configuration.

   Run the following commands to create an **organization-level** configuration, adding roles and your IP address for access:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["ORG_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createOrgMcpConfig \
   --orgId "$ORG_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-config.json <<EOF
   {
   "mcpConfigName": "my-config",
   "roles": ["GROUP_OWNER"],
   "ipAccessList": [{"ipAddress": "$MY_IP"}]
   }
   EOF

   read -r MCP_CONFIG_ID CLIENT_ID <<< "$(
   atlas api remoteMcpConfigurations createGroupMcpConfig \
   --groupId "$GROUP_ID" \
   --file /tmp/mcp-config.json \
   -P mcp \
   -o '{{.mcpConfigId}} {{.clientId}}'
   )"

   export MCP_CONFIG_ID
   export CLIENT_ID
   ```

5. Generate your client secret.

   Run the following commands to create a secret for your created **organization-level** configuration. Set the expiration time for the secret you are creating in `secretExpiresAfterHours`.

   **Important:**

   You can only retrieve the **secret** once. If you lose it, regenerate it by creating a new secret.

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
     atlas api remoteMcpConfigurations createOrgMcpSecret \
       --orgId "$ORG_ID" \
       --mcpConfigId "$MCP_CONFIG_ID" \
       --file /tmp/mcp-secret.json \
       -P mcp \
       -o '{{.secret}}'
   )

   export SECRET
   ```

   **Tip:**

   If you want to use **project-level configuration** instead, run the following commands:

   ```bash
   cat > /tmp/mcp-secret.json <<EOF
   {"secretExpiresAfterHours": 8760}
   EOF

   SECRET=$(
   atlas api remoteMcpConfigurations createGroupMcpSecret \
      --groupId "$GROUP_ID" \
      --mcpConfigId "$MCP_CONFIG_ID" \
      --file /tmp/mcp-secret.json \
      -P mcp \
      -o '{{.secret}}'
   )

   export SECRET
   ```

6. Access the MCP Server using Agent Frameworks.

   For programmatic access to the MCP server using agent frameworks like **LangChain**, you must fetch an access token and then call the MCP server from your application.

   **Tip:**

   The following example assumes you have `mcp[cli]`, `httpx`, and `httpx2` installed. You can install them using `pip`:

   ```none
   python3 -m pip install "mcp[cli]" httpx httpx2
   ```

   Here is an example Python script that uses the MCP SDK to access the MCP server:

   ```python
   import asyncio
   import base64
   import os

   import httpx
   import httpx2
   from mcp import ClientSession
   from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client

   async def fetch_access_token(client_id: str, client_secret: str) -> str:
       credentials = base64.b64encode(
           f"{client_id}:{client_secret}".encode()
       ).decode()

       async with httpx.AsyncClient() as client:
           response = await client.post(
               "https://cloud.mongodb.com/api/oauth/token",
               headers={
                   "Authorization": f"Basic {credentials}",
                   "Content-Type": "application/x-www-form-urlencoded",
                   "Accept": "application/json",
               },
               data={"grant_type": "client_credentials"},
           )
           response.raise_for_status()
           return response.json()["access_token"]

   async def main() -> None:
       client_id = os.environ["CLIENT_ID"]
       client_secret = os.environ["SECRET"]
       mcp_url = os.getenv("MCP_URL", "https://mcp.mongodb.com")

       token = await fetch_access_token(client_id, client_secret)

       headers = {
           "Authorization": f"Bearer {token}",
           "Accept": "application/json, text/event-stream",
           "MCP-Protocol-Version": "2025-11-25",
       }

       http_client = create_mcp_http_client(
           headers=headers,
           timeout=httpx2.Timeout(30.0),
       )

       async with http_client:
           async with streamable_http_client(
               mcp_url,
               http_client=http_client,
           ) as (read_stream, write_stream):
               async with ClientSession(read_stream, write_stream) as session:
                   init_result = await session.initialize()
                   print("Initialized:", init_result.protocol_version)

                   result = await session.list_tools()

                   for tool in result.tools:
                       print(tool.name)
                       if tool.description:
                           print(f"  {tool.description}")

   if __name__ == "__main__":
       asyncio.run(main())
   ```

## Troubleshooting

If you have issues with your MCP server configuration, see [Troubleshoot MongoDB MCP Server.](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration/troubleshooting.md#std-label-mcp-server-configuration-troubleshooting)

## Next Steps

For complete configuration options and available tools, see [Configure MCP Server and Connections](https://www.mongodb.com/docs/mcp-server/local-mcp/configuration.md#std-label-mcp-server-configuration) and [Supported Tools.](https://www.mongodb.com/docs/mcp-server/tools.md#std-label-mcp-server-tools)

For more usage examples, see [MongoDB MCP Server Usage Examples.](https://www.mongodb.com/docs/mcp-server/local-mcp/examples.md#std-label-mcp-server-examples)
