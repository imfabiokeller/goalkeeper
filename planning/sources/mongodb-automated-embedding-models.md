> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  other tabs: atlas, self
-->

# Models for Automated Embedding

Automated Embedding uses Voyage AI's embedding models, which Atlas hosts and manages in the Data Plane in a multi-tenant environment.

## Supported Models

Automated Embedding supports the following Voyage AI embedding models:

| Embedding Model | Description | Price Per 1M Tokens |
| --- | --- | --- |
| `voyage-4-lite` | Optimized for high-volume, cost-sensitive applications. | $0.02 |
| `voyage-4` | (**Recommended**) Balanced performance for general text search. | $0.06 |
| `voyage-4-large` | Maximum accuracy for complex semantic relationships. | $0.12 |
| `voyage-code-4` | (**Recommended for code**) Specialized for code search and technical documentation. | $0.12 |
| `voyage-code-3` | Legacy model specialized for code search and technical documentation. Use `voyage-code-4` instead. | $0.18 |

**Note:**

`voyage-code-4` requires an Atlas deployment. On self-managed deployments, use `voyage-code-3` for code search and technical documentation.

### Context Window Sizes

A context window is the maximum amount of text (measured in tokens, not characters) that an embedding or LLM model can consider in a single request. The maximum context window size for each model is as follows:

| Embedding Model | Context Window Size |
| --- | --- |
| `voyage-4-large` | 32,000 tokens |
| `voyage-4` | 32,000 tokens |
| `voyage-4-lite` | 32,000 tokens |
| `voyage-code-4` | 32,000 tokens |
| `voyage-code-3` | 32,000 tokens |

If the indexed text field is longer than the context window, the text is automatically truncated to the context window size for the model. If your query text exceeds this context window for the model, the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) query fails with a `context-limit-exceeded` error.

### Cost of Models

Model tokens are consumed during index operations (first time creation, inserts, update) and query operations. For the index operations, only the fields in the MongoDB document that are indexed as the `autoEmbed` type are used for embedding generation and incur a token usage. For the query operation, the query text provided is used for embedding generation and incurs a token usage. The cost for tokens for each model is as follows:

| Embedding Model | Cost per 1K Tokens | Cost per 1M Tokens |
| --- | --- | --- |
| `voyage-4-large` | $0.00012 | $0.12 |
| `voyage-4` | $0.00006 | $0.06 |
| `voyage-4-lite` | $0.00002 | $0.02 |
| `voyage-code-4` | $0.00012 | $0.12 |
| `voyage-code-3` | $0.00018 | $0.18 |

### Free Tokens

### Atlas

Atlas includes a one-time allocation of 200 million free tokens for each model at the organization level. The organization shares free tokens across all Atlas projects and clusters within the organization.

Free tokens do not refresh. For example, when new models are released, the free tokens for legacy models do not get reset. You can continue to use the remaining free tokens for the legacy model.

## Rate Limits

Rate limits are restrictions on the frequency and number of tokens you can request from Automated Embedding within a specified period of time. MongoDB enforces rate limits on embedding generation to ensure fair usage across all users in the multi-tenant environment. Rate limits are based on the requests per minute (RPM) and tokens per minute (TPM). These rate limits apply at a MongoDB Cluster level and are shared between all the indexes on that cluster using Automated embedding. To request higher rate limits, contact your MongoDB account team or MongoDB support.

Rate limits are applied separately to queries, first-time index builds, and index update operations (document inserts and updates), providing traffic isolation. Indexing build operations are strictly isolated from the real-time query traffic.

### First-time Index build Rate Limits

The first-time index build rate limits restrict the maximum frequency and number of tokens at which embeddings are generated. For large workloads during the first-time index build (initial sync), Automated Embedding uses a separate inference mechanism that is not bound by standard rate limits. This mechanism is optimized for throughput to handle the initial index build, provides the following benefits:

- Faster Initial Synchronization: Scale embedding generation throughput dynamically to handle massive bursts.

- Unbounded Throughput: Bursts up to available GPU capacity, and eliminate manual rate-limit increase requests.

- Fair Resource Sharing: Competing index builds converge to similar token-per-second allocation, avoiding starvation.

- Safe Ramp-Up: Starts at low concurrency and grows only on explicit internal success signals dynamically.

### Index Insert and Update Rate Limits

The index rate limits restrict the maximum frequency and number of tokens at which embeddings are generated during certain operations on MongoDB Vector Search Automated Embedding indexes. These operations include inserts (new data is added to your index) or updates (existing data changes that require re-embedding).

| Model | Requests Per Minute (RPM) | Tokens Per Minute (TPM) |
| --- | --- | --- |
| `voyage-4-large` | 2,000 | 3,000,000 |
| `voyage-4` | 2,000 | 8,000,000 |
| `voyage-4-lite` | 2,000 | 16,000,000 |
| `voyage-code-4` | 2,000 | 3,000,000 |
| `voyage-code-3` | 2,000 | 3,000,000 |

### Query Operations Rate Limits

The query rate limits control the maximum embedding generation frequency and the number of tokens for all queries that use the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) operations on your MongoDB Vector Search Automated Embedding indexes.

#### Free Cluster

##### Rate limits for M0 clusters without a payment method

| Model | Requests Per Minute (RPM) | Tokens Per Minute (TPM) |
| --- | --- | --- |
| `voyage-4-large` | 3 | 2,000 |
| `voyage-4` | 3 | 2,000 |
| `voyage-4-lite` | 3 | 2,000 |
| `voyage-code-4` | 3 | 2,000 |
| `voyage-code-3` | 3 | 2,000 |

#### Paid Cluster

##### Rate limits for M0 clusters with payment method, Flex clusters, and Dedicated clusters

| Model | Requests Per Minute (RPM) | Tokens Per Minute (TPM) |
| --- | --- | --- |
| `voyage-4-large` | 2,000 | 3,000,000 |
| `voyage-4` | 2,000 | 8,000,000 |
| `voyage-4-lite` | 2,000 | 16,000,000 |
| `voyage-code-4` | 2,000 | 3,000,000 |
| `voyage-code-3` | 2,000 | 3,000,000 |

## Best Practices

To optimize performance within rate limits:

1. **Create an Index on Prepopulated Collections When Possible**: The first-time index build (initial sync) benefits from a special inference mechanism that is not throughput bounded. Therefore, we recommend prepopulating your collection before creating an index.

2. **Batch Updates**: If you are performing bulk updates, monitor the index update throughput in the Automated Embedding dashboard's Usage page and space them out to avoid hitting rate limits.

3. **Monitor Usage**: Track your embedding generation in the Automated Embedding dashboard's Usage page to identify patterns and optimize.

4. **Upgrade When Needed**: If you consistently hit rate limits, consider adding a payment method for higher quotas, or reaching out to your MongoDB account team for higher rate limits.
