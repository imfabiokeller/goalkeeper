> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  other tabs: cosine, dotproduct, euclidean, dotProduct, vib, jsonib, basic, advanced, Single Index, Multiple Indexes, async, sync, flat, nested-root, filter
-->

# How to Index Fields for Vector Search

To run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against data in your cluster, you must create a `vectorSearch` type index on each collection that you want to query. You can configure the following types for each field that you index in a `vectorSearch` index:

- `vector` type to index a field containing vector embeddings that capture the semantic meaning of the text data that you want to query.

- `filter` type to index a field for pre-filtering your data. Filtering your data is useful to narrow the scope of your semantic search, such as in a multi-tenant environment.

**Note:**

You can't use the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) stage, [vectorSearch](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md#std-label-fts-vectorSearch-ref) operator, or the deprecated [knnBeta](https://www.mongodb.com/docs/search/query/operators-collectors/knn-beta.md#std-label-knn-beta-ref) operator to query fields indexed using the `vectorSearch` type index definition.

To run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against data in your cluster, you must create a `vectorSearch` type index on each collection that you want to query. You can configure the following types for each field that you index in a `vectorSearch` index:

- `autoEmbed` type to index a text field for which you want MongoDB Vector Search to automatically generate vector embeddings using Voyage AI models.

- `filter` type to index a field for pre-filtering your data. Filtering your data is useful to narrow the scope of your semantic search, such as in a multi-tenant environment.

To run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against data in your cluster, you must create a `vectorSearch` type index on each collection that you want to query. You can configure the following types for each field that you index in a `vectorSearch` index:

- `vector` type to index a field containing vector embeddings that capture the semantic meaning of the text data that you want to query.

- `filter` type to index a field for pre-filtering your data. Filtering your data is useful to narrow the scope of your semantic search, such as in a multi-tenant environment.

**Note:**

You can't use the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) stage, [vectorSearch](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md#std-label-fts-vectorSearch-ref) operator, or the deprecated [knnBeta](https://www.mongodb.com/docs/search/query/operators-collectors/knn-beta.md#std-label-knn-beta-ref) operator to query fields indexed using the `vectorSearch` type index definition.

**Important:**

Automated Embeddings is available as a Preview feature. The feature and the corresponding documentation might change at any time during the Preview period. Do not use this feature in your production environment. We do not use any customer data from this feature to train our models at this time. To learn more, see [Preview Features.](https://www.mongodb.com/docs/preview-features/)

To run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against data in your cluster, you must create a `vectorSearch` type index on each collection that you want to query. You can configure the following types for each field that you index in a `vectorSearch` index:

- `autoEmbed` type to index a text field for which you want MongoDB Vector Search to automatically generate vector embeddings using Voyage AI models.

- `filter` type to index a field for pre-filtering your data. Filtering your data is useful to narrow the scope of your semantic search, such as in a multi-tenant environment.

## Considerations

In a `vectorSearch` type index definition, you can index arrays with only a single element. You can't index embedding fields inside arrays of documents or embedding fields inside arrays of objects. You can index embedding fields inside documents using dot notation. The same embedding field can't be indexed multiple times in the same index defintion.

Before indexing your embeddings, we recommend converting your embeddings to BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) vectors with subtype `float32`, `int1`, or `int8` for efficient storage in your cluster.  To learn more, see [how to convert your embeddings to BSON vectors.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-avs-bindata-vector-subtype)

When you use MongoDB Vector Search indexes, you might experience elevated resource consumption on an idle node for your Atlas cluster. This is due to the underlying [mongot](https://www.mongodb.com/docs/search/query/query-ref.md#std-label-about-mongot) process, which performs various essential operations for MongoDB Vector Search. The CPU utilization on an idle node can vary depending on the number, complexity, and size of the indexes.

To learn more about sizing considerations for your indexes, see [Memory Requirements for Indexing Vectors.](https://www.mongodb.com/docs/vector-search/deployment/deployment-options.md#std-label-avs-index-memory-requirements)

If you make changes to the collection for which you defined a MongoDB Vector Search index, the latest data might not be available immediately for queries. However, `mongot` monitors the change streams and updates stored copies of data, making MongoDB Vector Search indexes eventually consistent. You can view the number of indexed Documents in the Atlas UI to verify that changes to the collection are reflected in the index.

Alternatively, you can create a new index after adding new documents to your collection and wait for the index to become queryable. You can also implement a polling logic similar to the following to ensure that the index is ready for querying before attempting to use it.

**Example:**

```text
console.log("Polling to check if the index is ready. This may take up to a minute.")
let isQueryable = false;
while (!isQueryable) {
  const cursor = collection.listSearchIndexes();
  for await (const index of cursor) {
    if (index.name === result) {
      if (index.queryable) {
        console.log(`${result} is ready for querying.`);
        isQueryable = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}
```

You can configure MongoDB Vector Search to automatically generate and manage vector embeddings for the text data in your collection and run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against the generated embeddings. You can create a MongoDB Vector Search index with type `autoEmbed` and choose from available Voyage AI embedding models to generate embeddings, simplifying indexing, updating, and querying with vectors.

When you configure Automated Embedding, MongoDB Vector Search automatically generates embeddings using the specified embedding model at index-time for the specified text field in your collection, during updates, and at query-time for your query text against the field indexed for automated embeddings.

You can also index additional fields in your collection for [pre-filtering](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-filter-auto-embed) your data. Filtering your data is useful to narrow the scope of your semantic search.

### Embeddings

The embeddings are generated on the search process, which might be computationally expensive. You might have to enable auto-scaling to handle the increased load during first-time index build.

Embeddings are stored on your MongoDB cluster. The storage size of the embeddings depends on the index settings like quantization and number of dimensions. You must ensure that there is sufficient disk space available on your cluster to store the embeddings.

The embedding model inference platform runs on MongoDB's infrastructure in Google Cloud in a US region.

### Billing

The pricing of embedding model used for generating embeddings is based on the number of tokens in your text field and queries. See [Billing for Automated Embedding](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/billing.md#std-label-auto-embed-billing) for more details.

### Querying

You must use the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage to query fields indexed as the `autoEmbed` type.

**Note:**

You can't use the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) [vectorSearch](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md#std-label-fts-vectorSearch-ref) or the deprecated [knnBeta](https://www.mongodb.com/docs/search/query/operators-collectors/knn-beta.md#std-label-knn-beta-ref) operator to query fields indexed using the `vectorSearch` type index definition.

See also, [Index Limitations.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-index-limitations)

If your collection already has embeddings, you must use the `vector` type fields to index the embeddings. In a `vectorSearch` type index definition, you can index arrays with only a single element. You can't index embedding fields inside arrays of documents or embedding fields inside arrays of objects. You can index embedding fields inside documents using dot notation. The same embedding field can't be indexed multiple times in the same index definition.

Before indexing your embeddings, we recommend converting your embeddings to BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) vectors with subtype `float32`, `int1`, or `int8` for efficient storage in your cluster.  To learn more, see [how to convert your embeddings to BSON vectors.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-avs-bindata-vector-subtype)

If you make changes to the collection for which you defined a MongoDB Vector Search index, the latest data might not be available immediately for queries. However, `mongot` monitors the change streams and updates stored copies of data, making MongoDB Vector Search indexes eventually consistent. You can implement a polling logic similar to the following to ensure that the index is ready for querying before attempting to use it.

**Example:**

```text
console.log("Polling to check if the index is ready. This may take up to a minute.")
let isQueryable = false;
while (!isQueryable) {
  const cursor = collection.listSearchIndexes();
  for await (const index of cursor) {
    if (index.name === result) {
      if (index.queryable) {
        console.log(`${result} is ready for querying.`);
        isQueryable = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}
```

If you want to generate embeddings for text data in your collection, you can use the `autoEmbed` type to index a field with text data. You must have a Voyage AI API (Application Programming Interface) key to generate the embeddings.

### API Keys

To automatically generate embeddings for your data using state-of-the-art Voyage AI models, MongoDB Vector Search uses the API (Application Programming Interface) key that you provided during deployment of `mongot` to authenticate to the Voyage AI endpoint.

You can generate and manage model API keys directly from the Atlas UI. To learn more about generating and managing API (Application Programming Interface) keys including [configuring the rate limits](https://www.mongodb.com/docs/voyageai/management/rate-limits.md#std-label-voyage-rate-limits) (which is a combination of TPM (Tokens Per Minute) and RPM (Requests Per Minute)) and [monitoring API key usage](https://www.mongodb.com/docs/voyageai/management/monitor-usage.md#std-label-voyage-monitor-usage), see [Model API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-manage-api-keys)

Alternatively, you can generate the API (Application Programming Interface) key directly from [Voyage AI](https://www.voyageai.com/). If you generate Voyage AI API (Application Programming Interface) key directly from Voyage AI, to learn more about managing the API (Application Programming Interface) keys, see [API Keys.](https://docs.voyageai.com/docs/api-key-and-installation/)

### Billing

Voyage AI model pricing is usage-based, with charges billed to the account linked to the API (Application Programming Interface) key used for access. Pricing is based on the number of tokens in your text field and queries.

If you generated the API (Application Programming Interface) key using your Atlas account, you can monitor API (Application Programming Interface) key usage from the Atlas UI. To learn more, see [Billing.](https://www.mongodb.com/docs/voyageai/management/billing.md#std-label-voyage-billing)

If you generated Voyage AI API (Application Programming Interface) key directly from Voyage AI, see [Pricing](https://docs.voyageai.com/docs/pricing/) to learn more about the charge for requests to the Voyage AI embedding endpoint.

### Querying

You must use the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage to query fields indexed as the `autoEmbed` type.

**Note:**

You can't use the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) stage, [vectorSearch](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md#std-label-fts-vectorSearch-ref) operator, or the deprecated [knnBeta](https://www.mongodb.com/docs/search/query/operators-collectors/knn-beta.md#std-label-knn-beta-ref) operator to query fields indexed using the `vectorSearch` type index definition.

## Syntax

The following syntax defines a `vector` type MongoDB Vector Search index:

```javascript
{
  "fields":[
    {
      "type": "vector",
      "path": "<field-to-index>",
      "numDimensions": <number-of-dimensions>,
      "similarity": "euclidean | cosine | dotProduct",
      "quantization": "none | scalar | binary",
      "indexingMethod": "flat | hnsw",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ],
  "nestedRoot": "<embedded-document-field-name>",
  "storedSource": {
    "include|exclude": ["<field-name>",...]
  }
}
```

The following syntax defines a `vector` type MongoDB Vector Search index:

```javascript
{
  "fields":[
    {
      "type": "vector",
      "path": "<field-to-index>",
      "numDimensions": <number-of-dimensions>,
      "similarity": "euclidean | cosine | dotProduct",
      "quantization": "none | scalar | binary",
      "indexingMethod": "flat | hnsw",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ],
  "nestedRoot": "<embedded-document-field-name>",
  "storedSource": {
    "include|exclude": ["<field-name>",...]
  }
}
```

The following syntax defines an `autoEmbed` type MongoDB Vector Search index:

```javascript
{
  "fields": [
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<field-name>",
      "model": "voyage-4-large | voyage-4 | voyage-4-lite | voyage-code-4 | voyage-code-3",
      "numDimensions": 256 | 512 | 1024 | 2048,
      "quantization": "float | scalar | binary | binaryNoRescore",
      "similarity": "dotProduct | cosine | euclidean",
      "indexingMethod": "flat | hnsw",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ],
  "nestedRoot": "<embedded-document-field-name>"
}
```

The following syntax defines an `autoEmbed` type MongoDB Vector Search index:

```javascript
{
  "fields": [
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<field-name>",
      "model": "voyage-4-large | voyage-4 | voyage-4-lite | voyage-code-3",
      "numDimensions": 256 | 512 | 1024 | 2048,
      "quantization": "float | scalar | binary | binaryNoRescore",
      "similarity": "dotProduct | cosine | euclidean",
      "indexingMethod": "flat | hnsw",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ]
}
```

## MongoDB Vector Search Index Fields

The MongoDB Vector Search index definition takes the following fields:

| Option | Type | Necessity | Purpose |
| --- | --- | --- | --- |
| `fields` | Array of field definition documents | Required | Definitions for the vector and filter fields to index, one definition per document. Each field definition document specifies the `type`, `path`, and other configuration options for the field to index. The `fields` array must contain at least one `vector`-type field definition. You can add additional `filter`-type field definitions to your array to pre-filter your data. |
| `fields.``type` | String | Required | Field type to use to index fields for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch). You can specify one of the following values: `vector` - for fields that contain vector embeddings.; `filter` - for additional fields to filter on. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. To learn more, see [About the `vector` Type](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector) and [About the `filter` Type.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-filter-vector) |
| `fields.``path` | String | Required | Name of the field to index. For nested fields, use dot notation to specify path to embedded fields. The field must be a top-level field or a child of the field specified in the `nestedRoot` option. |
| `fields.``numDimensions` | Int | Required | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. You can set this field only for `vector`-type fields. You must specify a value less than or equal to `8192`. For indexing quantized vectors or [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method), you can specify one of the following values: `1` to `8192` for `int8` vectors for ingestion.; Multiple of `8` for `int1` vectors for ingestion.; `1` to `8192` for `binData(float32)` and `array(float32)` vectors for automatic scalar quantization.; Multiple of `8` for `binData(float32)` and `array(float32)` vectors for automatic binary quantization. The embedding model you choose determines the number of dimensions in your vector embeddings, with some models having multiple options for how many dimensions are output. To learn more, see [Choosing a Method to Create Embeddings.](https://www.mongodb.com/docs/vector-search/crud-embeddings/create-embeddings-manual.md#std-label-choose-embedding-method) |
| `fields.``similarity` | String | Required | Vector similarity function to use to search for top K-nearest neighbors. You can set this field only for `vector`-type fields. You can specify one of the following values: `euclidean` - measures the distance between ends of vectors.; `cosine` - measures similarity based on the angle between vectors.; `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. To learn more, see [About the Similarity Functions.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions) |
| `fields.``quantization` | String | Optional | Type of automatic vector quantization for your vectors. Use this setting only if your embeddings are `float` or `double` vectors. You can specify one of the following values: `none` - Indicates no automatic quantization for the vector embeddings. Use this setting if you have pre-quantized vectors for ingestion. If omitted, this is the default value.; `scalar` - Indicates scalar quantization, which transforms values to 1 byte integers.; `binary` - Indicates binary quantization, which transforms values to a single bit. To use this value, `numDimensions` must be a multiple of 8.If precision is critical, select `none` or `scalar` instead of `binary`. To learn more, see [About Quantization.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-quantization) |
| `fields.``indexingMethod` | String | Optional | Index structure for the vector field. Value can be: `hnsw` - for graph-based index where similar vectors are connected; `flat` - for flat, non-graph, index If omitted, defaults to `hnsw`. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) This setting is not yet available in the Atlas UI Visual Editor. Use the JSON Editor instead. |
| `fields.``hnswOptions` | Object | Optional | Parameters to use for [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph construction. You can specify this field only if `indexingMethod` is `hnsw`. If omitted, uses the default values for the `maxEdges` and `numEdgeCandidates` parameters. NOTE: We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) This setting is not yet available in the Atlas UI Visual Editor. Use the JSON Editor instead. |
| `fields.``hnswOptions.``maxEdges` | Int | Optional | Maximum number of edges (or connections) that a node can have in the HNSW (Hierarchical Navigable Small Worlds) graph. Value can be between `16` and `64`, both inclusive. If omitted, defaults to `16`. For example, for a value of `16`, each node can have a maximum of sixteen outgoing edges at each layer of the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. A higher number improves [recall](https://www.mongodb.com/docs/manual/reference/glossary.md#std-term-recall) (accuracy of search results) because the graph is better connected. However, this slows down query speed because of the number of neighbors to evaluate per graph node, increases the memory for the HNSW (Hierarchical Navigable Small Worlds) graph because each node stores more connections, and slows down indexing because MongoDB Vector Search evaluates more neighbors and adjusts for every new node added to the graph. |
| `fields.``hnswOptions.``numEdgeCandidates` | Int | Optional | Analogous to `numCandidates` at query-time, this parameter controls the maximum number of nodes to evaluate to find the closest neighbors to connect to a new node. Value can be between `100` and `3200`, both inclusive. If omitted, defaults to `100`. A higher number provides a graph with high-quality connections, which can improve search quality (recall), but it can also negatively affect query latency. |
| `nestedRoot` | String | Optional | Path to the array field for vector fields that are nested in an array of documents. If you specify a value, the value of `fields.path` must be a child of the field specified here. This setting is not yet available in the Atlas UI Visual Editor. Use the JSON Editor instead. |
| `storedSource` | Object | Optional | Specifies the fields in the documents to store for query-time look-ups using the `returnStoredSource` option. Value must be an object that specifies the fields to `include` or `exclude` from storage. By default, MongoDB Vector Search doesn't store any fields on `mongot`. To learn more, see [About Stored Source.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-stored-source-definition) |
| `storedSource.``include` | Array of Strings | Optional | List of fields or dot-separated paths to fields to store. In addition to the specified fields, MongoDB Vector Search stores `_id` also by default. Either `include` or `exclude` is required. |
| `storedSource.``exclude` | Array of Strings | Optional | List of fields or dot-separated paths to fields to exclude from being stored. If specified, MongoDB Vector Search stores original documents except the fields listed here. Either `exclude` or `include` is required. |

The MongoDB Vector Search index definition takes the following fields:

| Option | Type | Necessity | Purpose |
| --- | --- | --- | --- |
| `fields` | Array of field definition documents | Required | Definitions for the vector and filter fields to index, one definition per document. Each field definition document specifies the `type`, `path`, and other configuration options for the field to index. The `fields` array must contain at least one `vector`-type field definition. You can add additional `filter`-type field definitions to your array to pre-filter your data. |
| `fields.``type` | String | Required | Field type to use to index fields for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch). You can specify one of the following values: `vector` - for fields that contain vector embeddings.; `filter` - for additional fields to filter on. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. To learn more, see [About the `vector` Type](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector) and [About the `filter` Type.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-filter-vector) |
| `fields.``path` | String | Required | Name of the field to index. For nested fields, use dot notation to specify path to embedded fields. |
| `fields.``numDimensions` | Int | Required | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. You can set this field only for `vector`-type fields. You must specify a value less than or equal to `8192`. For indexing quantized vectors or [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method), you can specify one of the following values: `1` to `8192` for `int8` vectors for ingestion.; Multiple of `8` for `int1` vectors for ingestion.; `1` to `8192` for `binData(float32)` and `array(float32)` vectors for automatic scalar quantization.; Multiple of `8` for `binData(float32)` and `array(float32)` vectors for automatic binary quantization. The embedding model you choose determines the number of dimensions in your vector embeddings, with some models having multiple options for how many dimensions are output. To learn more, see [Choosing a Method to Create Embeddings.](https://www.mongodb.com/docs/vector-search/crud-embeddings/create-embeddings-manual.md#std-label-choose-embedding-method) |
| `fields.``similarity` | String | Required | Vector similarity function to use to search for top K-nearest neighbors. You can set this field only for `vector`-type fields. You can specify one of the following values: `euclidean` - measures the distance between ends of vectors.; `cosine` - measures similarity based on the angle between vectors.; `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. To learn more, see [About the Similarity Functions.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions) |
| `fields.``quantization` | String | Optional | Type of automatic vector quantization for your vectors. Use this setting only if your embeddings are `float` or `double` vectors. You can specify one of the following values: `none` - Indicates no automatic quantization for the vector embeddings. Use this setting if you have pre-quantized vectors for ingestion. If omitted, this is the default value.; `scalar` - Indicates scalar quantization, which transforms values to 1 byte integers.; `binary` - Indicates binary quantization, which transforms values to a single bit. To use this value, `numDimensions` must be a multiple of 8.If precision is critical, select `none` or `scalar` instead of `binary`. To learn more, see [About Quantization.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-quantization) |
| `fields.``indexingMethod` | String | Optional | Index structure for the vector field. Value can be: `hnsw` - for graph-based index where similar vectors are connected; `flat` - for flat, non-graph, index If omitted, defaults to `hnsw`. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) |
| `fields.``hnswOptions` | Object | Optional | Parameters to use for [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph construction. You can specify this field only if `indexingMethod` is `hnsw`. If omitted, uses the default values for the `maxEdges` and `numEdgeCandidates` parameters. NOTE: We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) |
| `fields.``hnswOptions.``maxEdges` | Int | Optional | Maximum number of edges (or connections) that a node can have in the HNSW (Hierarchical Navigable Small Worlds) graph. Value can be between `16` and `64`, both inclusive. If omitted, defaults to `16`. For example, for a value of `16`, each node can have a maximum of sixteen outgoing edges at each layer of the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. A higher number improves [recall](https://www.mongodb.com/docs/manual/reference/glossary.md#std-term-recall) (accuracy of search results) because the graph is better connected. However, this slows down query speed because of the number of neighbors to evaluate per graph node, increases the memory for the HNSW (Hierarchical Navigable Small Worlds) graph because each node stores more connections, and slows down indexing because MongoDB Vector Search evaluates more neighbors and adjusts for every new node added to the graph. |
| `fields.``hnswOptions.``numEdgeCandidates` | Int | Optional | Analogous to `numCandidates` at query-time, this parameter controls the maximum number of nodes to evaluate to find the closest neighbors to connect to a new node. Value can be between `100` and `3200`, both inclusive. If omitted, defaults to `100`. A higher number provides a graph with high-quality connections, which can improve search quality (recall), but it can also negatively affect query latency. |
| `storedSource` | Object | Optional | Specifies the fields in the documents to store for query-time look-ups using the `returnStoredSource` option. Value must be an object that specifies the fields to `include` or `exclude` from storage. By default, MongoDB Vector Search doesn't store any fields on `mongot`. To learn more, see [About Stored Source.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-stored-source-definition) |
| `storedSource.``include` | Array of Strings | Optional | List of fields or dot-separated paths to fields to store. In addition to the specified fields, MongoDB Vector Search stores `_id` also by default. Either `include` or `exclude` is required. |
| `storedSource.``exclude` | Array of Strings | Optional | List of fields or dot-separated paths to fields to exclude from being stored. If specified, MongoDB Vector Search stores original documents except the fields listed here. Either `exclude` or `include` is required. |

The MongoDB Vector Search index definition takes the following fields:

| Option | Type | Necessity | Purpose |
| --- | --- | --- | --- |
| `fields` | Array of field definition documents | Required | Definitions for the vector and filter fields to index, one definition per document. Each field definition document specifies the `type`, `path`, and other configuration options for the field to index. The `fields` array must contain one `autoEmbed` type field definition. You can add additional `filter`-type field definitions to your array to pre-filter your data. |
| `fields.``type` | String | Required | Field type to use to index fields for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch). You can specify one of the following values: `autoEmbed` - for automatically generating vector embeddings.; `filter` - for pre-filtering documents by non-vector fields. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. To learn more, see [About the `autoEmbed` Type](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-auto-embed) and [About the `filter` Type.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-filter-auto-embed) |
| `fields.``modality` | String | Required | Type of data in the field that you specified in the `path`. Value must be `text`. |
| `fields.``path` | String | Required | Name of the top-level or nested text field to index. For nested fields, use [dot notation](https://www.mongodb.com/docs/manual/core/document.md#std-label-document-dot-notation) to specify the path to embedded fields. If the field is nested in an array of documents, the field must be a child of the field specified in the `nestedRoot` option. If the text value in the specified field exceeds 32,000 tokens, MongoDB Vector Search automatically truncates during indexing to fit the context window of the embedding model. |
| `fields.``model` | String | Required | Voyage AI embedding model to use for generating the embeddings. You can specify one of the following models: `voyage-4-lite` - Optimized for high-volume, cost-sensitive applications.; `voyage-4` - (**Recommended**) Balanced performance for general text search.; `voyage-4-large` - Maximum accuracy for complex semantic relationships.; `voyage-code-4` - (**Recommended for code**) Specialized for code search and technical documentation.; `voyage-code-3` - Legacy model specialized for code search and technical documentation. Use `voyage-code-4` instead. To learn more, see [Automated Embedding Models.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-avs-auto-embeddings-model-ecosystem) |
| `fields.``numDimensions` | Int | Optional | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. You can specify one of the following values: `256`; `512`; `1024`; `2048` If omitted, defaults to `1024` vector dimensions. |
| `nestedRoot` | String | Optional | Path to the top-level array of documents field that contains the field for which you want to configure Automated Embedding. If you specify a value, the value of `fields.path` must be a child of the field specified here. This setting is not yet available in the Atlas UI Visual Editor. Use the JSON Editor instead. |
| `fields.``quantization` | String | Optional | Data type to use to store the embeddings. You can specify one of the following values: `float` - Builds an index using float (4 bytes) vector values.; `scalar` - Builds an index using scalar (1 byte) vector values.; `binary` - Builds an index with binary (1 bit) vector values and rescores using float (full-precision) vector values.; `binaryNoRescore` - Builds an index with binary vector values. Compared to `binary` (binary quantization with rescoring), this option ensures faster query and lowers storage costs, but provides lower accuracy. If omitted, defaults to `scalar` quantization. To learn more, see [About Quantization.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-quantization-auto) |
| `fields.``similarity` | String | Optional | Vector similarity function to use to search for top K-nearest neighbors. You can specify one of the following values: `euclidean` - measures the distance between ends of vectors.; `cosine` - measures similarity based on the angle between vectors.; `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. To learn more, see [About the Similarity Functions.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-similarity-functions-auto) |
| `fields.``indexingMethod` | String | Optional | Index structure for the vector field. Value can be: `hnsw` - for graph-based index where similar vectors are connected; `flat` - for flat, non-graph, index If omitted, defaults to `hnsw`. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-indexing-method-auto) |
| `fields.``hnswOptions` | Object | Optional | Parameters to use for [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph construction. If omitted, uses the default values for the `maxEdges` and `numEdgeCandidates` parameters. NOTE: We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) |
| `fields.``hnswOptions.``maxEdges` | Int | Optional | Maximum number of edges (or connections) that a node can have in the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. Value can be between `16` and `64`, both inclusive. If omitted, defaults to `16`. For example, for a value of `16`, each node can have a maximum of sixteen outgoing edges at each layer of the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. A higher number improves [recall](https://www.mongodb.com/docs/manual/reference/glossary.md#std-term-recall) (accuracy of search results) because the graph is better connected. However, this slows down query speed because of the number of neighbors to evaluate per graph node, increases the memory for the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph because each node stores more connections, and slows down indexing because MongoDB Vector Search evaluates more neighbors and adjusts for every new node added to the graph. |
| `fields.``hnswOptions.``numEdgeCandidates` | Int | Optional | Analogous to `numCandidates` at query-time, this parameter controls the maximum number of nodes to evaluate to find the closest neighbors to connect to a new node. Value can be between `100` and `3200`, both inclusive. If omitted, defaults to `100`. A higher number provides a graph with high-quality connections, which can improve search quality (recall), but it can also negatively affect query latency. |

The MongoDB Vector Search index definition takes the following fields:

| Option | Type | Necessity | Purpose |
| --- | --- | --- | --- |
| `fields` | Array of field definition documents | Required | Definitions for the vector and filter fields to index, one definition per document. Each field definition document specifies the `type`, `path`, and other configuration options for the field to index. The `fields` array must contain one `autoEmbed` type field definition. You can add additional `filter`-type field definitions to your array to pre-filter your data. |
| `fields.``type` | String | Required | Field type to use to index fields for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch). You can specify one of the following values: `autoEmbed` - for automatically generating vector embeddings.; `filter` - for pre-filtering documents by non-vector fields. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. To learn more, see [About the `autoEmbed` Type](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-auto-embed-self-managed) and [About the `filter` Type.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-filter-auto-embed-self-managed) |
| `fields.``modality` | String | Required | Type of data in the field that you specified in the `path`. Value must be `text`. |
| `fields.``path` | String | Required | Name of the top-level or nested text field to index. For nested fields, use [dot notation](https://www.mongodb.com/docs/manual/core/document.md#std-label-document-dot-notation) to specify the path to embedded fields. Automated embedding does not support generating vector embeddings for fields that are nested within an array of objects or subdocuments. If the text value in the specified field exceeds 32,000 tokens, MongoDB Vector Search automatically truncates during indexing to fit the context window of the embedding model. |
| `fields.``model` | String | Required | Voyage AI embedding model to use for generating the embeddings. You can specify one of the following models: `voyage-4-lite` - Optimized for high-volume, cost-sensitive applications.; `voyage-4` - (**Recommended**) Balanced performance for general text search.; `voyage-4-large` - Maximum accuracy for complex semantic relationships.; `voyage-code-3` - Specialized for code search and technical documentation. To learn more, see [Automated Embedding Models.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-avs-auto-embeddings-model-ecosystem) |
| `fields.``numDimensions` | Int | Optional | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. You can specify one of the following values: `256`; `512`; `1024`; `2048` If omitted, defaults to `1024` vector dimensions. |
| `fields.``quantization` | String | Optional | Data type to use to store the embeddings. You can specify one of the following values: `float` - Builds an index using float (4 bytes) vector values.; `scalar` - Builds an index using scalar (1 byte) vector values.; `binary` - Builds an index with binary (1 bit) vector values and rescores using float (full-precision) vector values.; `binaryNoRescore` - Builds an index with binary vector values. Compared to `binary` (binary quantization with rescoring), this option ensures faster query and lowers storage costs, but provides lower accuracy. If omitted, defaults to `scalar` quantization. To learn more, see [About Quantization.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-quantization-auto-self-managed) |
| `fields.``similarity` | String | Optional | Vector similarity function to use to search for top K-nearest neighbors. You can specify one of the following values: `euclidean` - measures the distance between ends of vectors.; `cosine` - measures similarity based on the angle between vectors.; `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. To learn more, see [About the Similarity Functions.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-similarity-functions-auto-self-managed) |
| `fields.``indexingMethod` | String | Optional | Index structure for the vector field. Value can be: `hnsw` - for graph-based index where similar vectors are connected; `flat` - for flat, non-graph, index If omitted, defaults to `hnsw`. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-indexing-method-auto-self-managed) |
| `fields.``hnswOptions` | Object | Optional | Parameters to use for [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph construction. If omitted, uses the default values for the `maxEdges` and `numEdgeCandidates` parameters. NOTE: We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed. To learn more, see [About the Indexing Methods.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-vector-index-method) |
| `fields.``hnswOptions.``maxEdges` | Int | Optional | Maximum number of edges (or connections) that a node can have in the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. Value can be between `16` and `64`, both inclusive. If omitted, defaults to `16`. For example, for a value of `16`, each node can have a maximum of sixteen outgoing edges at each layer of the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph. A higher number improves [recall](https://www.mongodb.com/docs/manual/reference/glossary.md#std-term-recall) (accuracy of search results) because the graph is better connected. However, this slows down query speed because of the number of neighbors to evaluate per graph node, increases the memory for the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph because each node stores more connections, and slows down indexing because MongoDB Vector Search evaluates more neighbors and adjusts for every new node added to the graph. |
| `fields.``hnswOptions.``numEdgeCandidates` | Int | Optional | Analogous to `numCandidates` at query-time, this parameter controls the maximum number of nodes to evaluate to find the closest neighbors to connect to a new node. Value can be between `100` and `3200`, both inclusive. If omitted, defaults to `100`. A higher number provides a graph with high-quality connections, which can improve search quality (recall), but it can also negatively affect query latency. |

### About the `vector` Type

Your index definition's `vector` type field must contain an array of numbers of *one* of the following types:

- BSON (Binary Javascript Object Notation) `double`

- BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) `vector` subtype `float32`

- BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) `vector` subtype `int1`

- BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) `vector` subtype `int8`

**Note:**

To learn more about generating BSON (Binary Javascript Object Notation) [BinData](https://www.mongodb.com/docs/manual/reference/method/BinData.md#std-label-server-binData-method) vectors with subtype `float32` `int1` or `int8` for your data, see [How to Ingest Pre-Quantized Vectors.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-avs-bindata-vector-subtype)

You must index the vector field as the `vector` type inside the `fields` array. You can specify multiple `vector` type fields inside the `fields` array. In the index definition for the `vector` type, you configure some additional required and optional parameters (highlighted below) to index the field:

```json
{
  "fields":[
    {
      "type": "vector",
      "path": <field-to-index>,
      "numDimensions": <number-of-dimensions>,
      "similarity": "euclidean | cosine | dotProduct",
      "quantization": "none | scalar | binary",
      "indexingMethod": "flat | hnsw",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    ...
  ]
}
```

#### About the Similarity Functions

MongoDB Vector Search supports the following similarity functions:

- `euclidean` - measures the distance between ends of vectors. This value allows you to measure similarity based on varying dimensions. To learn more, see [Euclidean.](https://en.wikipedia.org/wiki/Euclidean_distance)

- `cosine` - measures similarity based on the angle between  vectors. This value allows you to measure similarity that isn't scaled by magnitude. You can't use zero magnitude vectors with `cosine`. To measure cosine similarity, we recommend that you normalize your vectors and use `dotProduct` instead.

- `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. If you normalize the magnitude, `cosine` and `dotProduct` are almost identical in measuring similarity.

  To use `dotProduct`, you must normalize the vector to unit length at index-time and query-time.

The following table shows the similarity functions for the various types:

| Vector Embeddings Type | `euclidean` | `cosine` | `dotProduct` |
| --- | --- | --- | --- |
| `binData(int1)` | √ |  | |
| `binData(int8)` | √ | √ | √ |
| `binData(float32)` | √ | √ | √ |
| `array(float32)` | √ | √ | √ |

&#x20;For vector ingestion.

&#x20;For automatic scalar or binary quantization.

The formula for each similarity function is as follows:

### Cosine

For `cosine`, MongoDB Vector Search uses the following algorithm to normalize the score:

```shell
score = (1 + cosine(v1,v2)) / 2
```

This algorithm normalizes the score by considering the similarity score of the document vector (`v1`) and the query vector (`v2`), which has the range \[`-1`, `1`]. MongoDB Vector Search adds `1` to the similarity score to normalize the score to a range \[`0`, `2`] and then divides by `2` to ensure a value between `0` and `1`.

For best performance, check your embedding model to determine which similarity function aligns with your embedding model's training process. If you don't have any guidance, start with `dotProduct`. Setting `fields.similarity` to the `dotProduct` value allows you to efficiently measure similarity based on both angle and magnitude. `dotProduct` consumes less computational resources than `cosine` and is efficient when vectors are of unit length. However, if your vectors aren't normalized, evaluate the similarity scores in the results of a sample query for `euclidean` distance and `cosine` similarity to determine which corresponds to reasonable results.

#### About the Indexing Methods

The `indexingMethod` determines how MongoDB Vector Search indexes and searches vectors. You can specify one of the following values:

- `hnsw` - Graph-based index structure (default)

- `flat` - Flat, non-graph index structure

**HNSW Index Structure**

MongoDB Vector Search defaults to the HNSW (Hierarchical Navigable Small Worlds) index structure, which suits the majority of workflows. This graph-based index type performs ANN (Approximate Nearest Neighbor) search across large datasets, trading accuracy for speed and scalability.

Use `hnsw` if:

- Your production systems require fast queries across massive datasets using ANN (Approximate Nearest Neighbor).

- You have a large number of per-tenant or per-collection vectors.

- You want to tune recall or latency by using `numCandidates`.

- Multiple users query large shared datasets.

You can also specify `hnswOptions` to override the default values for the following HNSW (Hierarchical Navigable Small Worlds) settings:

- `maxEdges`: Maximum number of edges, or connections, that a node can have in the HNSW (Hierarchical Navigable Small Worlds) graph.

- `numEdgeCandidates`: Maximum number of nodes that MongoDB Vector Search evaluates to find the closest neighbors to connect to a new node.

**Note:**

We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed.

To run an exhaustive search, or ENN (Exact Nearest Neighbor) search, on an HNSW (Hierarchical Navigable Small Worlds) index, set the `exact` parameter to `true`.

**Flat Index Structure**

This index type performs exhaustive search and ensures 100% recall (perfect accuracy), unlike the ANN (Approximate Nearest Neighbor) search that HNSW (Hierarchical Navigable Small Worlds) provides. The flat index requires less CPU and memory overhead because MongoDB Vector Search does not build or maintain a graph. However, query speed decreases on larger datasets because query time grows linearly with data growth.

Use `flat` if:

- Your queries use highly selective prefilters that match less than 5% of documents. For example, consider a multitenant workload with `tenantId` in the filter.

- Your applications require each user to search only their own data.

- You have small to medium datasets where high recall is mandatory.

This option is mutually exclusive with `hnswOptions`.

#### About Quantization

MongoDB Vector Search supports automatic quantization of your float vector embeddings (both 32-bit and 64-bit).

Quantization is the process of shrinking full-fidelity vectors into fewer bits. It reduces the amount of main memory required to store each vector in a MongoDB Vector Search index by indexing the reduced representation vectors instead. This allows for storage of more vectors or vectors with higher dimensions. Therefore, quantization reduces resource consumption and improves speed. We recommend quantization for applications with a large number of vectors, such as over 100,000.

##### Scalar Quantization

[Scalar quantization](https://www.mongodb.com/docs/manual/reference/glossary.md#std-term-scalar-quantization) involves first identifying the minimum and maximum values for each dimension of the indexed vectors to establish a range of values for a dimension. Then, the range is divided into equally sized intervals or bins. Finally, each float value is mapped to a bin to convert the continuous float values into discrete integers. In MongoDB Vector Search, this quantization reduces the vector embedding's RAM cost to about one fourth (`1/3.75`) of the pre-quantization cost.

##### Binary Quantization

Binary quantization involves assuming a midpoint of `0` for each dimension, which is typically appropriate for embeddings normalized to length `1` such as  OpenAI's `text-embedding-3-large`. Then, each value in the vector is compared to the midpoint and assigned a binary value of `1` if it's greater than the midpoint and a binary value of `0` if it's less than or equal to the midpoint. In MongoDB Vector Search, this quantization reduces the vector embedding's RAM cost to one twenty-fourth (`1/24`) of the pre-quantization cost. The reason it's not `1/32` is because the data structure containing the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) graph itself, separate from the vector values, isn't compressed.

When you run a query, MongoDB Vector Search converts the float value in the query vector into a binary vector using the same midpoint for efficient comparison between the query vector and indexed binary vectors. It then rescores by reevaluating the identified candidates in the binary comparison using the original float values associated with those results from the binary index to further refine the results. The full fidelity vectors are stored in their own data structure on disk, and are only referenced during rescoring when you configure binary quantization or when you perform exact search against either binary or scalar quantized vectors.

#### About Stored Source

The `storedSource` option allows you to store copies of fields inside the MongoDB Vector Search index in addition to the database. This improves query performance in certain [Sample Use](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-mdb-vs-return-stored-source-use-case) as it reduces the need for implicit query time lookup on the backend database.

MongoDB Vector Search doesn't index stored fields. Therefore, you must index the fields separately to [filter](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-vectorSearch-agg-pipeline-filter) on them. You can retrieve stored fields at query-time by using the [returnStoredSource](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-avs-return-stored-source) option.

To learn more about retrieving the stored fields, see [returnStoredSource.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-avs-return-stored-source)

### About the `autoEmbed` Type

Your index definition's `autoEmbed` field must contain only text. You must index the text field as the `autoEmbed` type inside the fields array. In the index definition for the `autoEmbed` type, you must configure the fields highlighted below:

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<fieldToIndex>",
      "model": "voyage-4 | voyage-4-large | voyage-4-lite | voyage-code-4 | voyage-code-3"
    }
  ]
}
```

Values for the `autoEmbed` type fields like `quantization`, `numDimensions`,  `indexingMethod` and `similarity` are set by default if you omit them when you define the index.

Optionally, you can configure the values for these fields in your index definition.

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<fieldToIndex>",
      "model": "<embeddingModel>",
      "quantization": "float | scalar | binary | binaryNoRescore",
      "numDimensions": 256 | 512 | 1024 | 2048,
      "indexingMethod": "flat | hnsw",
      "similarity": "cosine | dotProduct | euclidean",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    }
  ],
  "nestedRoot": "<embedded-document-field-name>"
}
```

#### About the Similarity Functions

MongoDB Vector Search supports the following similarity functions:

- `euclidean` - measures the distance between ends of vectors. This value allows you to measure similarity based on varying dimensions. To learn more, see [Euclidean](https://en.wikipedia.org/wiki/Euclidean_distance). This is the recommended option when using `binary` or `binaryNoRescore` quantization in Automated Embedding.

- `cosine` - measures similarity based on the angle between vectors. This value allows you to measure similarity that isn't scaled by magnitude. This is the recommended option when using `scalar` quantization in Automated Embedding.

- `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. When the output of the embedding models is normalized to unit length, `cosine` and `dotProduct` are identical in measuring similarity. This is the recommended option when using `float` quantization in Automated Embedding.

The formula for each similarity function is as follows:

### Cosine

For `cosine`, MongoDB Vector Search uses the following algorithm to normalize the score:

```shell
score = (1 + cosine(v1,v2)) / 2
```

- This algorithm normalizes the score by considering the similarity score of the document vector (`v1`) and the query vector (`v2`), which has the range \[`-1`, `1`]. MongoDB Vector Search adds `1` to the similarity score to normalize the score to a range \[`0`, `2`] and then divides by `2` to ensure a value between `0` and `1`.

#### About Quantization

Automated Embedding supports a variety of quantization methods. By default, it uses `scalar` quantization.

##### `float` Quantization

`float` quantization stores the vector embeddings as 32-bit float values. This option provides the highest accuracy, but also the highest storage and RAM costs. By default, Automated Embedding uses `dotProduct` as the similarity function for this quantization type.

##### `scalar` Quantization

The `scalar` quantization type in Automated Embedding builds index with **scalar/int8 (1 byte) vectors**, which are provided by the embedding model. For Automated Embedding, this quantization reduces the vector embedding's storage and RAM cost to about one fourth compared the `float` quantization. By default, Automated Embedding uses `cosine` as the similarity function for this quantization type. This is the default quantization type for Automated Embedding.

##### `binary` Quantization

Binary quantization in Automated Embedding builds index with binary (1 bit) vector values, but also stores full-precision vectors. The full-precision vectors are provided by the embedding model and MongoDB Vector Search quantizes them to binary during index creation.

MongoDB Vector Search rescoring involves re-ranking a subset of the top binary vector search results using their full-precision counterparts to ensure accurate search results from compressed vectors. This reduces the RAM cost to one twenty-fourth (`1/24`) compared to `float` quantization type. By default, Automated Embedding uses `euclidean` as the [similarity function.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions)

##### `binaryNoRescore` Quantization

The `binaryNoRescore` quantization type in Automated Embedding builds index with binary (1 bit) vector values, which are provided by the embedding model. Compared to `binary` (binary quantization with rescoring), this option ensures faster query and lowers storage costs, but provides lower accuracy. By default, Automated Embedding uses `euclidean` as the [similarity function.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions)

#### About the Indexing Methods

The `indexingMethod` determines how MongoDB Vector Search indexes and searches vectors. You can specify one of the following values:

- `hnsw` - Graph-based index structure (default)

- `flat` - Flat, non-graph index structure

**HNSW Index Structure**

MongoDB Vector Search defaults to the HNSW (Hierarchical Navigable Small Worlds) index structure, which suits the majority of workflows. This graph-based index type performs ANN (Approximate Nearest Neighbor) search across large datasets, trading accuracy for speed and scalability.

Use `hnsw` if:

- Your production systems require fast queries across massive datasets using ANN (Approximate Nearest Neighbor).

- You have a large number of per-tenant or per-collection vectors.

- You want to tune recall or latency by using `numCandidates`.

- Multiple users query large shared datasets.

You can also specify `hnswOptions` to override the default values for the following HNSW (Hierarchical Navigable Small Worlds) settings:

- `maxEdges`: Maximum number of edges, or connections, that a node can have in the HNSW (Hierarchical Navigable Small Worlds) graph.

- `numEdgeCandidates`: Maximum number of nodes that MongoDB Vector Search evaluates to find the closest neighbors to connect to a new node.

**Note:**

We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed.

To run an exhaustive search, or ENN (Exact Nearest Neighbor) search, on an HNSW (Hierarchical Navigable Small Worlds) index, set the `exact` parameter to `true`.

**Flat Index Structure**

This index type performs exhaustive search and ensures 100% recall (perfect accuracy), unlike the ANN (Approximate Nearest Neighbor) search that HNSW (Hierarchical Navigable Small Worlds) provides. The flat index requires less CPU and memory overhead because MongoDB Vector Search does not build or maintain a graph. However, query speed decreases on larger datasets because query time grows linearly with data growth.

Use `flat` if:

- Your queries use highly selective prefilters that match less than 5% of documents. For example, consider a multitenant workload with `tenantId` in the filter.

- Your applications require each user to search only their own data.

- You have small to medium datasets where high recall is mandatory.

This option is mutually exclusive with `hnswOptions`.

### About the `autoEmbed` Type

Your index definition's `autoEmbed` field must contain only text. You must index the text field as the `autoEmbed` type inside the fields array. In the index definition for the `autoEmbed` type, you must configure the fields highlighted below:

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<fieldToIndex>",
      "model": "voyage-4 | voyage-4-large | voyage-4-lite | voyage-code-3"
    }
  ]
}
```

Values for the `autoEmbed` type fields like `quantization`, `numDimensions`,  `indexingMethod` and `similarity` are set by default if you omit them when you define the index.

Optionally, you can configure the values for these fields in your index definition.

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<fieldToIndex>",
      "model": "<embeddingModel>",
      "quantization": "float | scalar | binary | binaryNoRescore",
      "numDimensions": 256 | 512 | 1024 | 2048,
      "indexingMethod": "flat | hnsw",
      "similarity": "cosine | dotProduct | euclidean",
      "hnswOptions": {
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    }
  ]
}
```

#### About the Similarity Functions

MongoDB Vector Search supports the following similarity functions:

- `euclidean` - measures the distance between ends of vectors. This value allows you to measure similarity based on varying dimensions. To learn more, see [Euclidean](https://en.wikipedia.org/wiki/Euclidean_distance). This is the recommended option when using `binary` or `binaryNoRescore` quantization in Automated Embedding.

- `cosine` - measures similarity based on the angle between vectors. This value allows you to measure similarity that isn't scaled by magnitude. This is the recommended option when using `scalar` quantization in Automated Embedding.

- `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. When the output of the embedding models is normalized to unit length, `cosine` and `dotProduct` are identical in measuring similarity. This is the recommended option when using `float` quantization in Automated Embedding.

The formula for each similarity function is as follows:

### Cosine

For `cosine`, MongoDB Vector Search uses the following algorithm to normalize the score:

```shell
score = (1 + cosine(v1,v2)) / 2
```

- This algorithm normalizes the score by considering the similarity score of the document vector (`v1`) and the query vector (`v2`), which has the range \[`-1`, `1`]. MongoDB Vector Search adds `1` to the similarity score to normalize the score to a range \[`0`, `2`] and then divides by `2` to ensure a value between `0` and `1`.

#### About Quantization

Automated Embedding supports a variety of quantization methods. By default, it uses `scalar` quantization.

##### `float` Quantization

`float` quantization stores the vector embeddings as 32-bit float values. This option provides the highest accuracy, but also the highest storage and RAM costs. By default, Automated Embedding uses `dotProduct` as the similarity function for this quantization type.

##### `scalar` Quantization

The `scalar` quantization type in Automated Embedding builds index with **scalar/int8 (1 byte) vectors**, which are provided by the embedding model. For Automated Embedding, this quantization reduces the vector embedding's storage and RAM cost to about one fourth compared the `float` quantization. By default, Automated Embedding uses `cosine` as the similarity function for this quantization type. This is the default quantization type for Automated Embedding.

##### `binary` Quantization

Binary quantization in Automated Embedding builds index with binary (1 bit) vector values, but also stores full-precision vectors. The full-precision vectors are provided by the embedding model and MongoDB Vector Search quantizes them to binary during index creation.

MongoDB Vector Search rescoring involves re-ranking a subset of the top binary vector search results using their full-precision counterparts to ensure accurate search results from compressed vectors. This reduces the RAM cost to one twenty-fourth (`1/24`) compared to `float` quantization type. By default, Automated Embedding uses `euclidean` as the [similarity function.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions)

##### `binaryNoRescore` Quantization

The `binaryNoRescore` quantization type in Automated Embedding builds index with binary (1 bit) vector values, which are provided by the embedding model. Compared to `binary` (binary quantization with rescoring), this option ensures faster query and lowers storage costs, but provides lower accuracy. By default, Automated Embedding uses `euclidean` as the [similarity function.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-similarity-functions)

#### About the Indexing Methods

The `indexingMethod` determines how MongoDB Vector Search indexes and searches vectors. You can specify one of the following values:

- `hnsw` - Graph-based index structure (default)

- `flat` - Flat, non-graph index structure

**HNSW Index Structure**

MongoDB Vector Search defaults to the HNSW (Hierarchical Navigable Small Worlds) index structure, which suits the majority of workflows. This graph-based index type performs ANN (Approximate Nearest Neighbor) search across large datasets, trading accuracy for speed and scalability.

Use `hnsw` if:

- Your production systems require fast queries across massive datasets using ANN (Approximate Nearest Neighbor).

- You have a large number of per-tenant or per-collection vectors.

- You want to tune recall or latency by using `numCandidates`.

- Multiple users query large shared datasets.

You can also specify `hnswOptions` to override the default values for the following HNSW (Hierarchical Navigable Small Worlds) settings:

- `maxEdges`: Maximum number of edges, or connections, that a node can have in the HNSW (Hierarchical Navigable Small Worlds) graph.

- `numEdgeCandidates`: Maximum number of nodes that MongoDB Vector Search evaluates to find the closest neighbors to connect to a new node.

**Note:**

We recommend using the default values and tuning the default settings only if you are experiencing suboptimal recall on large indexes. While higher values provide better recall, they also increase memory usage and slow down indexing and search speed.

To run an exhaustive search, or ENN (Exact Nearest Neighbor) search, on an HNSW (Hierarchical Navigable Small Worlds) index, set the `exact` parameter to `true`.

**Flat Index Structure**

This index type performs exhaustive search and ensures 100% recall (perfect accuracy), unlike the ANN (Approximate Nearest Neighbor) search that HNSW (Hierarchical Navigable Small Worlds) provides. The flat index requires less CPU and memory overhead because MongoDB Vector Search does not build or maintain a graph. However, query speed decreases on larger datasets because query time grows linearly with data growth.

Use `flat` if:

- Your queries use highly selective prefilters that match less than 5% of documents. For example, consider a multitenant workload with `tenantId` in the filter.

- Your applications require each user to search only their own data.

- You have small to medium datasets where high recall is mandatory.

This option is mutually exclusive with `hnswOptions`.

### About the `filter` Type

You can optionally index additional fields to pre-filter your data. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. Filtering your data helps narrow the scope of your semantic search and increase the accuracy of search results. Filtered queries are typically slower than an equivalent unfiltered query.

You must index the fields that you want to filter by using the `filter` type inside the `fields` array. The `path` for the `filter` type can be a top-level field or a child of the field specified in the `nestedRoot` option. Use [dot notation](https://www.mongodb.com/docs/manual/core/document.md#std-label-document-dot-notation) to specify a nested field. If you specify both a top-level field and a field that is nested inside an array of objects, at query-time:

- Child-level filter fields can be used with the `filter` field in the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage.

- Root-level filter fields can be used with the `parentFilter` field in the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage.

The following syntax defines the `filter` field type:

```json
{
  "fields":[
    {
      "type": "vector",
      ...
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ]
}
```

**Note:**

Pre-filtering your data doesn't affect the score that MongoDB Vector Search returns using `vectorSearchScore` for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries.

### About the `filter` Type

You can optionally index additional fields to pre-filter your data. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. Filtering your data is useful to narrow the scope of your semantic search and increase the accuracy of search results.

**Important:**

Filtered queries are typically slower than an otherwise equivalent unfiltered query.

You must index the fields that you want to filter by using the `filter` type inside the `fields` array.

The following syntax defines the `filter` field type:

```json
{
  "fields":[
    {
      "type": "vector",
      ...
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ]
}
```

**Note:**

Pre-filtering your data doesn't affect the score that MongoDB Vector Search returns using `vectorSearchScore` for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries.

### About the `filter` Type

You can optionally index additional fields to pre-filter your data. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. Filtering your data is useful to narrow the scope of your semantic search and increase the accuracy of search results.

**Important:**

Filtered queries are typically slower than an otherwise equivalent unfiltered query.

You must index the fields that you want to filter by using the `filter` type inside the `fields` array. The path for the `filter` type can be a root-level field or a child of the field specified in the `nestedRoot` option. Use dot notation to specify a nested field. If you specify both a top-level field and a field that is nested inside an array of objects, at query-time:

- Top-level filter fields can be used with the `parentFilter` field in the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage.

- Child-level filter fields can be used with the filter field in the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) stage.

The following syntax defines the `filter` field type:

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      ...
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ]
}
```

**Note:**

Pre-filtering your data doesn't affect the score that MongoDB Vector Search returns using `vectorSearchScore` for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries.

### About the `filter` Type

You can optionally index additional fields to pre-filter your data. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. Filtering your data is useful to narrow the scope of your semantic search and increase the accuracy of search results.

**Important:**

Filtered queries are typically slower than an otherwise equivalent unfiltered query.

You must index the fields that you want to filter by using the `filter` type inside the `fields` array.

The following syntax defines the `filter` field type:

```json
{
  "fields":[
    {
      "type": "autoEmbed",
      ...
    },
    {
      "type": "filter",
      "path": "<field-to-index>"
    },
    ...
  ]
}
```

**Note:**

Pre-filtering your data doesn't affect the score that MongoDB Vector Search returns using `vectorSearchScore` for [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries.

## Supported Clients

You can create and manage MongoDB Vector Search indexes through the Atlas UI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), Atlas CLI, Atlas Administration API, and the following [MongoDB Drivers:](https://www.mongodb.com/docs/drivers/)

| MongoDB Driver | Version |
| --- | --- |
| [C](https://www.mongodb.com/docs/drivers/c/) | 1.28.0 or later |
| [C++](https://www.mongodb.com/docs/drivers/cxx/) | 3.11.0 or later |
| [C#](https://www.mongodb.com/docs/drivers/csharp/) | 3.1.0 or later |
| [Go](https://www.mongodb.com/docs/drivers/go/current/) | 1.16.0 or later |
| [Java](https://www.mongodb.com/docs/drivers/java-drivers/) | 5.2.0 or later |
| [Kotlin](https://www.mongodb.com/docs/drivers/kotlin/) | 5.2.0 or later |
| [Node](https://www.mongodb.com/docs/drivers/node/current/) | 6.6.0 or later |
| [PHP](https://www.mongodb.com/docs/drivers/php-drivers/) | 1.20.0 or later |
| [Python](https://www.mongodb.com/docs/drivers/python-drivers/) | 4.7 or later |
| [Ruby](https://www.mongodb.com/docs/drivers/ruby-drivers/) | 2.21.1 or later |
| [Rust](https://www.mongodb.com/docs/drivers/rust/current/) | 3.1.0 or later |
| [Scala](https://www.mongodb.com/docs/drivers/scala/) | 5.2.0 or later |

You can create and manage MongoDB Vector Search indexes through the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), MongoDB Compass, and the following [MongoDB Drivers:](https://www.mongodb.com/docs/drivers/)

| MongoDB Driver | Version |
| --- | --- |
| [C#](https://www.mongodb.com/docs/drivers/csharp/current/) | 3.x or later |
| [Go](https://www.mongodb.com/docs/drivers/go/current/) | 2.x or later |
| [Java](https://www.mongodb.com/docs/drivers/java/sync/current/) | 5.x or later |
| [Node](https://www.mongodb.com/docs/drivers/node/current/) | 6.6.0 or later |
| [Python](https://www.mongodb.com/docs/drivers/python-drivers/) | 4.7 or later |
| [C++](https://www.mongodb.com/docs/drivers/cxx/) | 3.11.0 or later |
| [Rust](https://www.mongodb.com/docs/drivers/rust/current/) | 3.1.0 or later |

You can create and manage MongoDB Vector Search indexes through the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), MongoDB Compass, and the following [MongoDB Drivers:](https://www.mongodb.com/docs/drivers/)

| MongoDB Driver | Version |
| --- | --- |
| [C](https://www.mongodb.com/docs/drivers/c/) | 1.28.0 or later |
| [C++](https://www.mongodb.com/docs/drivers/cxx/) | 3.11.0 or later |
| [C#](https://www.mongodb.com/docs/drivers/csharp/) | 3.1.0 or later |
| [Go](https://www.mongodb.com/docs/drivers/go/current/) | 1.16.0 or later |
| [Java](https://www.mongodb.com/docs/drivers/java-drivers/) | 5.2.0 or later |
| [Kotlin](https://www.mongodb.com/docs/drivers/kotlin/) | 5.2.0 or later |
| [Node](https://www.mongodb.com/docs/drivers/node/current/) | 6.6.0 or later |
| [PHP](https://www.mongodb.com/docs/drivers/php-drivers/) | 1.20.0 or later |
| [Python](https://www.mongodb.com/docs/drivers/python-drivers/) | 4.7 or later |
| [Ruby](https://www.mongodb.com/docs/drivers/ruby-drivers/) | 2.21.1 or later |
| [Rust](https://www.mongodb.com/docs/drivers/rust/current/) | 3.1.0 or later |
| [Scala](https://www.mongodb.com/docs/drivers/scala/) | 5.2.0 or later |

You can create and manage MongoDB Vector Search indexes through the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), MongoDB Compass, and the following [MongoDB Drivers:](https://www.mongodb.com/docs/drivers/)

| MongoDB Driver | Version |
| --- | --- |
| [C#](https://www.mongodb.com/docs/drivers/csharp/current/) | 3.x or later |
| [Go](https://www.mongodb.com/docs/drivers/go/current/) | 2.x or later |
| [Java](https://www.mongodb.com/docs/drivers/java/sync/current/) | 5.x or later |
| [Node](https://www.mongodb.com/docs/drivers/node/current/) | 6.6.0 or later |
| [Python](https://www.mongodb.com/docs/drivers/python-drivers/) | 4.7 or later |
| [C++](https://www.mongodb.com/docs/drivers/cxx/) | 3.11.0 or later |
| [Rust](https://www.mongodb.com/docs/drivers/rust/current/) | 3.1.0 or later |

## Create a MongoDB Vector Search Index

You can create a MongoDB Vector Search index for all collections on your cluster that contain vector embeddings with other data of any kind. The vector embeddings can be up to 8192 dimensions in length. You can create the index through the Atlas UI, Atlas Administration API, Atlas CLI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

The following procedure walks through the steps for enabling Automated Embedding in your MongoDB Vector Search index. If you loaded the `sample_mflix` dataset, the example in the procedure demonstrates how to enable Automated Embedding for the `fullplot` field in the `movies` collection.

You can create a MongoDB Vector Search index for all collections on your cluster that contain vector embeddings with other data of any kind. The vector embeddings can be up to 8192 dimensions in length. You can create the index through [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), MongoDB Compass, or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

The following procedure walks through the steps for enabling Automated Embedding in your MongoDB Vector Search index. If you loaded the `sample_mflix` dataset, the example in the procedure demonstrates how to enable Automated Embedding for the `fullplot` field in the `movies` collection.

### Index Limitations

You cannot create more than:

- 3 indexes (regardless of the type, `search` or `vector`) on Free clusters.

- 10 indexes on Flex clusters.

A high index count generates significant load on the base cluster and might disrupt your workload. The number of indexes your cluster can support depends on your cluster tier and workload. Smaller cluster tiers like `M10` can experience performance degradation or out-of-memory errors as index count increases. Start with a small number of indexes and monitor your cluster's resource usage as you scale.

For MongoDB Vector Search indexes using Automated Embedding, you must enable auto-scaling for dedicated clusters.

After creating the index, you can't edit the field `type` and `modality` in the index definition. You can modify other settings and add or delete `autoEmbed` and `filter` fields in the index definition.

You can't configure both `vector` and `autoEmbed` type fields in the same index definition. MongoDB Vector Search throws an exception if you define fields of both types in the same index.

On sharded clusters, when you create an `autoEmbed` type index, there are some additional costs and performance implications:

- When adding or removing shards or during routine data migration triggered by the cluster balancer, additional embeddings are created for the documents that are moved between shards. This can increase the cost of embedding generation.

- When querying, each shard generates embeddings independently for the same query text. This can increase the cost of embedding generation.

The embedding model inference runs on a multi-tenant service in the Atlas Data Plane, available in MongoDB Google Cloud based infrastructure in a US region. This means that your data is sent to MongoDB inference infrastructure for embedding generation and retrieval, regardless of your cluster's cloud provider. Data transfer costs apply.

You cannot create more than:

- 3 indexes (regardless of the type, `search` or `vector`) on Free clusters.

- 10 indexes on Flex clusters.

A high index count generates significant load on the base cluster and might disrupt your workload. The number of indexes your cluster can support depends on your cluster tier and workload. Smaller cluster tiers like `M10` can experience performance degradation or out-of-memory errors as index count increases. Start with a small number of indexes and monitor your cluster's resource usage as you scale.

After creating the index, you can't edit certain fields in the `autoEmbed` type index definition. Specifically, you can't edit the `path`, `model`, `quantization`, and `numDimensions` fields in the index definition. However, you can edit or add `filter` type fields. If you need to change the index configuration for the `autoEmbed` type fields, you must create a new index with your desired configuration and then delete the old index.

You can't configure both `vector` and `autoEmbed` type fields in the same index definition. MongoDB Vector Search throws an exception if you define fields of both types in the same index.

### Prerequisites

To create a MongoDB Vector Search index, you must have a cluster with the following prerequisites:

- MongoDB version `6.0.11`, `7.0.2`, or later

- A collection for which to create the MongoDB Vector Search index

**Note:**

You can use the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) command or driver helper methods to delete MongoDB Vector Search indexes on all Atlas cluster tiers. For a list of supported driver versions, see [Supported Clients](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-index-supported-drivers).

To create a MongoDB Vector Search index, you must have a cluster with the following prerequisites:

- MongoDB version `8.0.0` or later

- A collection for which to create the MongoDB Vector Search index

### Required Access

You need the [`Project Data Access Admin`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Data-Access-Admin) or higher role to create and manage MongoDB Vector Search indexes.

You need the [`Project Data Access Admin`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Data-Access-Admin) or higher role to create and manage MongoDB Vector Search indexes.

You need [`readWrite`](https://www.mongodb.com/docs/manual/reference/built-in-roles.md#mongodb-authrole-readWrite) or higher role to create and manage MongoDB Vector Search indexes.

### Procedure

**Note:**

The procedure includes index definition examples for the collections in the sample datasets. If you load the [sample data](https://www.mongodb.com/docs/atlas/import/load-sample-data.md#std-label-load-sample-data) on your cluster and create the example MongoDB Vector Search indexes for the collections, you can run the sample [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against these collections. To learn more about the sample queries that you can run, see [$vectorSearch Examples.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-vectorSearch-agg-pipeline-egs)

1. In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   - If you have no clusters, click

     Create cluster to create one. To learn more, see [Create a Cluster.](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster.md#std-label-create-new-cluster)

   - If your project has multiple clusters, select the cluster

     you want to use from the Select cluster dropdown, then click Go to Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2. Click Create Search Index.

3. Start your index configuration.

   Make the following selections on the page and then click Next.

   | Search Type | Select the Vector Search index type. |
   | --- | --- |
   | How do you want to set up your vector data? | Select one of the following: Automated Embedding if you want MongoDB to generate and manage vector embeddings for your text fields.; Bring your own embeddings if you have already generated vector embeddings for your data. Choose Bring your own embeddings. |
   | Index Name and Data Source | Specify the following information: Index Name: `autoembed_index` is the default index name. Index names must be unique within the namespace, regardless of the index type. If you already have an index named `autoembed_index` on this collection, enter a different name.; Database and Collection:`sample_mflix`; `movies` |
   | Configuration Method | For a guided experience, select Visual Editor.To edit the raw index definition, select JSON Editor. |

4. Specify the index definition.

   Atlas automatically detects fields that contain vector embeddings, as well as their corresponding dimensions, and pre-populates up to three vector fields.

   ### Visual Editor

   To configure the index, do the following:

   If necessary, select the vector field to index from the Path dropdown.

   Select Add Another Field to index any additional fields.

   Specify the similarity method for each indexed field in the Similarity Method dropdown menu.

   *(Optional)* Click Advanced and select either Scalar or Binary quantization from the dropdown menu to [automatically quantize](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-avs-automatic-quantization) the embeddings in the field.

   *(Optional)* Specify other fields in your collection to filter the data by in the Filter Field section.

   To learn more about the MongoDB Vector Search index settings, see [How to Index Fields for Vector Search.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search)

   ###### Basic Example

   For the `embedded_movies` collection, Atlas displays the `plot_embedding_voyage_3_large` and `plot_embedding` fields.

   To configure the index, select Dot Product from the Similarity Method dropdown.

   This index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search. By default, MongoDB Vector Search uses the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for indexing the field.

   ###### Filter Example

   For the `embedded_movies` collection, Atlas displays the `plot_embedding_voyage_3_large` and `plot_embedding` fields.

   To configure the index, do the following:

   Select Dot Product from the Similarity Method dropdown.

   Click Advanced, then select Scalar quantization from the dropdown menu.

   In the Filter Field section, specify the `genres` and  `year` fields to filter the data by.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings. By default, MongoDB Vector Search uses the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for indexing the field.

   ###### Stored Source Example

   The `storedSource` option is not supported by the Visual Editor. Use the JSON (Javascript Object Notation) Editor to configure `fields` for storage on `mongot`.

5. Click Next to review the index.

6. Click Create Vector Search Index.

   Atlas displays a modal window to let you know your index is building.

7. Close the You're All Set! Modal Window by clicking the Close button.

8. Check the status.

   The newly created index displays on the Search & Vector Search page. While the index is building, the Status field reads Pending. When the index is finished building, the Status field reads Ready.

   **Note:**

   Larger collections take longer to index. You will receive an email notification when your index is finished building.

To create a MongoDB Vector Search index for a collection using the Atlas Administration API, send a `POST` request to the MongoDB Search `indexes` endpoint with the required parameters.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "<name-of-database>",
    "collectionName": "<name-of-collection>",
    "type": "vectorSearch",
    "name": "<index-name>",
    "definition": {
      "fields":[ 
        {
          "type": "vector",
          "path": <field-to-index>,
          "numDimensions": <number-of-dimensions>,
          "similarity": "euclidean | cosine | dotProduct",
          "quantization": "none | scalar | binary",
          "indexingMethod": "flat | hnsw",
          "hnswOptions": {
            "maxEdges": <number-of-connected-neighbors>,
            "numEdgeCandidates": <number-of-nearest-neighbors>
          }
        },
        {
          "type": "filter",
          "path": "<field-to-index>"
        },
        ...
      }
    ],
    "nestedRoot": "<embedded-document-field-name>"
  }'
```

To learn more about the syntax and parameters for the endpoint, see [Create One MongoDB Search Index](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupclustersearchindex). .. include:: /includes/index/vector-type/facts/avs-voyageai-index-description.rst

#### Basic Example

##### Index only the vector embeddings field.

The following index definition on the `sample_mflix.embedded_movies` collection indexes only the `plot_embedding_voyage_3_large` field using the default [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "sample_mflix",
    "collectionName": "embedded_movies",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition: {
      "fields":[ 
        {
          "type": "vector",
          "path": "plot_embedding_voyage_3_large",
          "numDimensions": 2048,
          "similarity": "dotProduct"
        }
      ]
    }
  }'
```

#### Filter Example

##### Index the vector embeddings field with filter fields.

The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

- A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

- The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "sample_mflix",
    "collectionName": "embedded_movies",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition: { 
      "fields":[ 
        {
          "type": "vector",
          "path": "plot_embedding_voyage_3_large",
          "numDimensions": 2048,
          "similarity": "dotProduct",
          "indexingMethod": "hnsw"
        },
        {
          "type": "filter",
          "path": "genres"
        },
        {
          "type": "filter",
          "path": "year"
        }
      ]
    }
  }'
```

#### Multiple Vector Fields Example

##### Index multiple vector embeddings fields.

This index definition indexes the following fields:

- A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

- The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

```shell
curl --user "{PUBLIC-KEY}:{PRIVATE-KEY}" --digest \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "sample_mflix",
    "collectionName": "embedded_movies",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition": { 
      "fields":[ 
        {
          "type": "vector",
          "path": "plot_embedding_voyage_4_large",
          "numDimensions": 2048,
          "similarity": "dotProduct"
        },
        {
          "type": "vector",
          "path": "plot_embedding",
          "numDimensions": 1536,
          "similarity": "dotProduct"
        },
        {
          "type": "filter",
          "path": "genres"
        },
        {
          "type": "filter",
          "path": "year"
        }
      ]
    }
  }'
```

#### Flat Example

##### Index the vector embeddings field with the \`\`flat\`\` indexing method.

The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

- A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

- The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

```shell
curl --user "{PUBLIC-KEY}:{PRIVATE-KEY}" --digest \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "sample_mflix",
    "collectionName": "embedded_movies",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition: { 
      "fields":[ 
        {
          "type": "vector",
          "path": "plot_embedding_voyage_3_large",
          "numDimensions": 2048,
          "similarity": "dotProduct",
          "indexingMethod": "flat"
        },
        {
          "type": "filter",
          "path": "genres"
        },
        {
          "type": "filter",
          "path": "year"
        }
      ]
    }
  }'
```

#### Nested Field Example

##### Index the nested field as the vector embeddings field.

Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing the following placeholder values:

| Placeholder | Valid Value |
| --- | --- |
| `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
| `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

```python
import os
import pymongo
import voyageai

# Set your Voyage API key
os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
vo = voyageai.Client()

def get_embedding(text):
    """Retrieves the embedding for a given text using the voyage-4-large model."""
    try:
        return vo.embed([text], model="voyage-4-large").embeddings[0]
    except Exception as e:
        print("An error occurred while retrieving embeddings:", e)
        return None

# Connect to your MongoDB cluster
mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
db = mongo_client["sample_airbnb"]
collection = db["listingsAndReviews"]

# Filter to exclude null or empty fields and check for missing embedding
filter = {
    "reviews": {
        "$elemMatch": {
            "comments": {"$nin": [None, ""]},
            "comments_embedding": {"$exists": False}
        }
    }
}

# Count documents matching the filter
doc_count_before_update = collection.count_documents(filter)
print(f"Number of documents matching the filter: {doc_count_before_update}")

# Get all matching documents into a list 
documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

# Add comments_embedding to each review that is missing it
updated_review_count = 0
for doc in documents_to_process:
    if 'reviews' in doc and isinstance(doc['reviews'], list):
        for review in doc['reviews']:
            if isinstance(review, dict) and 'comments' in review and review['comments']:
                if 'comments_embedding' not in review:
                    embedding = get_embedding(review['comments'])
                    if embedding is not None:
                        collection.update_one(
                            {"_id": doc["_id"]},
                            {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                            array_filters=[{"elem._id": review["_id"]}]
                        )
                        updated_review_count += 1

print(f"Updated {updated_review_count} reviews.")
mongo_client.close()
```

The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

- The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

- The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

- The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
--header "Accept: application/json" \
--header "Content-Type: application/json" \
--include \
--request POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
--data '
  {
    "database": "sample_airbnb",
    "collectionName": "listingsAndReviews",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition": {
      "fields": [
        {
          "type": "vector",
          "path": "reviews.comments_embedding",
          "numDimensions": 1024,
          "similarity": "cosine"
        },
        {
          "type": "filter",
          "path": "address.country"
        },
        {
          "type": "filter",
          "path": "bedrooms"
        },
        {
          "type": "filter",
          "path": "property_type"
        },
        {
          "type": "filter",
          "path": "reviews.date"
        }
      ],
      "nestedRoot": "reviews"
    }
  }'
```

#### Stored Source Example

##### Index the vector embeddings field with stored source fields.

This index definition indexes the following fields:

- A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

- The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

```shell
curl --include --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header "Accept: application/vnd.atlas.2025-03-12+json" \
  --header "Content-Type: application/json" \
  -X POST "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes" \
  -d '{
    "database": "sample_mflix",
    "collectionName": "embedded_movies",
    "type": "vectorSearch",
    "name": "vector_index",
    "definition": { 
      "fields":[ 
        {
          "type": "vector",
          "path": "plot_embedding_voyage_3_large",
          "numDimensions": 2048,
          "similarity": "dotProduct"
        },
        {
          "type": "filter",
          "path": "genres"
        },
        {
          "type": "filter",
          "path": "year"
        }
      ],
      "storedSource": {
        "include": [
          "genres", "plot", "title", "year"
        ]
      }
    }
  }'
```

To create a MongoDB Vector Search index for a collection using the Atlas CLI v1.14.3 or later, perform the following steps:

1. Create a `.json` file and define the index in the file.

   Your index definition should resemble the following format:

   ```json
   {
       "database": "<name-of-database>",
       "collectionName": "<name-of-collection>",
       "type": "vectorSearch",
       "name": "<index-name>",
       "fields":[ 
         {
           "type": "vector",
           "path": "<field-to-index>",
           "numDimensions": <number-of-dimensions>,
           "similarity": "euclidean | cosine | dotProduct"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
   }
   ```

   **Example:**

   Create a file named `vector-index.json`.

2. Replace the following placeholder values and save the file.

   | `<name-of-database>` | Database that contains the collection for which you want to create the index. |
   | --- | --- |
   | `<name-of-collection>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, MongoDB Vector Search names the index `vector_index`. |
   | `<number-of-dimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<field-to-index>` | Vector and filter fields to index. |

   For example, copy and paste the following example index definitions into the `vector-index.json` file.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```json
   {
       "database": "sample_mflix",
       "collectionName": "embedded_movies",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields": [ 
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         }
       ]
   }
   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```json
   {
       "database": "sample_mflix",
       "collectionName": "embedded_movies",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields":[ 
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "hnsw"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
   }
   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```json
   {
       "database": "sample_mflix",
       "collectionName": "embedded_movies",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields":[ 
         {
           "type": "vector",
           "path": "plot_embedding_voyage_4_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "vector",
           "path": "plot_embedding",
           "numDimensions": 1536,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
   }
   ```

   ###### Flat Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```json
   {
       "database": "sample_mflix",
       "collectionName": "embedded_movies",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields":[ 
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
   }
   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```json
   {
       "database": "sample_mflix",
       "collectionName": "embedded_movies",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields":[ 
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ],
       "storedSource": {
         "include": [ "genres", "plot", "title", "year" ]
       }
   }
   ```

   ###### Nested Field

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing the following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```json
   {
       "database": "sample_airbnb",
       "collectionName": "listingsAndReviews",
       "type": "vectorSearch",
       "name": "vector_index",
       "fields": [
         {
           "type": "vector",
           "path": "reviews.comments_embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "address.country"
         },
         {
           "type": "filter",
           "path": "bedrooms"
         },
         {
           "type": "filter",
           "path": "property_type"
         },
         {
           "type": "filter",
           "path": "reviews.date"
         }
       ],
       "nestedRoot": "reviews"
   }
   ```

3. Run the following command to create the index.

   ```shell
   atlas clusters search indexes create --clusterName [cluster_name] --file [vector_index].json
   ```

   In the command, replace the following placeholder values:

   - `cluster_name` is the name of the cluster that contains the collection for which you want to create the index.

   - `vector_index` is the name of the JSON (Javascript Object Notation) file that contains the index definition for the MongoDB Vector Search index.

   **Example:**

   ```shell
   atlas clusters search indexes create --clusterName [cluster_name] --file vector-index.json
   ```

   To learn more about the command syntax and parameters, see the Atlas CLI documentation for the [atlas clusters search indexes create](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/) command.

To create a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) v2.1.2 or later, perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to create the index.

   **Example:**

   ```shell
   use sample_mflix
   ```

   **Output:**

   ```shell
    switched to db sample_mflix
   ```

3. Run the `db.collection.createSearchIndex()` method.

   The [`db.collection.createSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex.md#mongodb-method-db.collection.createSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.createSearchIndex(
     "<index-name>",
     "vectorSearch", //index type
     {
       fields: [
         {
           "type": "vector",
           "numDimensions": <number-of-dimensions>,
           "path": "<field-to-index>",
           "similarity": "euclidean | cosine | dotProduct",
           "quantization": "none | scalar | binary",
           "indexingMethod": "flat | hnsw",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           }
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

   The following example index definitions indexes the `vector` type fields in the sample data.

   ###### Basic Example

   ###### Index only the vector embeddings field.

   The following index definition indexes only the vector embeddings field using the default [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         }
       ]
     }
   );
   ```

   ###### Filter Example

   ###### Index the vector embeddings field with filter fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "hnsw"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Multiple Vector Fields Example

   ###### Index multiple vector embeddings fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_4_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "vector",
           "path": "plot_embedding",
           "numDimensions": 1536,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Flat Example

   ###### Index the vector embeddings field with the \`\`flat\`\` indexing method.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Nested Field Example

   ###### Index nested vector fields.

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```shell
   db.listingsAndReviews.createSearchIndex(
     "vector_index",
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "reviews.comments_embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "address.country"
         },
         {
           "type": "filter",
           "path": "bedrooms"
         },
         {
           "type": "filter",
           "path": "property_type"
         },
         {
           "type": "filter",
           "path": "reviews.date"
         }
       ],
       "nestedRoot": "reviews"
     }
   );
   ```

   ###### Stored Source Example

   ###### Index the vector embeddings field with stored source fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ],
       "storedSource": {
         "include": [ "genres", "plot", "title", "year" ]
       }
     }
   );
   ```

To create a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(vector_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(vector_index
     create-index.cpp
   )

   target_link_libraries(vector_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `create-index.cpp` file and define the index in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Define the index with a vector field for your existing embeddings
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "<fieldToIndex>"),
                 kvp("numDimensions", <numberOfDimensions>),
                 kvp("similarity", "<similarity>"),
                 kvp("quantization", "<quantization>")))));
     auto model =
         mongocxx::search_index_model(name, definition.view())
             .type("vectorSearch");

     // Create the search index
     siv.create_one(model);
     std::cout << "New search index named " << name << " is building."
               << std::endl;

     // Wait for initial sync to complete
     std::cout << "Polling to check if the index is ready. This may take up to "
                  "a minute."
               << std::endl;
     bool queryable = false;
     while (!queryable) {
       auto indexes = siv.list();
       for (const auto& index : indexes) {
         const auto n = index["name"];
         const auto q = index["queryable"];
         if (n && q && n.get_string().value == name) {
           queryable = q.get_bool().value;
         }
       }
       if (!queryable) {
         std::this_thread::sleep_for(std::chrono::seconds(5));
       }
     }
     std::cout << name << " is ready for querying." << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field that contains your vector embeddings. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. This value must match the number of dimensions in your embeddings. |
   | `<similarity>` | Vector similarity function to use when searching. You can specify `euclidean`, `cosine`, or `dotProduct`. |
   | `<quantization>` | Automatic quantization to use for vectors before indexing, which reduces resource consumption. You can specify `none`, `scalar`, or `binary`. Use `scalar` to reduce memory while retaining accuracy, `binary` for the largest memory savings with the highest impact on accuracy, or `none` to disable quantization. To learn how to choose a quantization method, see [Vector Quantization.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-mdb_vs-quantization) |

   To try MongoDB Vector Search with sample data, you can create a sample index based on the `sample_mflix` sample database. To do so, use one of the following index definitions. You only need to enter a valid `<connectionString>` value to run the sample index in your implementation. The following index definition indexes the `plot_embedding_voyage_3_large` field as the `vector` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index. The `plot_embedding_voyage_3_large` field contains embeddings created using Voyage AI's `voyage-3-large` embedding model. The index definition specifies `2048` vector dimensions, measures similarity using the `dotProduct` function, and applies `scalar` quantization.

   ### Basic Example

   The following index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["sample_mflix"]["embedded_movies"];

     auto siv = collection.search_indexes();
     auto name = "vector_index";

     // Index the vector embeddings field for vector search
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "plot_embedding_voyage_3_large"),
                 kvp("numDimensions", 2048),
                 kvp("similarity", "dotProduct"),
                 kvp("quantization", "scalar")))));
     auto model =
         mongocxx::search_index_model(name, definition.view())
             .type("vectorSearch");

     // Create the search index
     siv.create_one(model);
     std::cout << "New search index named " << name << " is building."
               << std::endl;

     // Wait for initial sync to complete
     std::cout << "Polling to check if the index is ready. This may take up to "
                  "a minute."
               << std::endl;
     bool queryable = false;
     while (!queryable) {
       auto indexes = siv.list();
       for (const auto& index : indexes) {
         const auto n = index["name"];
         const auto q = index["queryable"];
         if (n && q && n.get_string().value == name) {
           queryable = q.get_bool().value;
         }
       }
       if (!queryable) {
         std::this_thread::sleep_for(std::chrono::seconds(5));
       }
     }
     std::cout << name << " is ready for querying." << std::endl;
     return 0;
   }

   ```

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to create the index.

   ```shell
   ./build/vector_index
   ```

To create a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#atlas-search-indexes) driver v3.6.0 or later, perform the following steps:

1. Create a `.cs` file and define the index in the file.

   ### Tab

   ```csharp
   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   // connect to your deployment
   private const string MongoConnectionString = "<connectionString>";
   var client = new MongoClient(MongoConnectionString);

   // Access your database and collection
   var database = client.GetDatabase("<databaseName>");
   var collection = database.GetCollection<BsonDocument>("<collectionName>");

   // Create your index model, then create the search index
   var name = "<indexName>";
   var model = new CreateVectorSearchIndexModel<<documentType>> (
       <fieldToIndex>
       name,
       <vectorSimilarity>,
       <numberOfDimensions>);

   var searchIndexView = collection.SearchIndexes;
   searchIndexView.CreateOne(model);
   Console.WriteLine($"New search index named {name} is building.");

   // Wait for initial sync to complete
   Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
   bool queryable = false;
   while (!queryable)
   {
       var indexes = searchIndexView.List();
       foreach (var index in indexes.ToEnumerable())
       {
           if (index["name"] == name)
           {
               queryable = index["queryable"].AsBoolean;
           }
       }
       if (!queryable)
       {
           Thread.Sleep(5000);
       }
   }
   Console.WriteLine($"{name} is ready for querying.");

   ```

   **Example:**

   Create a file named `IndexService.cs`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<documentType>` | Class that represents a document in the collection. To learn more, see [POCOs](https://www.mongodb.com/docs/drivers/csharp/current/serialization/poco/) in the .NET/C# driver documentation. |
   | `<fieldToIndex>` | Vector and filter fields to index. For this parameter, you can pass either a `FieldDefinition<TDocument>` object or a lambda expression. |
   | `<vectorSimilarity>` | Vector similarity function, defined in the `VectorSimilarity` enum. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |

   For example, copy and paste the following example index definition into the `IndexService.cs` and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your connection string
       private const string MongoConnectionString = "<connectionString>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";

               var model = new CreateVectorSearchIndexModel<Movie>(
                   m => m.PlotEmbedding,
                   name,
                   VectorSimilarity.DotProduct,
                   2048)
               {
                   Quantization = VectorQuantization.Scalar
               };

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your connection string
       private const string MongoConnectionString = "<connection-string>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";
               
               var model = new CreateVectorSearchIndexModel<Movie>(
                   m => m.PlotEmbedding,
                   name,
                   VectorSimilarity.DotProduct,
                   2048,
                   m => m.Genres,
                   m => m.Year)
               {
                   Quantization = VectorQuantization.Scalar,
               };

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your Atlas connection string
       private const string MongoConnectionString = "<connection-string>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";
               var type = SearchIndexType.VectorSearch;

               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "plot_embedding_voyage_4_large" },
                               { "numDimensions", 2048 },
                               { "similarity", "dotProduct" },
                               { "quantization", "scalar"}
                           },
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "plot_embedding" },
                               { "numDimensions", 1536 },
                               { "similarity", "dotProduct" },
                               { "quantization", "scalar"}
                           },
                           new BsonDocument
                           {
                               {"type", "filter"},
                               {"path", "genres"}
                           },
                           new BsonDocument
                           {
                               {"type", "filter"},
                               {"path", "year"}
                           }
                       }
                   }
               };

               var model = new CreateSearchIndexModel(name, type, definition);

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.CreateVectorIndex();
   ```

4. Compile and run your project to create the index.

   ```shell
   dotnet run
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `create-index.go` and define the index in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Define the index details
   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	indexModel := mongo.SearchIndexModel{
   		Definition: vectorDefinition{
   			Fields: []vectorDefinitionField{{
   				Type:          "vector",
   				Path:          "<fieldToIndex>",
   				NumDimensions: <numberOfDimensions>,
   				Similarity:    "euclidean | cosine | dotProduct"}},
   		},
   		Options: opts,
   	}

   	// Create the index
   	log.Println("Creating the index.")
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}

   	// Await the creation of the index.
   	log.Println("Polling to confirm successful index creation.")
   	log.Println("NOTE: This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println("Name of Index Created: " + searchIndexName)
   }

   ```

   **Note: Programmatic Index Creation**

   The MongoDB Go driver supports programmatic MongoDB Vector Search index management starting in v1.16.0, but the preceding code shows the syntax for the v2.x driver.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `create-index.go` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")

   	// Define the index details
   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   		Quantization  string `bson:"quantization"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	indexModel := mongo.SearchIndexModel{
   		Definition: vectorDefinition{
   			Fields: []vectorDefinitionField{{
   				Type:          "vector",
   				Path:          "plot_embedding_voyage_3_large",
   				NumDimensions: 2048,
   				Similarity:    "dotProduct",
   				Quantization:  "scalar"}},
   		},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")
   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   		Quantization  string `bson:"quantization"`
   	}

   	type filterField struct {
   		Type string `bson:"type"`
   		Path string `bson:"path"`
   	}

   	type indexDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	vectorDefinition := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding_voyage_3_large",
   		NumDimensions: 2048,
   		Similarity:    "dotProduct",
   		Quantization:  "scalar"}
   	genreFilterDefinition := filterField{"filter", "genres"}
   	yearFilterDefinition := filterField{"filter", "year"}

   	indexModel := mongo.SearchIndexModel{
   		Definition: bson.D{{Key: "fields", Value: [3]interface{}{
   			vectorDefinition,
   			genreFilterDefinition,
   			yearFilterDefinition}}},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your Atlas connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")
   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type filterField struct {
   		Type string `bson:"type"`
   		Path string `bson:"path"`
   	}

   	type indexDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	vectorDefinition1 := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding_voyage_4_large",
   		NumDimensions: 2048,
   		Similarity:    "dotProduct",
   	}
   	vectorDefinition2 := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding",
   		NumDimensions: 1536,
   		Similarity:    "dotProduct",
   	}
   	genreFilterDefinition := filterField{"filter", "genres"}
   	yearFilterDefinition := filterField{"filter", "year"}

   	indexModel := mongo.SearchIndexModel{
   		Definition: bson.D{{Key: "fields", Value: []interface{}{
   			vectorDefinition1,
   			vectorDefinition2,
   			genreFilterDefinition,
   			yearFilterDefinition}}},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

3. Run the following command to create the index.

   ```shell
   go run create-index.go
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and define the index in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index details
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "<fieldToIndex>")
                           .append("numDimensions", <numberOfDimensions>)
                           .append("similarity", "euclidean | cosine | dotProduct"),
                       new Document("type", "filter")
                           .append("path", "<fieldToIndex>"),
                       ...));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch()
               );

                // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.           
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   The following example index definitions index the vector and filter fields in the sample data.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.    
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search against pre-filtered data.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your Atlas connection string
           String uri = "<connection-string>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               definition = ((Document) definition).append("storedSource", new Document("include",
                   Arrays.asList("genres", "plot", "title", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your Atlas connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_4_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct"),
                       new Document("type", "vector")
                           .append("path", "plot_embedding")
                           .append("numDimensions", 1536)
                           .append("similarity", "dotProduct"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for Atlas to build the index
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

3. Execute the code to create the index.

   From your IDE, run the file to create the index.

To create a MongoDB Vector Search index for a collection using the [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create a `.js` file and define the index in the file.

   ```javascript
   import { MongoClient, BSON } from "mongodb";  
   import { setTimeout } from "timers/promises";  

   // Connect to your MongoDB cluster
   const uri = process.env.MONGODB_URI || "<CONNECTION-STRING>";

   const client = new MongoClient(uri);

   async function main() {
     try {
       const DB_NAME = "<DATABASE-NAME>";
       const COLLECTION_NAME = "<COLLECTION-NAME>";
       const db = client.db(DB_NAME);
       const collection = db.collection(COLLECTION_NAME);

       // define your MongoDB Vector Search index
       const index = {
         name: "<INDEX-NAME>",
         type: "vectorSearch",
         definition: {
           fields: [
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.float32",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int8",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int1",
               similarity: "euclidean",
             },
           ],
         },
       };

       // Run the helper method
       const result = await collection.createSearchIndex(index);
       console.log(`New search index named ${result} is building.`);

       // Wait for the index to be ready to query
       console.log("Polling to check if the index is ready. This may take up to a minute.");
       let isQueryable = false;

       // Use filtered search for index readiness
       while (!isQueryable) {
         const [indexData] = await collection.listSearchIndexes(index.name).toArray();

         if (indexData) {
           isQueryable = indexData.queryable;
           if (!isQueryable) {
             await setTimeout(5000); // Wait for 5 seconds before checking again
           }
         } else {
           // Handle the case where the index might not be found
           console.log(`Index ${index.name} not found.`);
           await setTimeout(5000); // Wait for 5 seconds before checking again
         }
       }

       console.log(`${result} is ready for querying.`);
     } catch (error) {
       console.error("Error:", error);
     } finally {
       await client.close();
     }
   }

   main().catch((err) => {
     console.error("Unhandled error:", err);
   });

   ```

   For example, create a file named `vector-index.js` to try the examples in this page.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `vector-index.js` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes only the `plot_embedding_voyage_3_large` field as the `vector` type using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Filter Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "hnsw"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your Atlas Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_4_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "vector",
                  "numDimensions": 1536,
                  "path": "plot_embedding",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Flat Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "flat"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ],
              "storedSource": {
                "include": [ "genres", "plot", "title", "year" ]
              }
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Nested Field Example

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string field (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_airbnb");
        const collection = database.collection("listingsAndReviews");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "path": "reviews.comments_embedding",
                  "numDimensions": 1024,
                  "similarity": "cosine"
                },
                {
                  "type": "filter",
                  "path": "address.country"
                },
                {
                  "type": "filter",
                  "path": "bedrooms"
                },
                {
                  "type": "filter",
                  "path": "property_type"
                },
                {
                  "type": "filter",
                  "path": "reviews.date"
                }
              ],
              "nestedRoot": "reviews"
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

3. Run the following command to create the index.

   ```shell
   node <file-name>.js
   ```

   **Example:**

   ```shell
   node vector_index.js
   ```

To create MongoDB Vector Search indexes for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create a `.py` file and define the index in the file.

   ### Tab

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "numDimensions": <numberofDimensions>,
           "path": "<fieldToIndex>",
           "similarity": "euclidean | cosine | dotProduct",
           "quantization": "none | scalar | binary",
           "indexingMethod": "flat | hnsw",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           }
         },
         {
           "type": "filter",
           "path": "<fieldToIndex>"
         },
         ...
       ],
       "nestedRoot": "<arrayFieldToIndex>",
       "storedSource": {
         "include|exclude": ["<field-name>",...]
       }"
     },
     name="<indexName>",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   To learn more, see the [create\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.create_search_index) method.

   **Example:**

   Create a file named `vector-index.py`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `vector-index.py` and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-basic.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes only the `plot_embedding_voyage_3_large` field as the `vector` type using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Filter Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-filter.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar",
           "indexingMethod": "hnsw"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your Atlas deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_4_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
          {
           "type": "vector",
           "path": "plot_embedding",
           "numDimensions": 1536,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Flat Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-filter.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your Atlas deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ],
       "storedSource": {
         "include": [ "genres", "plot", "title", "year" ]
       }
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Nested Field Example

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_airbnb"]
   collection = database["listingsAndReviews"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "reviews.comments_embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "address.country"
         },
         {
           "type": "filter",
           "path": "bedrooms"
         },
         {
           "type": "filter",
           "path": "property_type"
         },
         {
           "type": "filter",
           "path": "reviews.date"
         }
       ],
       "nestedRoot": "reviews"
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

3. Run the following command to create the index.

   ```shell
   python <file-name>.py
   ```

   **Example:**

   ```shell
   python vector-index.py
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, and the `sync` feature only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index.

   In the `/src` directory of your project, create a file named `create_index.rs`. Copy and paste the following code into the file.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "<fieldToIndex>",
                   "numDimensions": <numberOfDimensions>,
                   "similarity": "<vectorSimilarity>"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Vector field to index. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<vectorSimilarity>` | Vector similarity function to use to search for the top K-nearest neighbors. |

   For example, copy and paste one of the following index definitions into the `create_index.rs` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("embedded_movies");

       let index_name = "vector_index";

       // Define the vector embeddings field to index.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "plot_embedding_voyage_3_large",
                   "numDimensions": 2048,
                   "similarity": "dotProduct",
                   "quantization": "scalar",
                   "indexingMethod": "hnsw"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("embedded_movies");

       let index_name = "vector_index";

       // Define the vector field and the fields to pre-filter on.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "plot_embedding_voyage_3_large",
                   "numDimensions": 2048,
                   "similarity": "dotProduct",
                   "quantization": "scalar",
                   "indexingMethod": "hnsw"
               },
               {
                   "type": "filter",
                   "path": "genres"
               },
               {
                   "type": "filter",
                   "path": "year"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod create_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       create_index::create_index().await
   }
   ```

5. Run the following command to create the index.

   ```shell
   cargo run
   ```

1) In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   - If you have no clusters, click

     Create cluster to create one. To learn more, see [Create a Cluster.](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster.md#std-label-create-new-cluster)

   - If your project has multiple clusters, select the cluster

     you want to use from the Select cluster dropdown, then click Go to Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2) Click Create Search Index.

3) Start your index configuration.

   Make the following selections on the page and then click Next.

   | Search Type | Select the Vector Search index type. |
   | --- | --- |
   | How do you want to set up your vector data? | Select one of the following: Automated Embedding if you want MongoDB to generate and manage vector embeddings for your text fields.; Bring your own embeddings if you have already generated vector embeddings for your data. Choose Automated Embedding. |
   | Index Name and Data Source | Specify the following information: Index Name: `autoembed_index` is the default index name. Index names must be unique within the namespace, regardless of the index type. If you already have an index named `autoembed_index` on this collection, enter a different name.; Database and Collection:`<database_name>`; `<collection_name>` |
   | Configuration Method | For a guided experience, select Visual Editor.To edit the raw index definition, select JSON Editor. |

4) Specify the index definition.

   ###### Visual Editor

   ###### Use the Visual Editor for a guided experience.

   To configure the index, do the following:

   Specify text fields to index with Automated Embedding.

   For each text field that you want to index with Automated Embeddings, specify the following settings in the AutoEmbed Field section of the Visual Editor:

   | Setting | Necessity | Value |
   | --- | --- | --- |
   | Path | Required | Select the text field for which you want to enable Automated Embedding. |
   | Embedding Model | Required | Select the Voyage AI embedding model to use for generating embeddings. You can specify one of the following models: `voyage-4` - (**Recommended**) Optimized for general-purpose and multilingual retrieval quality.; `voyage-4-large` - Maximum accuracy for complex semantic relationships.; `voyage-4-lite` - Optimized for high-volume, cost-sensitive applications.; `voyage-code-4` - (**Recommended for code**) Specialized for code search and technical documentation.; `voyage-code-3` - Legacy model specialized for code search and technical documentation. Use `voyage-code-4` instead. |
   | Advanced | Optional | Specify additional settings for your index. If omitted, MongoDB Vector Search uses the default values for these settings. Quantization - Select the quantization type for your embeddings. Value can be `scalar`, `float`, `binary`, or `binaryNoRescore`.  Defaults to `scalar`.; Number of Dimensions - Select the number of dimensions for your embeddings. Value can be `256`, `512`, `1024`, or `2048`. Defaults to `1024`.; Similarity Function - Select the similarity function to use for your embeddings. Value can be `euclidean`, `cosine`, or `dot product`. Defaults to `dot product`. |

   You can add multiple fields to your index. However, you can't add a field of type `vector` and `autoEmbed` in the same index.

   (Optional) Specify fields to use to pre-filter your data.

   In the Filter Field section of the Visual Editor, select the field from the Path dropdown that you want to use to pre-filter data at query time. You can index multiple `filter` fields.

   Indexing a field as the `filter` type allows you to pre-filter the search space according to the value of the indexed field when you run [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries. To learn more about how to use the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch)  `filter` option, see [MongoDB Vector Search Filtering.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-vectorSearch-agg-pipeline-filter)

   Click Next to review your index.

   To learn more about the MongoDB Vector Search index settings, see [How to Index Fields for Vector Search.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search)

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   Select the `sample_mflix` database and `movies` collection. Then, configure the index for the AutoEmbed field as follows:

   | Setting | Necessity | Value |
   | --- | --- | --- |
   | Path | Required | Select `fullplot`. |
   | Embedding Model | Required | Select `voyage-4`. |

   ###### JSON Editor

   ###### Use the JSON Editor to edit the raw JSON.

   Replace the default and placeholder values in the index definition as needed. To learn more about the MongoDB Vector Search index settings, see [Syntax](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-index-definition) and [MongoDB Vector Search Index Fields.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search-options)

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   Select the `sample_mflix` database and `movies` collection. Then, replace the default index definition with the following:

   ```json
   {
     "fields": [
       {
         "type": "autoEmbed",
         "modality": "text",
         "path": "fullplot",
         "model": "voyage-4"
       }
     ]
   }
   ```

5) Click Create Vector Search Index.

   Atlas displays a modal window to let you know your index is building.

6) Close the You're All Set! Modal Window by clicking the Close button.

7) Check the status.

   The newly created index displays on the Search & Vector Search page. While the index is building, the Status field reads Pending. When the index is finished building, the Status field reads Ready.

   **Note:**

   Larger collections take longer to index. You will receive an email notification when your index is finished building.

To create a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to create the index.

   ### Basic Example

   ```text
   use sample_mflix
   ```

   ```text
   switched to db sample_mflix
   ```

3. Create the index using the `db.collection.createSearchIndex()` method.

   Define the index in the `db.collection.createSearchIndex()` method

   The [`db.collection.createSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex.md#mongodb-method-db.collection.createSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.createSearchIndex(
   "<index-name>",
   "vectorSearch", //index type
   {
      fields: [
         {
         "type": "autoEmbed",
         "modality": "text",
         "path": "<field-to-index>",
         "model": "<embedding-model>"
         },
         {
         "type": "filter",
         "path": "<field-to-index>"
         },
         ...
      ]
   });
   ```

   Replace the following placeholder values in your index definition:

   | `<collectionName>` | Name of the collection. |
   | --- | --- |
   | `<index-name>` | Name of the index. |
   | `<field-to-index>` | Name of the field to index. |
   | `<embedding-model>` | Voyage AI embedding model to use for generating embeddings. |

   Run the `db.collection.createSearchIndex()` method.

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   ```shell
   db.embedded_movies.createSearchIndex(
     "autoembed_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4"
         }
       ]
     }
   );
   ```

To create a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(vector_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(vector_index
     create-auto-embed-index.cpp
   )

   target_link_libraries(vector_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `create-auto-embed-index.cpp` file and define the index in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     try {
       mongocxx::instance inst{};

       // Connect to your deployment
       const auto uri = mongocxx::uri{"<connectionString>"};
       mongocxx::client conn{uri};

       // Access your database and collection
       auto db = conn["<databaseName>"];
       auto collection = db["<collectionName>"];

       auto siv = collection.search_indexes();
       std::string name = "<indexName>";

       // Define the index with automated embedding and filter fields
       auto definition = make_document(
           kvp("fields",
               make_array(make_document(
                   kvp("type", "autoEmbed"), kvp("modality", "text"),
                   kvp("path", "<fieldToIndex>"),
                   kvp("model", "<embeddingModel>")))));
       auto model =
           mongocxx::search_index_model(name, definition.view())
               .type("vectorSearch");

       // Create the search index
       siv.create_one(model);
       std::cout << "New search index named " << name << " is building."
                 << std::endl;

       // Wait for initial sync to complete
       std::cout << "Polling to check if the index is ready. This may take up to "
                    "a minute."
                 << std::endl;
       bool queryable = false;
       while (!queryable) {
         auto indexes = siv.list();
         for (const auto& index : indexes) {
           if (index["name"].get_value() == name) {
             queryable = index["queryable"].get_bool();
           }
         }
         if (!queryable) {
           std::this_thread::sleep_for(std::chrono::seconds(5));
         }
       }
       std::cout << name << " is ready for querying." << std::endl;
     } catch (const std::exception& e) {
       std::cout << "Exception: " << e.what() << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field to index for automated embedding vector search. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. |

   For example, copy and paste the following into the `create-auto-embed-index.cpp` file and replace the `<connectionString>` placeholder value. The following index definition indexes the `fullplot` field as the `autoEmbed` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index.

   ### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     try {
       mongocxx::instance inst{};

       // Connect to your deployment
       const auto uri = mongocxx::uri{"<connectionString>"};
       mongocxx::client conn{uri};

       // Access your database and collection
       auto db = conn["sample_mflix"];
       auto collection = db["movies"];

       auto siv = collection.search_indexes();
       std::string name = "vector_index";

       // Define the index with automated embedding
       auto definition = make_document(
           kvp("fields",
               make_array(make_document(
                   kvp("type", "autoEmbed"), kvp("modality", "text"),
                   kvp("path", "fullplot"), kvp("model", "voyage-4")))));
       auto model =
           mongocxx::search_index_model(name, definition.view())
               .type("vectorSearch");

       // Create the search index
       siv.create_one(model);
       std::cout << "New search index named " << name << " is building."
                 << std::endl;

       // Wait for initial sync to complete
       std::cout << "Polling to check if the index is ready. This may take up to "
                    "a minute."
                 << std::endl;
       bool queryable = false;
       while (!queryable) {
         auto indexes = siv.list();
         for (const auto& index : indexes) {
           if (index["name"].get_value() == name) {
             queryable = index["queryable"].get_bool();
           }
         }
         if (!queryable) {
           std::this_thread::sleep_for(std::chrono::seconds(5));
         }
       }
       std::cout << name << " is ready for querying." << std::endl;
     } catch (const std::exception& e) {
       std::cout << "Exception: " << e.what() << std::endl;
     }
     return 0;
   }

   ```

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to create the index.

   ```shell
   ./build/vector_index
   ```

To create a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#atlas-search-indexes) driver v3.6 or later, perform the following steps:

1. Create a `.cs` file and define the index in the file.

   ```csharp
   using MongoDB.Bson;  
   using MongoDB.Bson.Serialization.Conventions;  
   using MongoDB.Driver;  
   using System;  
   using System.Threading;  
     
   namespace VectorSearch;  
     
   class Program  
   {  
       static void Main(string[] args)  
       {  
           // Map title-case class properties to camel-case MongoDB fields  
           var camelCaseConvention = new ConventionPack { new CamelCaseElementNameConvention() };  
           ConventionRegistry.Register("CamelCase", camelCaseConvention, type => true);  
             
           // Connect to your deployment  
           const string mongoConnectionString = "<connectionString>";  
           var client = new MongoClient(mongoConnectionString);  
     
           // Access your database and collection  
           var database = client.GetDatabase("<databaseName>");  
           var collection = database.GetCollection<BsonDocument>("<collectionName>");  
             
           CreateIndex(client, collection, "<indexName>");  
       }  
     
       private static void CreateIndex(MongoClient client, IMongoCollection<BsonDocument> collection, string indexName)  
       {  
           // Create your index model, then create the search index  
           var model = new CreateAutoEmbeddingVectorSearchIndexModel<BsonDocument>(  
               "<fieldToIndex>",      // Field to index  
               indexName,             // Index name  
               "<embeddingModel>"     // Supported Embedding model   
               // Optional: add filter fields as additional parameters if needed  
           );  
     
           var searchIndexView = collection.SearchIndexes;  
           searchIndexView.CreateOne(model);  
           Console.WriteLine($"New search index named {indexName} is building.");  
     
           // Wait for initial sync to complete  
           Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");  
     
           bool isReady = false;  
           while (!isReady)  
           {  
               var indexes = searchIndexView.List();  
               foreach (var index in indexes.ToEnumerable())  
               {  
                   if (index["name"] == indexName)  
                   {  
                       isReady = index.Contains("latestDefinition");  
                   }  
               }  
     
               if (!isReady)  
               {  
                   Thread.Sleep(5000);  
               }  
           }  
             
           Console.WriteLine($"{indexName} is ready for querying.");  
       }  
   }  

   ```

   For example, create a file named `IndexService.cs`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver). The connection string must specify `directConnection=true`. |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<fieldToIndex>` | Vector and filter fields to index. For this parameter, you can pass either a `FieldDefinition<TDocument>` object or a lambda expression. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. |

   For example, copy and paste the following into the `IndexService.cs` and replace the `<connectionString>` placeholder value. The following index definition indexes the `plot_embedding_voyage_3_large` field as the `vector` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index. The `plot_embedding_voyage_3_large` field contains embeddings created using Voyage AI's `voyage-3-large` embedding model. The index definition specifies `2048` vector dimensions and measures similarity using `dotProduct` function.

   ### Basic Example

   The following index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search.

   ```csharp
   using MongoDB.Bson;  
   using MongoDB.Bson.Serialization.Conventions;  
   using MongoDB.Driver;  
     
   namespace VectorSearch;  
     
   class Program  
   {  
       static void Main(string[] args)  
       {  
           // Map title-case class properties to camel-case MongoDB fields  
           var camelCaseConvention = new ConventionPack { new CamelCaseElementNameConvention() };  
           ConventionRegistry.Register("CamelCase", camelCaseConvention, type => true);  
             
           // Connect to your deployment  
           const string mongoConnectionString = "<connectionString>";  
           var client = new MongoClient(mongoConnectionString);  
     
           // Access your database and collection  
           var database = client.GetDatabase("sample_mflix");  
           var collection = database.GetCollection<BsonDocument>("movies");  
             
           CreateVectorIndex(client, collection, "autoembed_index");  
       }  
     
       private static void CreateVectorIndex(MongoClient client, IMongoCollection<BsonDocument> collection, string indexName)  
       {  
           // Create your index model, then create the search index  
           var model = new CreateAutoEmbeddingVectorSearchIndexModel<BsonDocument>(  
               "fullplot",            // Field to index  
               indexName,             // Index name  
               "voyage-4"             // Supported Embedding model   
               // Optional: add filter fields as additional parameters if needed  
           );  
     
           var searchIndexView = collection.SearchIndexes;  
           searchIndexView.CreateOne(model);  
           Console.WriteLine($"New search index named {indexName} is building.");  
     
           // Wait for initial sync to complete  
           Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");  
     
           bool isReady = false;  
           while (!isReady)  
           {  
               var indexes = searchIndexView.List();  
               foreach (var index in indexes.ToEnumerable())  
               {  
                   if (index["name"] == indexName)  
                   {  
                       isReady = index.Contains("latestDefinition");  
                   }  
               }  
     
               if (!isReady)  
               {  
                   Thread.Sleep(5000);  
               }  
           }  
             
           Console.WriteLine($"{indexName} is ready for querying.");  
       }  
   }  

   ```

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.CreateVectorIndex();
   ```

4. Compile and run your project to create the index.

   ```shell
   dotnet run
   ```

To create a MongoDB Vector Search index for a collection by using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.1 or later, perform the following steps:

1. Create a file called `create-index.go` and define the index in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   const (
   	indexName = "<index-name>"
   )

   // autoEmbedField represents the auto-embedding index field definition.
   type autoEmbedField struct {
   	Type     string `bson:"type"`    
   	Modality string `bson:"modality"` 
   	Path     string `bson:"path"`     
   	Model    string `bson:"model"`   
   }

   // filterField represents a filter field in the vectorSearch index definition.
   type filterField struct {
   	Type string `bson:"type"`
   	Path string `bson:"path"`
   }

   // autoEmbedIndexDefinition is the top-level index definition.
   type autoEmbedIndexDefinition struct {
   	Fields []any `bson:"fields"`
   }

   func main() {
   	// Replace with your MongoDB connection string.
   	uri := "<connection-string>"

   	// Create a context with a timeout for index creation and polling.
   	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
   	defer cancel()

   	// Connect to your deployment.
   	client, err := mongo.Connect(options.Client().ApplyURI(uri))
   	if err != nil {
   		log.Fatalf("Failed to connect to MongoDB: %v", err)
   	}
   	defer func() {
   		if err := client.Disconnect(context.Background()); err != nil {
   			log.Printf("Error disconnecting client: %v", err)
   		}
   	}()

   	// Access your database and collection.
   	db := client.Database("<database-name>")
   	coll := db.Collection("<collection-name>")

   	// 1. Create the auto-embedding vectorSearch index.
   	if err := createAutoEmbeddingIndex(ctx, coll); err != nil {
   		log.Fatalf("Failed to create auto-embedding index: %v", err)
   	}
   	fmt.Println("New search index named", indexName, "is building.")

   	// 2. Wait until the index is queryable (initial sync complete).
   	fmt.Println("Polling to check if the index is ready. This may take up to a minute.")
   	if err := waitForIndexQueryable(ctx, coll, indexName); err != nil {
   		log.Fatalf("Error while waiting for index to become queryable: %v", err)
   	}
   	fmt.Println(indexName, "is ready for querying.")
   }

   func createAutoEmbeddingIndex(ctx context.Context, coll *mongo.Collection) error {
   	// Define the index fields.
   	definition := autoEmbedIndexDefinition{
   		Fields: []any{
   			autoEmbedField{
   				Type:     "autoEmbed",
   				Modality: "text",
   				Path:     "<field-to-index>",
   				Model:    "<embedding-model>",
   			},
   			filterField{
   				Type: "filter",
   				Path: "<field-to-index>",
   			},
   			...
   		},
   	}

   	// Set index name and type "vectorSearch".
   	opts := options.SearchIndexes().
   		SetName(indexName).
   		SetType("vectorSearch")

   	model := mongo.SearchIndexModel{
   		Definition: definition,
   		Options:    opts,
   	}

   	_, err := coll.SearchIndexes().CreateOne(ctx, model)
   	return err
   }

   func waitForIndexQueryable(ctx context.Context, coll *mongo.Collection, name string) error {
   	for {
   		// List just this index by name.
   		opts := options.SearchIndexes().SetName(name)
   		cursor, err := coll.SearchIndexes().List(ctx, opts)
   		if err != nil {
   			return fmt.Errorf("list search indexes: %w", err)
   		}

   		var results []bson.M
   		if err := cursor.All(ctx, &results); err != nil {
   			return fmt.Errorf("decode search index list: %w", err)
   		}

   		if len(results) > 0 {
   			if q, ok := results[0]["queryable"].(bool); ok && q {
   				return nil
   			}
   		}

   		select {
   		case <-ctx.Done():
   			return ctx.Err()
   		case <-time.After(5 * time.Second):
   			// Continue polling.
   		}
   	}
   }
   ```

   **Note: Programmatic Index Creation**

   The MongoDB Go driver supports programmatic MongoDB Vector Search index management starting in v1.16.0, but the preceding code shows the syntax for the v2.x driver.

2. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

   **Example:**

   Copy and paste the following into the `create-index.go` file and replace the `<connection-string>` placeholder value. The following index definition indexes the `fullplot` field as the `autoEmbed` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index.

   ### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ```go
   package main

   import (
           "context"
           "fmt"
           "log"
           "time"

           "go.mongodb.org/mongo-driver/v2/bson"
           "go.mongodb.org/mongo-driver/v2/mongo"
           "go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   const (
           indexName = "autoembed_index"
   )

   // autoEmbedField represents the auto-embedding index field definition.
   type autoEmbedField struct {
           Type     string `bson:"type"`     
           Modality string `bson:"modality"` 
           Path     string `bson:"path"`     
           Model    string `bson:"model"`  
   }

   // autoEmbedIndexDefinition is the top-level index definition.
   type autoEmbedIndexDefinition struct {
           Fields []any `bson:"fields"`
   }

   func main() {
           // Replace with your MongoDB connection string.
           uri := "<connection-string>"

           // Create a context with a timeout for index creation and polling.
           ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
           defer cancel()

           // Connect to your deployment.
           client, err := mongo.Connect(options.Client().ApplyURI(uri))
           if err != nil {
                   log.Fatalf("Failed to connect to MongoDB: %v", err)
           }
           defer func() {
                   if err := client.Disconnect(context.Background()); err != nil {
                           log.Printf("Error disconnecting client: %v", err)
                   }
           }()

           // Access your database and collection.
           db := client.Database("sample_mflix")
           coll := db.Collection("movies")

           // 1. Create the auto-embedding vectorSearch index.
           if err := createAutoEmbeddingIndex(ctx, coll); err != nil {
                   log.Fatalf("Failed to create auto-embedding index: %v", err)
           }
           fmt.Println("New search index named", indexName, "is building.")

           // 2. Wait until the index is queryable (initial sync complete).
           fmt.Println("Polling to check if the index is ready. This may take up to a minute.")
           if err := waitForIndexQueryable(ctx, coll, indexName); err != nil {
                   log.Fatalf("Error while waiting for index to become queryable: %v", err)
           }
           fmt.Println(indexName, "is ready for querying.")
   }

   func createAutoEmbeddingIndex(ctx context.Context, coll *mongo.Collection) error {
           // Define the index fields.
           definition := autoEmbedIndexDefinition{
                   Fields: []any{
                           autoEmbedField{
                                   Type:     "autoEmbed",
                                   Modality: "text",
                                   Path:     "fullplot",
                                   Model:    "voyage-4",
                           },
                   },
           }

           // Set index name and type "vectorSearch".
           opts := options.SearchIndexes().
                   SetName(indexName).
                   SetType("vectorSearch")

           model := mongo.SearchIndexModel{
                   Definition: definition,
                   Options:    opts,
           }

           _, err := coll.SearchIndexes().CreateOne(ctx, model)
           return err
   }

   func waitForIndexQueryable(ctx context.Context, coll *mongo.Collection, name string) error {
           for {
                   // List just this index by name.
                   opts := options.SearchIndexes().SetName(name)
                   cursor, err := coll.SearchIndexes().List(ctx, opts)
                   if err != nil {
                           return fmt.Errorf("list search indexes: %w", err)
                   }

                   var results []bson.M
                   if err := cursor.All(ctx, &results); err != nil {
                           return fmt.Errorf("decode search index list: %w", err)
                   }

                   if len(results) > 0 {
                           index := results[0]
                           queryable, qOk := index["queryable"].(bool)
                           status, sOk := index["status"].(string)
                           
                           fmt.Printf("Index status: queryable=%v (ok=%v), status=%q (ok=%v)\n", 
                                   queryable, qOk, status, sOk)
                           
                           if sOk && status == "READY" {
                                   fmt.Println("Index is ready for querying.")
                                   return nil
                           }
                   }

                   select {
                   case <-ctx.Done():
                           return ctx.Err()
                   case <-time.After(5 * time.Second):
                           // Continue polling.
                   }
           }
   }
   ```

3. Run the following command to create the index.

   ```shell
   go run create-index.go
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create a `.java` file and define the index in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class AutoEmbedIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index details
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                           new Document("type", "autoEmbed")
                                   .append("modality", "text")
                                   .append("model", "<embeddingModel>")
                                   .append("path", "<fieldToIndex>")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<embeddingModel>` | Voyage AI embedding model you want MongoDB Vector Search to use for automatically generating embeddings. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   The following example index definitions enable Automated Embedding for the `fullplot` field in the `sample_mflix.movies` collection.

   ### Basic Example

   This index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the model to use for generating embeddings for the `fullplot` field.

   Copy and paste the following into the file you created, and replace the `<connection-string>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;

   import java.util.Arrays;
   import java.util.Collections;

   public class VectorIndex {
       public static void main(String[] args) throws InterruptedException {
           // connect to your deployment
           String uri = "<connection-string>";
           
           try (MongoClient client = MongoClients.create(uri)) {
               MongoDatabase database = client.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("movies");
               
               // define your MongoDB Vector Search index
               SearchIndexModel indexModel = new SearchIndexModel(
                   "autoembed_index",
                   new Document("fields",
                       Arrays.asList(
                       	new Document("type", "autoEmbed")
                               .append("modality", "text")
                               .append("model", "voyage-4")
                               .append("path", "fullplot")
                       )
                   ),
                   SearchIndexType.vectorSearch()
               );
               
               // run the helper method
               String result = collection.createSearchIndexes(Collections.singletonList(indexModel)).get(0);
               System.out.println("New search index named " + result + " is building.");
               
               System.out.println("Polling to check if the index is ready. This may take up to a minute.");
               boolean isQueryable = false;
               while (!isQueryable) {
                   for (Document index : collection.listSearchIndexes()) {
                       if (result.equals(index.getString("name"))) {
                           String status = index.getString("status");
                           if ("READY".equals(status) || status == null) {
                               System.out.println(result + " is ready for querying.");
                               isQueryable = true;
                           }
                           break;
                       }
                   }

                   // wait for the index to be ready to query
                   if (!isQueryable) {
                       Thread.sleep(5000);
                   }
               }
           }
       }
   }
   ```

3. Execute the code to create the index.

   From your IDE, run the file to create the index.

To create a MongoDB Vector Search index for a collection using the [Node.js driver](https://www.mongodb.com/docs/drivers/node/current/indexes/), perform the following steps:

1. Create a `.js` file and define the index in the file.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("<databaseName>");
        const collection = database.collection("<collectionName>");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "<indexName>",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "autoEmbed",
                  "modality": "text",
                  "path": "<fieldToIndex>",
                  "model": "<embeddingModel>"
                },
                {
                  "type": "filter",
                  "path": "<fieldToIndex>"
                },
                ...
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);
        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   **Example:**

   Create a file named `vector-index.js`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<fieldToIndex>` | Vector and filter fields to index. |
   | `<embeddingModel>` | Name of Voyage AI embedding model to use. |

   **Example:**

   Copy and paste the following into the `vector-index.js` file and replace the `<connectionString>` placeholder value. The following index definition uses the `sample_mflix.movies` collection.

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "autoembed_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "autoEmbed",
                  "modality": "text",
                  "path": "fullplot",
                  "model": "voyage-4"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

3. Run the following command to create the index.

   ```shell
   node <file-name>.js
   ```

   **Example:**

   ```shell
   node autoembed_index.js
   ```

To create a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver, perform the following steps:

1. Create a `.py` file and define the index in the file.

   ### Tab

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "<fieldToIndex>",
           "model": "<embeddingModel>"
         },
         {
           "type": "filter",
           "path": "<fieldToIndex>"
         },
         ...
       ]
     },
     name="<indexName>",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   To learn more, see the [create\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.create_search_index) method.

   **Example:**

   Create a file named `vector-index.py`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name for your index. |
   | `<embeddingModel>` | Voyage AI embedding model you want MongoDB Vector Search to use for automatically generating embeddings. |
   | `<fieldToIndex>` | Name of field to index. |

   **Example:**

   Copy and paste the following into the `vector-index.py` and replace the `<connectionString>` placeholder value.

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4"
         }
       ]
     },
     name="autoembed_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

3. Run the following command to create the index.

   ```shell
   python <file-name>.py
   ```

   **Example:**

   ```shell
   python vector-index.py
   ```

To create a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-create-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index.

   In the `/src` directory of your project, create a file named `create_index.rs`. Copy and paste the following code into the file.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<database-name>")
           .collection("<collection-name>");

       let index_name = "<index-name>";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "<field-to-index>",
                   "model": "<embedding-model>"
               },
               {
                   "type": "filter",
                   "path": "<field-to-index>"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

3. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

   For example, copy and paste one of the following index definitions into the `create_index.rs` file and replace the `<connection-string>` placeholder value.

   ###### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("movies");

       let index_name = "vector_index";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "fullplot",
                   "model": "voyage-4"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

   ###### Filter Example

   The following index definition indexes these fields:

   - String field (`genres`) and numeric field (`year`) for pre-filtering the data

   - Text field (`fullplot`) for automated embedding vector search

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("movies");

       let index_name = "vector_index";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "fullplot",
                   "model": "voyage-4",
                   "quantization": "scalar"
               },
               {
                   "type": "filter",
                   "path": "genres"
               },
               {
                   "type": "filter",
                   "path": "year"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod create_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       create_index::create_index().await
   }
   ```

5. Run the following command to create the index.

   ```shell
   cargo run
   ```

To create a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) v2.1.2 or later, perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to create the index.

   **Example:**

   ```shell
   use sample_mflix
   ```

   **Output:**

   ```shell
    switched to db sample_mflix
   ```

3. Run the `db.collection.createSearchIndex()` method.

   The [`db.collection.createSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex.md#mongodb-method-db.collection.createSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.createSearchIndex(
     "<index-name>",
     "vectorSearch", //index type
     {
       fields: [
         {
           "type": "vector",
           "numDimensions": <number-of-dimensions>,
           "path": "<field-to-index>",
           "similarity": "euclidean | cosine | dotProduct",
           "quantization": "none | scalar | binary",
           "indexingMethod": "flat | hnsw",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           }
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

   The following example index definitions indexes the `vector` type fields in the sample data.

   ###### Basic Example

   ###### Index only the vector embeddings field.

   The following index definition indexes only the vector embeddings field using the default [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         }
       ]
     }
   );
   ```

   ###### Filter Example

   ###### Index the vector embeddings field with filter fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "hnsw"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Multiple Vector Fields Example

   ###### Index multiple vector embeddings fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_4_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "vector",
           "path": "plot_embedding",
           "numDimensions": 1536,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Flat Example

   ###### Index the vector embeddings field with the \`\`flat\`\` indexing method.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Nested Field Example

   ###### Index nested vector fields.

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```shell
   db.listingsAndReviews.createSearchIndex(
     "vector_index",
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "reviews.comments_embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "address.country"
         },
         {
           "type": "filter",
           "path": "bedrooms"
         },
         {
           "type": "filter",
           "path": "property_type"
         },
         {
           "type": "filter",
           "path": "reviews.date"
         }
       ],
       "nestedRoot": "reviews"
     }
   );
   ```

   ###### Stored Source Example

   ###### Index the vector embeddings field with stored source fields.

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```shell
   db.embedded_movies.createSearchIndex(
     "vector_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ],
       "storedSource": {
         "include": [ "genres", "plot", "title", "year" ]
       }
     }
   );
   ```

To create a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(vector_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(vector_index
     create-index.cpp
   )

   target_link_libraries(vector_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `create-index.cpp` file and define the index in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Define the index with a vector field for your existing embeddings
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "<fieldToIndex>"),
                 kvp("numDimensions", <numberOfDimensions>),
                 kvp("similarity", "<similarity>"),
                 kvp("quantization", "<quantization>")))));
     auto model =
         mongocxx::search_index_model(name, definition.view())
             .type("vectorSearch");

     // Create the search index
     siv.create_one(model);
     std::cout << "New search index named " << name << " is building."
               << std::endl;

     // Wait for initial sync to complete
     std::cout << "Polling to check if the index is ready. This may take up to "
                  "a minute."
               << std::endl;
     bool queryable = false;
     while (!queryable) {
       auto indexes = siv.list();
       for (const auto& index : indexes) {
         const auto n = index["name"];
         const auto q = index["queryable"];
         if (n && q && n.get_string().value == name) {
           queryable = q.get_bool().value;
         }
       }
       if (!queryable) {
         std::this_thread::sleep_for(std::chrono::seconds(5));
       }
     }
     std::cout << name << " is ready for querying." << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field that contains your vector embeddings. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. This value must match the number of dimensions in your embeddings. |
   | `<similarity>` | Vector similarity function to use when searching. You can specify `euclidean`, `cosine`, or `dotProduct`. |
   | `<quantization>` | Automatic quantization to use for vectors before indexing, which reduces resource consumption. You can specify `none`, `scalar`, or `binary`. Use `scalar` to reduce memory while retaining accuracy, `binary` for the largest memory savings with the highest impact on accuracy, or `none` to disable quantization. To learn how to choose a quantization method, see [Vector Quantization.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-mdb_vs-quantization) |

   To try MongoDB Vector Search with sample data, you can create a sample index based on the `sample_mflix` sample database. To do so, use one of the following index definitions. You only need to enter a valid `<connectionString>` value to run the sample index in your implementation. The following index definition indexes the `plot_embedding_voyage_3_large` field as the `vector` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index. The `plot_embedding_voyage_3_large` field contains embeddings created using Voyage AI's `voyage-3-large` embedding model. The index definition specifies `2048` vector dimensions, measures similarity using the `dotProduct` function, and applies `scalar` quantization.

   ### Basic Example

   The following index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["sample_mflix"]["embedded_movies"];

     auto siv = collection.search_indexes();
     auto name = "vector_index";

     // Index the vector embeddings field for vector search
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "plot_embedding_voyage_3_large"),
                 kvp("numDimensions", 2048),
                 kvp("similarity", "dotProduct"),
                 kvp("quantization", "scalar")))));
     auto model =
         mongocxx::search_index_model(name, definition.view())
             .type("vectorSearch");

     // Create the search index
     siv.create_one(model);
     std::cout << "New search index named " << name << " is building."
               << std::endl;

     // Wait for initial sync to complete
     std::cout << "Polling to check if the index is ready. This may take up to "
                  "a minute."
               << std::endl;
     bool queryable = false;
     while (!queryable) {
       auto indexes = siv.list();
       for (const auto& index : indexes) {
         const auto n = index["name"];
         const auto q = index["queryable"];
         if (n && q && n.get_string().value == name) {
           queryable = q.get_bool().value;
         }
       }
       if (!queryable) {
         std::this_thread::sleep_for(std::chrono::seconds(5));
       }
     }
     std::cout << name << " is ready for querying." << std::endl;
     return 0;
   }

   ```

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to create the index.

   ```shell
   ./build/vector_index
   ```

To create a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#atlas-search-indexes) driver v3.1.0 or later, perform the following steps:

1. Create a `.cs` file and define the index in the file.

   ### Tab

   ```csharp
   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   // connect to your deployment
   private const string MongoConnectionString = "<connectionString>";
   var client = new MongoClient(MongoConnectionString);

   // Access your database and collection
   var database = client.GetDatabase("<databaseName>");
   var collection = database.GetCollection<BsonDocument>("<collectionName>");

   // Create your index model, then create the search index
   var name = "<indexName>";
   var model = new CreateVectorSearchIndexModel<<documentType>> (
       <fieldToIndex>
       name,
       <vectorSimilarity>,
       <numberOfDimensions>);

   var searchIndexView = collection.SearchIndexes;
   searchIndexView.CreateOne(model);
   Console.WriteLine($"New search index named {name} is building.");

   // Wait for initial sync to complete
   Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
   bool queryable = false;
   while (!queryable)
   {
       var indexes = searchIndexView.List();
       foreach (var index in indexes.ToEnumerable())
       {
           if (index["name"] == name)
           {
               queryable = index["queryable"].AsBoolean;
           }
       }
       if (!queryable)
       {
           Thread.Sleep(5000);
       }
   }
   Console.WriteLine($"{name} is ready for querying.");

   ```

   **Example:**

   Create a file named `IndexService.cs`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<documentType>` | Class that represents a document in the collection. To learn more, see [POCOs](https://www.mongodb.com/docs/drivers/csharp/current/serialization/poco/) in the .NET/C# driver documentation. |
   | `<fieldToIndex>` | Vector and filter fields to index. For this parameter, you can pass either a `FieldDefinition<TDocument>` object or a lambda expression. |
   | `<vectorSimilarity>` | Vector similarity function, defined in the `VectorSimilarity` enum. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |

   For example, copy and paste the following example index definition into the `IndexService.cs` and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your connection string
       private const string MongoConnectionString = "<connectionString>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";

               var model = new CreateVectorSearchIndexModel<Movie>(
                   m => m.PlotEmbedding,
                   name,
                   VectorSimilarity.DotProduct,
                   2048)
               {
                   Quantization = VectorQuantization.Scalar
               };

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your connection string
       private const string MongoConnectionString = "<connection-string>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";
               
               var model = new CreateVectorSearchIndexModel<Movie>(
                   m => m.PlotEmbedding,
                   name,
                   VectorSimilarity.DotProduct,
                   2048,
                   m => m.Genres,
                   m => m.Year)
               {
                   Quantization = VectorQuantization.Scalar,
               };

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;
   using System;
   using System.Threading;

   public class IndexService
   {
       // Replace the placeholder with your Atlas connection string
       private const string MongoConnectionString = "<connection-string>";
       public void CreateVectorIndex()
       {
           try
           {
               // Connect to your cluster
               var client = new MongoClient(MongoConnectionString);
               var database = client.GetDatabase("sample_mflix");
               var collection = database.GetCollection<BsonDocument>("embedded_movies");

               var searchIndexView = collection.SearchIndexes;
               var name = "vector_index";
               var type = SearchIndexType.VectorSearch;

               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "plot_embedding_voyage_4_large" },
                               { "numDimensions", 2048 },
                               { "similarity", "dotProduct" },
                               { "quantization", "scalar"}
                           },
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "plot_embedding" },
                               { "numDimensions", 1536 },
                               { "similarity", "dotProduct" },
                               { "quantization", "scalar"}
                           },
                           new BsonDocument
                           {
                               {"type", "filter"},
                               {"path", "genres"}
                           },
                           new BsonDocument
                           {
                               {"type", "filter"},
                               {"path", "year"}
                           }
                       }
                   }
               };

               var model = new CreateSearchIndexModel(name, type, definition);

               searchIndexView.CreateOne(model);
               Console.WriteLine($"New search index named {name} is building.");

               // Polling for index status
               Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");
               bool queryable = false;
               while (!queryable)
               {
                   var indexes = searchIndexView.List();
                   foreach (var index in indexes.ToEnumerable())
                   {
                       if (index["name"] == name)
                       {
                           queryable = index["queryable"].AsBoolean;
                       }
                   }
                   if (!queryable)
                   {
                       Thread.Sleep(5000);
                   }
               }
               Console.WriteLine($"{name} is ready for querying.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.CreateVectorIndex();
   ```

4. Compile and run your project to create the index.

   ```shell
   dotnet run
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `create-index.go` and define the index in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Define the index details
   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	indexModel := mongo.SearchIndexModel{
   		Definition: vectorDefinition{
   			Fields: []vectorDefinitionField{{
   				Type:          "vector",
   				Path:          "<fieldToIndex>",
   				NumDimensions: <numberOfDimensions>,
   				Similarity:    "euclidean | cosine | dotProduct"}},
   		},
   		Options: opts,
   	}

   	// Create the index
   	log.Println("Creating the index.")
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}

   	// Await the creation of the index.
   	log.Println("Polling to confirm successful index creation.")
   	log.Println("NOTE: This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println("Name of Index Created: " + searchIndexName)
   }

   ```

   **Note: Programmatic Index Creation**

   The MongoDB Go driver supports programmatic MongoDB Vector Search index management starting in v1.16.0, but the preceding code shows the syntax for the v2.x driver.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `create-index.go` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")

   	// Define the index details
   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   		Quantization  string `bson:"quantization"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	indexModel := mongo.SearchIndexModel{
   		Definition: vectorDefinition{
   			Fields: []vectorDefinitionField{{
   				Type:          "vector",
   				Path:          "plot_embedding_voyage_3_large",
   				NumDimensions: 2048,
   				Similarity:    "dotProduct",
   				Quantization:  "scalar"}},
   		},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")
   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   		Quantization  string `bson:"quantization"`
   	}

   	type filterField struct {
   		Type string `bson:"type"`
   		Path string `bson:"path"`
   	}

   	type indexDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	vectorDefinition := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding_voyage_3_large",
   		NumDimensions: 2048,
   		Similarity:    "dotProduct",
   		Quantization:  "scalar"}
   	genreFilterDefinition := filterField{"filter", "genres"}
   	yearFilterDefinition := filterField{"filter", "year"}

   	indexModel := mongo.SearchIndexModel{
   		Definition: bson.D{{Key: "fields", Value: [3]interface{}{
   			vectorDefinition,
   			genreFilterDefinition,
   			yearFilterDefinition}}},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your Atlas connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("sample_mflix").Collection("embedded_movies")
   	indexName := "vector_index"
   	opts := options.SearchIndexes().SetName(indexName).SetType("vectorSearch")

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type filterField struct {
   		Type string `bson:"type"`
   		Path string `bson:"path"`
   	}

   	type indexDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	vectorDefinition1 := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding_voyage_4_large",
   		NumDimensions: 2048,
   		Similarity:    "dotProduct",
   	}
   	vectorDefinition2 := vectorDefinitionField{
   		Type:          "vector",
   		Path:          "plot_embedding",
   		NumDimensions: 1536,
   		Similarity:    "dotProduct",
   	}
   	genreFilterDefinition := filterField{"filter", "genres"}
   	yearFilterDefinition := filterField{"filter", "year"}

   	indexModel := mongo.SearchIndexModel{
   		Definition: bson.D{{Key: "fields", Value: []interface{}{
   			vectorDefinition1,
   			vectorDefinition2,
   			genreFilterDefinition,
   			yearFilterDefinition}}},
   		Options: opts,
   	}

   	// Create the index
   	searchIndexName, err := coll.SearchIndexes().CreateOne(ctx, indexModel)
   	if err != nil {
   		log.Fatalf("failed to create the search index: %v", err)
   	}
   	log.Println("New search index named " + searchIndexName + " is building.")

   	// Await the creation of the index.
   	log.Println("Polling to check if the index is ready. This may take up to a minute.")
   	searchIndexes := coll.SearchIndexes()
   	var doc bson.Raw
   	for doc == nil {
   		cursor, err := searchIndexes.List(ctx, options.SearchIndexes().SetName(searchIndexName))
   		if err != nil {
   			fmt.Errorf("failed to list search indexes: %w", err)
   		}

   		if !cursor.Next(ctx) {
   			break
   		}

   		name := cursor.Current.Lookup("name").StringValue()
   		queryable := cursor.Current.Lookup("queryable").Boolean()
   		if name == searchIndexName && queryable {
   			doc = cursor.Current
   		} else {
   			time.Sleep(5 * time.Second)
   		}
   	}

   	log.Println(searchIndexName + " is ready for querying.")
   }

   ```

3. Run the following command to create the index.

   ```shell
   go run create-index.go
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and define the index in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index details
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "<fieldToIndex>")
                           .append("numDimensions", <numberOfDimensions>)
                           .append("similarity", "euclidean | cosine | dotProduct"),
                       new Document("type", "filter")
                           .append("path", "<fieldToIndex>"),
                       ...));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch()
               );

                // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.           
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   The following example index definitions index the vector and filter fields in the sample data.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.    
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search against pre-filtered data.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your Atlas connection string
           String uri = "<connection-string>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_3_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct")
                           .append("quantization", "scalar"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               definition = ((Document) definition).append("storedSource", new Document("include",
                   Arrays.asList("genres", "plot", "title", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   Copy and paste the following into the file you created, and replace the `<connectionString>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;
   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class VectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your Atlas connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("embedded_movies");

               // Define the index details with the filter fields
               String indexName = "vector_index";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "vector")
                           .append("path", "plot_embedding_voyage_4_large")
                           .append("numDimensions", 2048)
                           .append("similarity", "dotProduct"),
                       new Document("type", "vector")
                           .append("path", "plot_embedding")
                           .append("numDimensions", 1536)
                           .append("similarity", "dotProduct"),
                       new Document("type", "filter")
                           .append("path", "genres"),
                       new Document("type", "filter")
                           .append("path", "year")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("It may take up to a minute for the index to leave the BUILDING status and become queryable.");

               // Wait for Atlas to build the index
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }
   ```

3. Execute the code to create the index.

   From your IDE, run the file to create the index.

To create a MongoDB Vector Search index for a collection using the [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create a `.js` file and define the index in the file.

   ```javascript
   import { MongoClient, BSON } from "mongodb";  
   import { setTimeout } from "timers/promises";  

   // Connect to your MongoDB cluster
   const uri = process.env.MONGODB_URI || "<CONNECTION-STRING>";

   const client = new MongoClient(uri);

   async function main() {
     try {
       const DB_NAME = "<DATABASE-NAME>";
       const COLLECTION_NAME = "<COLLECTION-NAME>";
       const db = client.db(DB_NAME);
       const collection = db.collection(COLLECTION_NAME);

       // define your MongoDB Vector Search index
       const index = {
         name: "<INDEX-NAME>",
         type: "vectorSearch",
         definition: {
           fields: [
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.float32",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int8",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int1",
               similarity: "euclidean",
             },
           ],
         },
       };

       // Run the helper method
       const result = await collection.createSearchIndex(index);
       console.log(`New search index named ${result} is building.`);

       // Wait for the index to be ready to query
       console.log("Polling to check if the index is ready. This may take up to a minute.");
       let isQueryable = false;

       // Use filtered search for index readiness
       while (!isQueryable) {
         const [indexData] = await collection.listSearchIndexes(index.name).toArray();

         if (indexData) {
           isQueryable = indexData.queryable;
           if (!isQueryable) {
             await setTimeout(5000); // Wait for 5 seconds before checking again
           }
         } else {
           // Handle the case where the index might not be found
           console.log(`Index ${index.name} not found.`);
           await setTimeout(5000); // Wait for 5 seconds before checking again
         }
       }

       console.log(`${result} is ready for querying.`);
     } catch (error) {
       console.error("Error:", error);
     } finally {
       await client.close();
     }
   }

   main().catch((err) => {
     console.error("Unhandled error:", err);
   });

   ```

   **Example:**

   Create a file named `vector-index.js`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `vector-index.js` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`)

     for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`)

     using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "hnsw"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Flat Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`)

     for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`)

     using the `flat` indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "flat"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your Atlas Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_4_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "vector",
                  "numDimensions": 1536,
                  "path": "plot_embedding",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ],
              "storedSource": {
                "include": [ "genres", "plot", "title", "year" ]
              }
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

3. Run the following command to create the index.

   ```shell
   node <file-name>.js
   ```

   **Example:**

   ```shell
   node vector_index.js
   ```

To create MongoDB Vector Search indexes for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create a `.py` file and define the index in the file.

   ### Tab

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "numDimensions": <numberofDimensions>,
           "path": "<fieldToIndex>",
           "similarity": "euclidean | cosine | dotProduct",
           "quantization": "none | scalar | binary",
           "indexingMethod": "flat | hnsw",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           }
         },
         {
           "type": "filter",
           "path": "<fieldToIndex>"
         },
         ...
       ],
       "nestedRoot": "<arrayFieldToIndex>",
       "storedSource": {
         "include|exclude": ["<field-name>",...]
       }"
     },
     name="<indexName>",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   To learn more, see the [create\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.create_search_index) method.

   **Example:**

   Create a file named `vector-index.py`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `vector-index.py` and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-basic.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes only the `plot_embedding_voyage_3_large` field as the `vector` type using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Filter Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-filter.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar",
           "indexingMethod": "hnsw"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your Atlas deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_4_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
          {
           "type": "vector",
           "path": "plot_embedding",
           "numDimensions": 1536,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Flat Example

   Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/create-indexes-filter.ipynb)

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your Atlas deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "plot_embedding_voyage_3_large",
           "numDimensions": 2048,
           "similarity": "dotProduct",
           "quantization": "scalar"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ],
       "storedSource": {
         "include": [ "genres", "plot", "title", "year" ]
       }
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   ###### Nested Field Example

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string fields (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_airbnb"]
   collection = database["listingsAndReviews"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "vector",
           "path": "reviews.comments_embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "address.country"
         },
         {
           "type": "filter",
           "path": "bedrooms"
         },
         {
           "type": "filter",
           "path": "property_type"
         },
         {
           "type": "filter",
           "path": "reviews.date"
         }
       ],
       "nestedRoot": "reviews"
     },
     name="vector_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

3. Run the following command to create the index.

   ```shell
   python <file-name>.py
   ```

   **Example:**

   ```shell
   python vector-index.py
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, and the `sync` feature only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index.

   In the `/src` directory of your project, create a file named `create_index.rs`. Copy and paste the following code into the file.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "<fieldToIndex>",
                   "numDimensions": <numberOfDimensions>,
                   "similarity": "<vectorSimilarity>"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Vector field to index. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<vectorSimilarity>` | Vector similarity function to use to search for the top K-nearest neighbors. |

   For example, copy and paste one of the following index definitions into the `create_index.rs` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition indexes only the vector embeddings field using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("embedded_movies");

       let index_name = "vector_index";

       // Define the vector embeddings field to index.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "plot_embedding_voyage_3_large",
                   "numDimensions": 2048,
                   "similarity": "dotProduct",
                   "quantization": "scalar",
                   "indexingMethod": "hnsw"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) `indexingMethod` for performing vector search against pre-filtered data.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("embedded_movies");

       let index_name = "vector_index";

       // Define the vector field and the fields to pre-filter on.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "plot_embedding_voyage_3_large",
                   "numDimensions": 2048,
                   "similarity": "dotProduct",
                   "quantization": "scalar",
                   "indexingMethod": "hnsw"
               },
               {
                   "type": "filter",
                   "path": "genres"
               },
               {
                   "type": "filter",
                   "path": "year"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name").unwrap_or_default() == name {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod create_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       create_index::create_index().await
   }
   ```

5. Run the following command to create the index.

   ```shell
   cargo run
   ```

To create a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to create the index.

   **Example:**

   ```shell
   use sample_mflix
   ```

   **Output:**

   ```shell
   switched to db sample_mflix
   ```

3. Create the index using the `db.collection.createSearchIndex()` method.

   Define the index in the `db.collection.createSearchIndex()` method

   The [`db.collection.createSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex.md#mongodb-method-db.collection.createSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.createSearchIndex(
   "<index-name>",
   "vectorSearch", //index type
   {
      fields: [
         {
         "type": "autoEmbed",
         "modality": "text",
         "path": "<field-to-index>",
         "model": "<embedding-model>"
         },
         {
         "type": "filter",
         "path": "<field-to-index>"
         },
         ...
      ]
   });
   ```

   Replace the following placeholder values in your index definition:

   | `<collectionName>` | Name of the collection. |
   | --- | --- |
   | `<index-name>` | Name of the index. |
   | `<field-to-index>` | Name of the field to index. |
   | `<embedding-model>` | Voyage AI embedding model to use for generating embeddings. |

   Run the `db.collection.createSearchIndex()` method.

   ###### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   ```shell
   db.embedded_movies.createSearchIndex(
     "autoembed_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4"
         }
       ]
     }
   );
   ```

   ###### Filter Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field using the `voyage-4` embedding model.

   ```shell
   db.movies.createSearchIndex(
     "autoembed_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

   ###### Flat Example

   This index definition indexes the following fields from the [sample\_mflix.movies](https://www.mongodb.com/docs/manual/sample-data/sample-mflix.md#std-label-mflix-movies) sample dataset:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field using the `voyage-4` embedding model.

   The index definition also specifies the:

   - `similarity` parameter as `dotProduct` to measure the similarity between the query vector and the indexed vectors using the dot product similarity function.

   - `indexingMethod` parameter as `flat` to use the [flat](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-indexing-method-auto) index structure.

   ```shell
   db.movies.createSearchIndex(
     "autoembed_index", 
     "vectorSearch", 
     {
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4",
           "similarity": "dotProduct",
           "indexingMethod": "flat"
         },
         {
           "type": "filter",
           "path": "genres"
         },
         {
           "type": "filter",
           "path": "year"
         }
       ]
     }
   );
   ```

To create a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(vector_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(vector_index
     create-auto-embed-index.cpp
   )

   target_link_libraries(vector_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `create-auto-embed-index.cpp` file and define the index in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     try {
       mongocxx::instance inst{};

       // Connect to your deployment
       const auto uri = mongocxx::uri{"<connectionString>"};
       mongocxx::client conn{uri};

       // Access your database and collection
       auto db = conn["<databaseName>"];
       auto collection = db["<collectionName>"];

       auto siv = collection.search_indexes();
       std::string name = "<indexName>";

       // Define the index with automated embedding and filter fields
       auto definition = make_document(
           kvp("fields",
               make_array(make_document(
                   kvp("type", "autoEmbed"), kvp("modality", "text"),
                   kvp("path", "<fieldToIndex>"),
                   kvp("model", "<embeddingModel>")))));
       auto model =
           mongocxx::search_index_model(name, definition.view())
               .type("vectorSearch");

       // Create the search index
       siv.create_one(model);
       std::cout << "New search index named " << name << " is building."
                 << std::endl;

       // Wait for initial sync to complete
       std::cout << "Polling to check if the index is ready. This may take up to "
                    "a minute."
                 << std::endl;
       bool queryable = false;
       while (!queryable) {
         auto indexes = siv.list();
         for (const auto& index : indexes) {
           if (index["name"].get_value() == name) {
             queryable = index["queryable"].get_bool();
           }
         }
         if (!queryable) {
           std::this_thread::sleep_for(std::chrono::seconds(5));
         }
       }
       std::cout << name << " is ready for querying." << std::endl;
     } catch (const std::exception& e) {
       std::cout << "Exception: " << e.what() << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field to index for automated embedding vector search. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. |

   For example, copy and paste the following into the `create-auto-embed-index.cpp` file and replace the `<connectionString>` placeholder value. The following index definition indexes the `fullplot` field as the `autoEmbed` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index.

   ### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>
   #include <thread>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     try {
       mongocxx::instance inst{};

       // Connect to your deployment
       const auto uri = mongocxx::uri{"<connectionString>"};
       mongocxx::client conn{uri};

       // Access your database and collection
       auto db = conn["sample_mflix"];
       auto collection = db["movies"];

       auto siv = collection.search_indexes();
       std::string name = "vector_index";

       // Define the index with automated embedding
       auto definition = make_document(
           kvp("fields",
               make_array(make_document(
                   kvp("type", "autoEmbed"), kvp("modality", "text"),
                   kvp("path", "fullplot"), kvp("model", "voyage-4")))));
       auto model =
           mongocxx::search_index_model(name, definition.view())
               .type("vectorSearch");

       // Create the search index
       siv.create_one(model);
       std::cout << "New search index named " << name << " is building."
                 << std::endl;

       // Wait for initial sync to complete
       std::cout << "Polling to check if the index is ready. This may take up to "
                    "a minute."
                 << std::endl;
       bool queryable = false;
       while (!queryable) {
         auto indexes = siv.list();
         for (const auto& index : indexes) {
           if (index["name"].get_value() == name) {
             queryable = index["queryable"].get_bool();
           }
         }
         if (!queryable) {
           std::this_thread::sleep_for(std::chrono::seconds(5));
         }
       }
       std::cout << name << " is ready for querying." << std::endl;
     } catch (const std::exception& e) {
       std::cout << "Exception: " << e.what() << std::endl;
     }
     return 0;
   }

   ```

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to create the index.

   ```shell
   ./build/vector_index
   ```

To create a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#atlas-search-indexes) driver v3.6 or later, perform the following steps:

1. Create a `.cs` file and define the index in the file.

   ```csharp
   using MongoDB.Bson;  
   using MongoDB.Bson.Serialization.Conventions;  
   using MongoDB.Driver;  
   using System;  
   using System.Threading;  
     
   namespace VectorSearch;  
     
   class Program  
   {  
       static void Main(string[] args)  
       {  
           // Map title-case class properties to camel-case MongoDB fields  
           var camelCaseConvention = new ConventionPack { new CamelCaseElementNameConvention() };  
           ConventionRegistry.Register("CamelCase", camelCaseConvention, type => true);  
             
           // Connect to your deployment  
           const string mongoConnectionString = "<connectionString>";  
           var client = new MongoClient(mongoConnectionString);  
     
           // Access your database and collection  
           var database = client.GetDatabase("<databaseName>");  
           var collection = database.GetCollection<BsonDocument>("<collectionName>");  
             
           CreateIndex(client, collection, "<indexName>");  
       }  
     
       private static void CreateIndex(MongoClient client, IMongoCollection<BsonDocument> collection, string indexName)  
       {  
           // Create your index model, then create the search index  
           var model = new CreateAutoEmbeddingVectorSearchIndexModel<BsonDocument>(  
               "<fieldToIndex>",      // Field to index  
               indexName,             // Index name  
               "<embeddingModel>"     // Supported Embedding model   
               // Optional: add filter fields as additional parameters if needed  
           );  
     
           var searchIndexView = collection.SearchIndexes;  
           searchIndexView.CreateOne(model);  
           Console.WriteLine($"New search index named {indexName} is building.");  
     
           // Wait for initial sync to complete  
           Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");  
     
           bool isReady = false;  
           while (!isReady)  
           {  
               var indexes = searchIndexView.List();  
               foreach (var index in indexes.ToEnumerable())  
               {  
                   if (index["name"] == indexName)  
                   {  
                       isReady = index.Contains("latestDefinition");  
                   }  
               }  
     
               if (!isReady)  
               {  
                   Thread.Sleep(5000);  
               }  
           }  
             
           Console.WriteLine($"{indexName} is ready for querying.");  
       }  
   }  

   ```

   For example, create a file named `IndexService.cs`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver). The connection string must specify `directConnection=true`. |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<fieldToIndex>` | Vector and filter fields to index. For this parameter, you can pass either a `FieldDefinition<TDocument>` object or a lambda expression. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. |

   For example, copy and paste the following into the `IndexService.cs` and replace the `<connectionString>` placeholder value. The following index definition indexes the `plot_embedding_voyage_3_large` field as the `vector` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index. The `plot_embedding_voyage_3_large` field contains embeddings created using Voyage AI's `voyage-3-large` embedding model. The index definition specifies `2048` vector dimensions and measures similarity using `dotProduct` function.

   ### Basic Example

   The following index definition indexes only the vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search.

   ```csharp
   using MongoDB.Bson;  
   using MongoDB.Bson.Serialization.Conventions;  
   using MongoDB.Driver;  
     
   namespace VectorSearch;  
     
   class Program  
   {  
       static void Main(string[] args)  
       {  
           // Map title-case class properties to camel-case MongoDB fields  
           var camelCaseConvention = new ConventionPack { new CamelCaseElementNameConvention() };  
           ConventionRegistry.Register("CamelCase", camelCaseConvention, type => true);  
             
           // Connect to your deployment  
           const string mongoConnectionString = "<connectionString>";  
           var client = new MongoClient(mongoConnectionString);  
     
           // Access your database and collection  
           var database = client.GetDatabase("sample_mflix");  
           var collection = database.GetCollection<BsonDocument>("movies");  
             
           CreateVectorIndex(client, collection, "autoembed_index");  
       }  
     
       private static void CreateVectorIndex(MongoClient client, IMongoCollection<BsonDocument> collection, string indexName)  
       {  
           // Create your index model, then create the search index  
           var model = new CreateAutoEmbeddingVectorSearchIndexModel<BsonDocument>(  
               "fullplot",            // Field to index  
               indexName,             // Index name  
               "voyage-4"             // Supported Embedding model   
               // Optional: add filter fields as additional parameters if needed  
           );  
     
           var searchIndexView = collection.SearchIndexes;  
           searchIndexView.CreateOne(model);  
           Console.WriteLine($"New search index named {indexName} is building.");  
     
           // Wait for initial sync to complete  
           Console.WriteLine("Polling to check if the index is ready. This may take up to a minute.");  
     
           bool isReady = false;  
           while (!isReady)  
           {  
               var indexes = searchIndexView.List();  
               foreach (var index in indexes.ToEnumerable())  
               {  
                   if (index["name"] == indexName)  
                   {  
                       isReady = index.Contains("latestDefinition");  
                   }  
               }  
     
               if (!isReady)  
               {  
                   Thread.Sleep(5000);  
               }  
           }  
             
           Console.WriteLine($"{indexName} is ready for querying.");  
       }  
   }  

   ```

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.CreateVectorIndex();
   ```

4. Compile and run your project to create the index.

   ```shell
   dotnet run
   ```

To create a MongoDB Vector Search index for a collection by using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.1 or later, perform the following steps:

1. Create a file called `create-index.go` and define the index in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"
   	"time"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   const (
   	indexName = "<index-name>"
   )

   // autoEmbedField represents the auto-embedding index field definition.
   type autoEmbedField struct {
   	Type     string `bson:"type"`    
   	Modality string `bson:"modality"` 
   	Path     string `bson:"path"`     
   	Model    string `bson:"model"`   
   }

   // filterField represents a filter field in the vectorSearch index definition.
   type filterField struct {
   	Type string `bson:"type"`
   	Path string `bson:"path"`
   }

   // autoEmbedIndexDefinition is the top-level index definition.
   type autoEmbedIndexDefinition struct {
   	Fields []any `bson:"fields"`
   }

   func main() {
   	// Replace with your MongoDB connection string.
   	uri := "<connection-string>"

   	// Create a context with a timeout for index creation and polling.
   	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
   	defer cancel()

   	// Connect to your deployment.
   	client, err := mongo.Connect(options.Client().ApplyURI(uri))
   	if err != nil {
   		log.Fatalf("Failed to connect to MongoDB: %v", err)
   	}
   	defer func() {
   		if err := client.Disconnect(context.Background()); err != nil {
   			log.Printf("Error disconnecting client: %v", err)
   		}
   	}()

   	// Access your database and collection.
   	db := client.Database("<database-name>")
   	coll := db.Collection("<collection-name>")

   	// 1. Create the auto-embedding vectorSearch index.
   	if err := createAutoEmbeddingIndex(ctx, coll); err != nil {
   		log.Fatalf("Failed to create auto-embedding index: %v", err)
   	}
   	fmt.Println("New search index named", indexName, "is building.")

   	// 2. Wait until the index is queryable (initial sync complete).
   	fmt.Println("Polling to check if the index is ready. This may take up to a minute.")
   	if err := waitForIndexQueryable(ctx, coll, indexName); err != nil {
   		log.Fatalf("Error while waiting for index to become queryable: %v", err)
   	}
   	fmt.Println(indexName, "is ready for querying.")
   }

   func createAutoEmbeddingIndex(ctx context.Context, coll *mongo.Collection) error {
   	// Define the index fields.
   	definition := autoEmbedIndexDefinition{
   		Fields: []any{
   			autoEmbedField{
   				Type:     "autoEmbed",
   				Modality: "text",
   				Path:     "<field-to-index>",
   				Model:    "<embedding-model>",
   			},
   			filterField{
   				Type: "filter",
   				Path: "<field-to-index>",
   			},
   			...
   		},
   	}

   	// Set index name and type "vectorSearch".
   	opts := options.SearchIndexes().
   		SetName(indexName).
   		SetType("vectorSearch")

   	model := mongo.SearchIndexModel{
   		Definition: definition,
   		Options:    opts,
   	}

   	_, err := coll.SearchIndexes().CreateOne(ctx, model)
   	return err
   }

   func waitForIndexQueryable(ctx context.Context, coll *mongo.Collection, name string) error {
   	for {
   		// List just this index by name.
   		opts := options.SearchIndexes().SetName(name)
   		cursor, err := coll.SearchIndexes().List(ctx, opts)
   		if err != nil {
   			return fmt.Errorf("list search indexes: %w", err)
   		}

   		var results []bson.M
   		if err := cursor.All(ctx, &results); err != nil {
   			return fmt.Errorf("decode search index list: %w", err)
   		}

   		if len(results) > 0 {
   			if q, ok := results[0]["queryable"].(bool); ok && q {
   				return nil
   			}
   		}

   		select {
   		case <-ctx.Done():
   			return ctx.Err()
   		case <-time.After(5 * time.Second):
   			// Continue polling.
   		}
   	}
   }
   ```

   **Note: Programmatic Index Creation**

   The MongoDB Go driver supports programmatic MongoDB Vector Search index management starting in v1.16.0, but the preceding code shows the syntax for the v2.x driver.

2. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

   **Example:**

   Copy and paste the following into the `create-index.go` file and replace the `<connection-string>` placeholder value. The following index definition indexes the `fullplot` field as the `autoEmbed` type and the `genres` and `year` fields as the `filter` type in a MongoDB Vector Search index.

   ### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ```go
   package main

   import (
           "context"
           "fmt"
           "log"
           "time"

           "go.mongodb.org/mongo-driver/v2/bson"
           "go.mongodb.org/mongo-driver/v2/mongo"
           "go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   const (
           indexName = "autoembed_index"
   )

   // autoEmbedField represents the auto-embedding index field definition.
   type autoEmbedField struct {
           Type     string `bson:"type"`     
           Modality string `bson:"modality"` 
           Path     string `bson:"path"`     
           Model    string `bson:"model"`  
   }

   // autoEmbedIndexDefinition is the top-level index definition.
   type autoEmbedIndexDefinition struct {
           Fields []any `bson:"fields"`
   }

   func main() {
           // Replace with your MongoDB connection string.
           uri := "<connection-string>"

           // Create a context with a timeout for index creation and polling.
           ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
           defer cancel()

           // Connect to your deployment.
           client, err := mongo.Connect(options.Client().ApplyURI(uri))
           if err != nil {
                   log.Fatalf("Failed to connect to MongoDB: %v", err)
           }
           defer func() {
                   if err := client.Disconnect(context.Background()); err != nil {
                           log.Printf("Error disconnecting client: %v", err)
                   }
           }()

           // Access your database and collection.
           db := client.Database("sample_mflix")
           coll := db.Collection("movies")

           // 1. Create the auto-embedding vectorSearch index.
           if err := createAutoEmbeddingIndex(ctx, coll); err != nil {
                   log.Fatalf("Failed to create auto-embedding index: %v", err)
           }
           fmt.Println("New search index named", indexName, "is building.")

           // 2. Wait until the index is queryable (initial sync complete).
           fmt.Println("Polling to check if the index is ready. This may take up to a minute.")
           if err := waitForIndexQueryable(ctx, coll, indexName); err != nil {
                   log.Fatalf("Error while waiting for index to become queryable: %v", err)
           }
           fmt.Println(indexName, "is ready for querying.")
   }

   func createAutoEmbeddingIndex(ctx context.Context, coll *mongo.Collection) error {
           // Define the index fields.
           definition := autoEmbedIndexDefinition{
                   Fields: []any{
                           autoEmbedField{
                                   Type:     "autoEmbed",
                                   Modality: "text",
                                   Path:     "fullplot",
                                   Model:    "voyage-4",
                           },
                   },
           }

           // Set index name and type "vectorSearch".
           opts := options.SearchIndexes().
                   SetName(indexName).
                   SetType("vectorSearch")

           model := mongo.SearchIndexModel{
                   Definition: definition,
                   Options:    opts,
           }

           _, err := coll.SearchIndexes().CreateOne(ctx, model)
           return err
   }

   func waitForIndexQueryable(ctx context.Context, coll *mongo.Collection, name string) error {
           for {
                   // List just this index by name.
                   opts := options.SearchIndexes().SetName(name)
                   cursor, err := coll.SearchIndexes().List(ctx, opts)
                   if err != nil {
                           return fmt.Errorf("list search indexes: %w", err)
                   }

                   var results []bson.M
                   if err := cursor.All(ctx, &results); err != nil {
                           return fmt.Errorf("decode search index list: %w", err)
                   }

                   if len(results) > 0 {
                           index := results[0]
                           queryable, qOk := index["queryable"].(bool)
                           status, sOk := index["status"].(string)
                           
                           fmt.Printf("Index status: queryable=%v (ok=%v), status=%q (ok=%v)\n", 
                                   queryable, qOk, status, sOk)
                           
                           if sOk && status == "READY" {
                                   fmt.Println("Index is ready for querying.")
                                   return nil
                           }
                   }

                   select {
                   case <-ctx.Done():
                           return ctx.Err()
                   case <-time.After(5 * time.Second):
                           // Continue polling.
                   }
           }
   }
   ```

3. Run the following command to create the index.

   ```shell
   go run create-index.go
   ```

To create a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create a `.java` file and define the index in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;
   import java.util.List;
   import java.util.concurrent.TimeUnit;
   import java.util.stream.StreamSupport;

   public class AutoEmbedIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index details
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                           new Document("type", "autoEmbed")
                                   .append("modality", "text")
                                   .append("model", "<embeddingModel>")
                                   .append("path", "<fieldToIndex>")));

               // Define the index model
               SearchIndexModel indexModel = new SearchIndexModel(
                   indexName,
                   definition,
                   SearchIndexType.vectorSearch());

               // Create the index using the defined model
               List<String> result = collection.createSearchIndexes(Collections.singletonList(indexModel));
               System.out.println("Successfully created vector index named: " + result.get(0));
               System.out.println("Wait for the index to leave the BUILDING status and become queryable.");

               // Wait for index to build and become queryable
               System.out.println("Polling to confirm the index has left the BUILDING status.");
               // No special handling in case of a timeout. Custom handling can be implemented.
               waitForIndex(collection, indexName);
           }
       }

       /**
        * Polls the collection to check whether the specified index is ready to query.
        */
       public static <T> boolean waitForIndex(final MongoCollection<T> collection, final String indexName) {
           long startTime = System.nanoTime();
           long timeoutNanos = TimeUnit.SECONDS.toNanos(60);
           while (System.nanoTime() - startTime < timeoutNanos) {
               Document indexRecord = StreamSupport.stream(collection.listSearchIndexes().spliterator(), false)
                       .filter(index -> indexName.equals(index.getString("name")))
                       .findAny().orElse(null);
               if (indexRecord != null) {
                   if ("FAILED".equals(indexRecord.getString("status"))) {
                       throw new RuntimeException("Search index has FAILED status.");
                   }
                   if (indexRecord.getBoolean("queryable")) {
                       System.out.println(indexName + " index is ready to query");
                       return true;
                   }
               }
               try {
                   Thread.sleep(100); // busy-wait, avoid in production
               } catch (InterruptedException e) {
                   Thread.currentThread().interrupt();
                   throw new RuntimeException(e);
               }
           }
           return false;
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |
   | `<embeddingModel>` | Voyage AI embedding model you want MongoDB Vector Search to use for automatically generating embeddings. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   The following example index definitions enable Automated Embedding for the `fullplot` field in the `sample_mflix.movies` collection.

   ### Basic Example

   This index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the model to use for generating embeddings for the `fullplot` field.

   Copy and paste the following into the file you created, and replace the `<connection-string>` placeholder value.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import com.mongodb.client.model.SearchIndexModel;
   import com.mongodb.client.model.SearchIndexType;
   import org.bson.Document;

   import java.util.Arrays;
   import java.util.Collections;

   public class VectorIndex {
       public static void main(String[] args) throws InterruptedException {
           // connect to your deployment
           String uri = "<connection-string>";
           
           try (MongoClient client = MongoClients.create(uri)) {
               MongoDatabase database = client.getDatabase("sample_mflix");
               MongoCollection<Document> collection = database.getCollection("movies");
               
               // define your MongoDB Vector Search index
               SearchIndexModel indexModel = new SearchIndexModel(
                   "autoembed_index",
                   new Document("fields",
                       Arrays.asList(
                       	new Document("type", "autoEmbed")
                               .append("modality", "text")
                               .append("model", "voyage-4")
                               .append("path", "fullplot")
                       )
                   ),
                   SearchIndexType.vectorSearch()
               );
               
               // run the helper method
               String result = collection.createSearchIndexes(Collections.singletonList(indexModel)).get(0);
               System.out.println("New search index named " + result + " is building.");
               
               System.out.println("Polling to check if the index is ready. This may take up to a minute.");
               boolean isQueryable = false;
               while (!isQueryable) {
                   for (Document index : collection.listSearchIndexes()) {
                       if (result.equals(index.getString("name"))) {
                           String status = index.getString("status");
                           if ("READY".equals(status) || status == null) {
                               System.out.println(result + " is ready for querying.");
                               isQueryable = true;
                           }
                           break;
                       }
                   }

                   // wait for the index to be ready to query
                   if (!isQueryable) {
                       Thread.sleep(5000);
                   }
               }
           }
       }
   }
   ```

3. Execute the code to create the index.

   From your IDE, run the file to create the index.

To create a MongoDB Vector Search index for a collection using the [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/indexes/), perform the following steps:

1. Create a `.js` file and define the index in the file.

   ```javascript
   import { MongoClient, BSON } from "mongodb";  
   import { setTimeout } from "timers/promises";  

   // Connect to your MongoDB cluster
   const uri = process.env.MONGODB_URI || "<CONNECTION-STRING>";

   const client = new MongoClient(uri);

   async function main() {
     try {
       const DB_NAME = "<DATABASE-NAME>";
       const COLLECTION_NAME = "<COLLECTION-NAME>";
       const db = client.db(DB_NAME);
       const collection = db.collection(COLLECTION_NAME);

       // define your MongoDB Vector Search index
       const index = {
         name: "<INDEX-NAME>",
         type: "vectorSearch",
         definition: {
           fields: [
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.float32",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int8",
               similarity: "dotProduct",
             },
             {
               type: "vector",
               numDimensions: 1024,
               path: "bsonEmbeddings.int1",
               similarity: "euclidean",
             },
           ],
         },
       };

       // Run the helper method
       const result = await collection.createSearchIndex(index);
       console.log(`New search index named ${result} is building.`);

       // Wait for the index to be ready to query
       console.log("Polling to check if the index is ready. This may take up to a minute.");
       let isQueryable = false;

       // Use filtered search for index readiness
       while (!isQueryable) {
         const [indexData] = await collection.listSearchIndexes(index.name).toArray();

         if (indexData) {
           isQueryable = indexData.queryable;
           if (!isQueryable) {
             await setTimeout(5000); // Wait for 5 seconds before checking again
           }
         } else {
           // Handle the case where the index might not be found
           console.log(`Index ${index.name} not found.`);
           await setTimeout(5000); // Wait for 5 seconds before checking again
         }
       }

       console.log(`${result} is ready for querying.`);
     } catch (error) {
       console.error("Error:", error);
     } finally {
       await client.close();
     }
   }

   main().catch((err) => {
     console.error("Unhandled error:", err);
   });

   ```

   For example, create a file named `vector-index.js` to try the examples in this page.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

   For example, copy and paste the following into the `vector-index.js` file and replace the `<connectionString>` placeholder value.

   ###### Basic Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes only the `plot_embedding_voyage_3_large` field as the `vector` type using the default indexing method, [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320), for performing vector search.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Filter Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the [Hierarchical Navigable Small Worlds](https://arxiv.org/abs/1603.09320) indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "hnsw"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Multiple Vector Fields Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings fields named `plot_embedding` and `plot_embedding_voyage_4_large`.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your Atlas Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_4_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "vector",
                  "numDimensions": 1536,
                  "path": "plot_embedding",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Flat Example

   The following index definition on the `sample_mflix.embedded_movies` collection indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) using the `flat` indexing method for performing vector search against pre-filtered data.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar",
                  "indexingMethod": "flat"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ]
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Stored Source Example

   This index definition indexes the following fields:

   - A string field (`genres`) and a numeric field (`year`) for pre-filtering the data.

   - The vector embeddings field (`plot_embedding_voyage_3_large`) for performing vector search against pre-filtered data.

   It also enables automatic quantization (`scalar`) for efficient processing of the embeddings and stores `genres`, `title`, `plot`, and `year` fields on `mongot` for easy retrieval.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your Atlas deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_mflix");
        const collection = database.collection("embedded_movies");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "numDimensions": 2048,
                  "path": "plot_embedding_voyage_3_large",
                  "similarity": "dotProduct",
                  "quantization": "scalar"
                },
                {
                  "type": "filter",
                  "path": "genres"
                },
                {
                  "type": "filter",
                  "path": "year"
                }
              ],
              "storedSource": {
                "include": [ "genres", "plot", "title", "year" ]
              }
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

   ###### Nested Field Example

   Run the following Python script to create nested embeddings for the `reviews.comments` field in the `sample_airbnb.listingsAndReviews` collection after replacing following placeholder values:

   | Placeholder | Valid Value |
   | --- | --- |
   | `<CONNECTION-STRING>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | `<API-KEY>` | Voyage AI API key. To learn more, see [Voyage AI API Keys.](https://www.mongodb.com/docs/voyageai/management/api-keys.md#std-label-voyage-api-keys) |

   The script creates 1024-dimension embeddings using the `voyage-4-large` model for the `reviews.comments` field in the `reviews` array. It adds the embeddings to the `reviews` array as a new field named `comments_embedding`.

   ```python
   import os
   import pymongo
   import voyageai

   # Set your Voyage API key
   os.environ["VOYAGE_API_KEY"] = "<API-KEY>"
   vo = voyageai.Client()

   def get_embedding(text):
       """Retrieves the embedding for a given text using the voyage-4-large model."""
       try:
           return vo.embed([text], model="voyage-4-large").embeddings[0]
       except Exception as e:
           print("An error occurred while retrieving embeddings:", e)
           return None

   # Connect to your MongoDB cluster
   mongo_client = pymongo.MongoClient("<CONNECTION-STRING>")
   db = mongo_client["sample_airbnb"]
   collection = db["listingsAndReviews"]

   # Filter to exclude null or empty fields and check for missing embedding
   filter = {
       "reviews": {
           "$elemMatch": {
               "comments": {"$nin": [None, ""]},
               "comments_embedding": {"$exists": False}
           }
       }
   }

   # Count documents matching the filter
   doc_count_before_update = collection.count_documents(filter)
   print(f"Number of documents matching the filter: {doc_count_before_update}")

   # Get all matching documents into a list 
   documents_to_process = list(collection.find(filter, no_cursor_timeout=True))

   # Add comments_embedding to each review that is missing it
   updated_review_count = 0
   for doc in documents_to_process:
       if 'reviews' in doc and isinstance(doc['reviews'], list):
           for review in doc['reviews']:
               if isinstance(review, dict) and 'comments' in review and review['comments']:
                   if 'comments_embedding' not in review:
                       embedding = get_embedding(review['comments'])
                       if embedding is not None:
                           collection.update_one(
                               {"_id": doc["_id"]},
                               {"$set": {"reviews.$[elem].comments_embedding": embedding}},
                               array_filters=[{"elem._id": review["_id"]}]
                           )
                           updated_review_count += 1

   print(f"Updated {updated_review_count} reviews.")
   mongo_client.close()
   ```

   The following index definition on the `sample_airbnb.listingsAndReviews` collection indexes the following fields:

   - The string field (`address.country` and `property_type`), a numeric field (`bedrooms`), and a date field (`reviews.date`) for pre-filtering the data.

   - The vector embeddings field (`reviews.comments_embedding`) for performing vector search against pre-filtered data.

   - The `reviews` array field as the `nestedRoot` field for indexing nested vector fields.

   ```js
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
      try {
        const database = client.db("sample_airbnb");
        const collection = database.collection("listingsAndReviews");
       
        // define your MongoDB Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
              "fields": [
                {
                  "type": "vector",
                  "path": "reviews.comments_embedding",
                  "numDimensions": 1024,
                  "similarity": "cosine"
                },
                {
                  "type": "filter",
                  "path": "address.country"
                },
                {
                  "type": "filter",
                  "path": "bedrooms"
                },
                {
                  "type": "filter",
                  "path": "property_type"
                },
                {
                  "type": "filter",
                  "path": "reviews.date"
                }
              ],
              "nestedRoot": "reviews"
            }
        }

        // run the helper method
        const result = await collection.createSearchIndex(index);
        console.log(`New search index named ${result} is building.`);

        // wait for the index to be ready to query
        console.log("Polling to check if the index is ready. This may take up to a minute.")
        let isQueryable = false;
        while (!isQueryable) {
          const cursor = collection.listSearchIndexes();
          for await (const index of cursor) {
            if (index.name === result) {
              if (index.queryable) {
                console.log(`${result} is ready for querying.`);
                isQueryable = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        }
      } finally {
        await client.close();
      }
   }
   run().catch(console.dir);

   ```

3. Run the following command to create the index.

   ```shell
   node <file-name>.js
   ```

   **Example:**

   ```shell
   node vector_index.js
   ```

To create a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver, perform the following steps:

1. Create a `.py` file and define the index in the file.

   ### Tab

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "<fieldToIndex>",
           "model": "<embeddingModel>",
           "similarity": "<similarity>",
           "indexingMethod": "<indexingMethod>",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           },
           "quantization": "<quantization>",
           "numDimensions": <number-of-dimensions>
         },
         {
           "type": "filter",
           "path": "<fieldToIndex>"
         },
         ...
       ]
     },
     name="<indexName>",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

   To learn more, see the [create\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.create_search_index) method.

   **Example:**

   Create a file named `vector-index.py`.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name for your index. |
   | `<embeddingModel>` | Voyage AI embedding model you want MongoDB Vector Search to use for automatically generating embeddings. |
   | `<fieldToIndex>` | Name of field to index. |

   **Example:**

   Copy and paste the following into the `vector-index.py` and replace the `<connectionString>` placeholder value.

   ### Basic Example

   The following index definition indexes the `fullplot` field as the `autoEmbed` type to enable Automated Embedding for that field. It specifies the `voyage-4` embedding model as the embedding model to use for generating embeddings for the `fullplot` field.

   ```python
   from pymongo.mongo_client import MongoClient
   from pymongo.operations import SearchIndexModel
   import time

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["sample_mflix"]
   collection = database["embedded_movies"]

   # Create your index model, then create the search index
   search_index_model = SearchIndexModel(
     definition={
       "fields": [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "fullplot",
           "model": "voyage-4"
         }
       ]
     },
     name="autoembed_index",
     type="vectorSearch"
   )

   result = collection.create_search_index(model=search_index_model)
   print("New search index named " + result + " is building.")

   # Wait for initial sync to complete
   print("Polling to check if the index is ready. This may take up to a minute.")
   predicate=None
   if predicate is None:
     predicate = lambda index: index.get("queryable") is True

   while True:
     indices = list(collection.list_search_indexes(result))
     if len(indices) and predicate(indices[0]):
       break
     time.sleep(5)
   print(result + " is ready for querying.")

   client.close()

   ```

3. Run the following command to create the index.

   ```shell
   python <file-name>.py
   ```

   **Example:**

   ```shell
   python vector-index.py
   ```

To create a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-create-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index.

   In the `/src` directory of your project, create a file named `create_index.rs`. Copy and paste the following code into the file.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<database-name>")
           .collection("<collection-name>");

       let index_name = "<index-name>";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "<field-to-index>",
                   "model": "<embedding-model>"
               },
               {
                   "type": "filter",
                   "path": "<field-to-index>"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

3. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

   For example, copy and paste one of the following index definitions into the `create_index.rs` file and replace the `<connection-string>` placeholder value.

   ###### Basic Example

   The following index definition enables automated embedding vector search for the `fullplot` text field.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("movies");

       let index_name = "vector_index";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "fullplot",
                   "model": "voyage-4"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

   ###### Filter Example

   The following index definition indexes these fields:

   - String field (`genres`) and numeric field (`year`) for pre-filtering the data

   - Text field (`fullplot`) for automated embedding vector search

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection, SearchIndexModel, SearchIndexType};
   use futures::TryStreamExt;
   use std::time::Duration;
   use tokio::time::sleep;

   pub(crate) async fn create_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("sample_mflix")
           .collection("movies");

       let index_name = "vector_index";

       // Define the index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "fullplot",
                   "model": "voyage-4",
                   "quantization": "scalar"
               },
               {
                   "type": "filter",
                   "path": "genres"
               },
               {
                   "type": "filter",
                   "path": "year"
               }
           ]
       };

       // Set the index name and the "vectorSearch" index type.
       let index_model = SearchIndexModel::builder()
           .definition(definition)
           .name(index_name.to_string())
           .index_type(SearchIndexType::VectorSearch)
           .build();

       my_coll.create_search_index(index_model).await?;
       println!("New search index named {} is building.", index_name);

       // Wait until the index is queryable (initial sync complete).
       println!("Polling to check if the index is ready. This may take up to a minute.");
       while !is_queryable(&my_coll, index_name).await? {
           sleep(Duration::from_secs(5)).await;
       }
       println!("{} is ready for querying.", index_name);

       Ok(())
   }

   async fn is_queryable(
       coll: &Collection<Document>,
       name: &str,
   ) -> mongodb::error::Result<bool> {
       let mut cursor = coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           if index.get_str("name") == Ok(name) {
               return Ok(index.get_bool("queryable").unwrap_or(false));
           }
       }
       Ok(false)
   }

   ```

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod create_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       create_index::create_index().await
   }
   ```

5. Run the following command to create the index.

   ```shell
   cargo run
   ```

## View a MongoDB Vector Search Index

You can view MongoDB Vector Search indexes for all collections from the Atlas UI, Atlas Administration API, Atlas CLI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

You can view MongoDB Vector Search indexes for all collections using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

### Required Access

You need the [`Project Search Index Editor`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Search-Index-Editor) or higher role to view MongoDB Vector Search indexes.

**Note:**

You can use the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) command or driver helper methods to delete MongoDB Vector Search indexes on all Atlas cluster tiers. For a list of supported driver versions, see [Supported Clients](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-index-supported-drivers).

You need [`readWrite`](https://www.mongodb.com/docs/manual/reference/built-in-roles.md#mongodb-authrole-readWrite) or higher role to view MongoDB Vector Search indexes.

### Procedure

1. In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   If your project has multiple clusters, select the cluster you want to use from the Select cluster dropdown, then click Go to Atlas Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

The page displays the following details for the indexes on the page:

| Database | Database that contains the indexed collection. |
| --- | --- |
| Collection | Collection that contains the indexed documents. |
| Index Name | Label that identifies the index. |
| Status | Current state of the index on the primary node of the cluster. For valid values, see [Index Status.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-node-status-ref) |
| Queryable | Icon that indicates whether the index is ready to use in queries. Value can be one of the following icons: - for indexes that you can use to query the collection.; X - for indexes that you can't use to query the collection. |
| Type | Label that indicates a MongoDB Search or MongoDB Vector Search index. Values include: `search` for MongoDB Search indexes.; `vectorSearch` for MongoDB Vector Search indexes. |
| Index Fields | List that contains the fields that this index indexes. |
| Documents | Number of indexed documents out of the total number of documents in the collection. |
| Size | Size of the index on the primary node. |
| Required Memory | Approximate amount of memory required to run vector search queries. |
| Actions | Actions that you can take on the index. You can: [Edit a MongoDB Vector Search Index](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-edit-index); [Delete a MongoDB Vector Search Index](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-delete-index) You can't run queries in the Search Tester UI against indexes of the `vectorSearch` type. If you click the Query button, MongoDB Vector Search displays a sample [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) that you can copy, modify, and run in Atlas UI and using other [supported clients.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-vectorSearch-agg-pipeline-clients) |

To retrieve all the MongoDB Vector Search indexes for a collection using the Atlas Administration API, send a `GET` request to the MongoDB Search `indexes` endpoint with the name of the database and collection.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
     --header "Accept: application/json" \
     --include \
     --request GET "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{databaseName}/{collectionName}"
```

To learn more about the syntax and parameters for the endpoint, see [Return All MongoDB Search Indexes for One Collection.](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-listgroupclustersearchindexes)

To retrieve one MongoDB Vector Search index for a collection using the Atlas Administration API, send a `GET` request to the MongoDB Search `indexes` endpoint with either the unique ID or name of the index (line 4) to retrieve.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
     --header "Accept: application/json" \
     --include \
     --request GET "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{indexId} | https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{databaseName}/{collectionName}/{indexName|indexId}"
```

To learn more about the syntax and parameters for the endpoint, [Get One By Name](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-getgroupclustersearchindexbyname) and [Get One By ID.](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-getgroupclustersearchindex)

To return MongoDB Vector Search indexes for a collection using Atlas CLI, perform the following steps:

1. Gather the following information.

   | `clusterName` | The name of the cluster. |
   | --- | --- |
   | `db` | The name of the database on the cluster that contains your indexed collection. |
   | `collection` | The name of the indexed collection in the database. |
   | `projectId` | The unique identifier of the project. |

2. Run the following command to retrieve the indexes for the collection.

   ```shell
   atlas clusters search indexes list --clusterName [cluster_name] --db <db-name> --collection <collection-name>
   ```

   In the command, replace the following placeholder values:

   - `cluster-name` - the name of the cluster that contains the indexed collection.

   - `db-name` - the name of the database that contains the collection for which you want to retrieve the indexes.

   - `collection-name` - the name of the collection for which you want to retrieve the indexes.

   To learn more about the command syntax and parameters, see the Atlas CLI documentation for the [atlas clusters search indexes list](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-list/) command.

To view a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.getSearchIndexes()` method.

   The [`db.collection.getSearchIndexes()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.getSearchIndexes.md#mongodb-method-db.collection.getSearchIndexes) method has the following syntax:

   ```shell
   db.<collectionName>.getSearchIndexes( "<index-name>" );
   ```

To view MongoDB Vector Search indexes for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(get_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(get_index
     get-index.cpp
   )

   target_link_libraries(get_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `get-index.cpp` file and use the `list()` method to retrieve the indexes for the collection.

   ```cpp
   #include <bsoncxx/json.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Replace the placeholder with your connection string
     const auto uri = mongocxx::uri{"<connectionString>"};

     // Connect to your cluster
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     // Get a list of the collection's search indexes and print them
     auto siv = collection.search_indexes();
     auto indexes = siv.list();
     for (const auto& index : indexes) {
       std::cout << bsoncxx::to_json(index) << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Name of the database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to retrieve the indexes. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to retrieve the index.

   ```shell
   ./build/get_index
   ```

To view MongoDB Vector Search indexes for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#list-search-indexes) driver 3.1.0 or later, perform the following steps:

1. Create a `.cs` file and use the `.List()` method to retrieve the indexes for the collection.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void ViewSearchIndexes()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Get a list of the collection's search indexes and print them
               var searchIndexView = collection.SearchIndexes;
               var indexes = searchIndexView.List("<indexName>");
               
               foreach (var index in indexes.ToEnumerable())
               {
                   Console.WriteLine(index);
               }
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to retrieve. To return all indexes on the collection, omit this value. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.ViewSearchIndexes();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To view a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file named `get-index.go` and use the `SearchIndexes().List()` method to retrieve the index.

   ```go
   package main

   import (
   	"context"
   	"encoding/json"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Specify the options for the index to retrieve
   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName)

   	// Get the index
   	cursor, err := coll.SearchIndexes().List(ctx, opts)
   	if err != nil {
   		log.Fatalf("failed to get the index: %v", err)
   	}

   	// Print the index details to the console as JSON
   	var results []bson.M
   	if err := cursor.All(ctx, &results); err != nil {
   		log.Fatalf("failed to unmarshal results to bson: %v", err)
   	}
   	res, err := json.Marshal(results)
   	if err != nil {
   		log.Fatalf("failed to marshal results to json: %v", err)
   	}
   	fmt.Println(string(res))
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value and remove the call to the `SetName()` method when creating the Search index options. |

3. Run the following command to retrieve the index.

   ```shell
   go run get-index.go
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and use the `listSearchIndexes()` method to retrieve the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class ViewVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the options for the index to retrieve
               String indexName = "<indexName>";

               // Get the index and print details to the console as JSON
               try {
                   Document listSearchIndex = collection.listSearchIndexes().name(indexName).first();
                   if (listSearchIndex != null) {
                       System.out.println("Index found: " + listSearchIndex.toJson());
                   } else {
                       System.out.println("Index not found.");
                   }
               } catch (Exception e) {
                   throw new RuntimeException("Error finding index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Execute the code to retrieve the index.

   From your IDE, run the file to retrieve the specified index.

To view a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and use the `listSearchIndexes()` method to retrieve the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       const result = await collection.listSearchIndexes("<indexName>").toArray();
       console.log(result);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Run the following command to retrieve the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/view-indexes.ipynb)

To view MongoDB Vector Search indexes for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create a `.py` file and use the `list_search_indexes()` method to retrieve the indexes for the collection.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Get a list of the collection's search indexes and print them
   cursor = collection.list_search_indexes()
   for index in cursor:
       print(index)
   ```

   To learn more, see the [list\_search\_indexes()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.list_search_indexes) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |

3. Run the following command to retrieve the indexes.

   ```shell
   python <file-name>.py
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, and the `sync` feature only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Retrieve the indexes.

   In the `/src` directory of your project, create a file named `get_index.rs`. Copy and paste the following code into the file to retrieve the indexes for the collection by using the `list_search_indexes()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};
   use futures::TryStreamExt;

   pub(crate) async fn get_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       // Retrieve the indexes on the collection.
       let mut cursor = my_coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           println!("{}", index);
       }

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Collection for which you want to retrieve the indexes. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod get_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       get_index::get_index().await
   }
   ```

5. Run the following command to retrieve the indexes.

   ```shell
   cargo run
   ```

1) In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   If your project has multiple clusters, select the cluster you want to use from the Select cluster dropdown, then click Go to Atlas Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

The page displays the following details for each index:

| Database | Database that contains the indexed collection. |
| --- | --- |
| Collection | Collection that contains the indexed documents. |
| Index Name | Label that identifies the index. |
| Status | Current state of the index on the primary node of the cluster. For valid values, see [Index Status.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-node-status-ref) |
| Queryable | Icon that indicates whether the index is ready to use in queries. Value can be one of the following icons: - for indexes that you can use to query the collection.; X - for indexes that you can't use to query the collection. |
| Type | Label that indicates a MongoDB Search or MongoDB Vector Search index. Values include: `search` for MongoDB Search indexes.; `vectorSearch` for MongoDB Vector Search indexes. |
| Index Fields | List that contains the fields that this index indexes. |
| Documents | Number of indexed documents out of the total number of documents in the collection. |
| Size | Size of the index on the primary node. |
| Required Memory | Approximate amount of memory required to run vector search queries. |
| Actions | Actions that you can take on the index. You can: [Edit a MongoDB Vector Search Index](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-edit-index); [Delete a MongoDB Vector Search Index](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-delete-index) You can't run queries in the Search Tester UI against indexes of the `vectorSearch` type. If you click the Query button, MongoDB Vector Search displays a sample [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) that you can copy, modify, and run in Atlas UI and using other [supported clients.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-vectorSearch-agg-pipeline-clients) |

To view a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.getSearchIndexes()` method.

   The [`db.collection.getSearchIndexes()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.getSearchIndexes.md#mongodb-method-db.collection.getSearchIndexes) method has the following syntax:

   ```shell
   db.<collectionName>.getSearchIndexes( "<index-name>" );
   ```

To view MongoDB Vector Search indexes for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(get_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(get_index
     get-index.cpp
   )

   target_link_libraries(get_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `get-index.cpp` file and use the `list()` method to retrieve the indexes for the collection.

   ```cpp
   #include <bsoncxx/json.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Replace the placeholder with your connection string
     const auto uri = mongocxx::uri{"<connectionString>"};

     // Connect to your cluster
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     // Get a list of the collection's search indexes and print them
     auto siv = collection.search_indexes();
     auto indexes = siv.list();
     for (const auto& index : indexes) {
       std::cout << bsoncxx::to_json(index) << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Name of the database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to retrieve the indexes. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to retrieve the index.

   ```shell
   ./build/get_index
   ```

To view MongoDB Vector Search indexes for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#list-search-indexes) driver 3.1 or later, perform the following steps:

1. Create a `.cs` file and use the `.List()` method to retrieve the indexes for the collection.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void ViewSearchIndexes()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Get a list of the collection's search indexes and print them
               var searchIndexView = collection.SearchIndexes;
               var indexes = searchIndexView.List("<indexName>");
               
               foreach (var index in indexes.ToEnumerable())
               {
                   Console.WriteLine(index);
               }
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to retrieve. To return all indexes on the collection, omit this value. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.ViewSearchIndexes();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To view a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.1 or later, perform the following steps:

1. Create a file named `get-index.go` and use the `SearchIndexes().List()` method to retrieve the index.

   ```go
   package main

   import (
   	"context"
   	"encoding/json"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Specify the options for the index to retrieve
   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName)

   	// Get the index
   	cursor, err := coll.SearchIndexes().List(ctx, opts)
   	if err != nil {
   		log.Fatalf("failed to get the index: %v", err)
   	}

   	// Print the index details to the console as JSON
   	var results []bson.M
   	if err := cursor.All(ctx, &results); err != nil {
   		log.Fatalf("failed to unmarshal results to bson: %v", err)
   	}
   	res, err := json.Marshal(results)
   	if err != nil {
   		log.Fatalf("failed to marshal results to json: %v", err)
   	}
   	fmt.Println(string(res))
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value and remove the call to the `SetName()` method when creating the Search index options. |

3. Run the following command to retrieve the index.

   ```shell
   go run get-index.go
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create a `.java` file and use the `listSearchIndexes()` method to retrieve the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class ViewVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the options for the index to retrieve
               String indexName = "<indexName>";

               // Get the index and print details to the console as JSON
               try {
                   Document listSearchIndex = collection.listSearchIndexes().name(indexName).first();
                   if (listSearchIndex != null) {
                       System.out.println("Index found: " + listSearchIndex.toJson());
                   } else {
                       System.out.println("Index not found.");
                   }
               } catch (Exception e) {
                   throw new RuntimeException("Error finding index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Execute the code to retrieve the index.

   From your IDE, run the file to retrieve the specified index.

1) Create the `.js` file and use the `listSearchIndexes()` method to retrieve the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       const result = await collection.listSearchIndexes("<indexName>").toArray();
       console.log(result);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2) Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3) Run the following command to retrieve the index.

   ```shell
   node <file-name>.js
   ```

1. Create a `.py` file and use the `list_search_indexes()` method to retrieve the indexes for the collection.

2. Replace the following values and save the file.

   | `<connectionString>` | Your cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |

3. Run the following command to retrieve the indexes.

   ```shell
   python <file-name>.py
   ```

To view a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-list-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Retrieve the indexes.

   In the `/src` directory of your project, create a file named `get_index.rs`. Copy and paste the following code into the file to retrieve the indexes for the collection by using the `list_search_indexes()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};
   use futures::TryStreamExt;

   pub(crate) async fn get_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       // Retrieve the indexes on the collection.
       let mut cursor = my_coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           println!("{}", index);
       }

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Collection for which you want to retrieve the indexes. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod get_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       get_index::get_index().await
   }
   ```

5. Run the following command to retrieve the indexes.

   ```shell
   cargo run
   ```

To view a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.getSearchIndexes()` method.

   The [`db.collection.getSearchIndexes()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.getSearchIndexes.md#mongodb-method-db.collection.getSearchIndexes) method has the following syntax:

   ```shell
   db.<collectionName>.getSearchIndexes( "<index-name>" );
   ```

To view MongoDB Vector Search indexes for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(get_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(get_index
     get-index.cpp
   )

   target_link_libraries(get_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `get-index.cpp` file and use the `list()` method to retrieve the indexes for the collection.

   ```cpp
   #include <bsoncxx/json.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Replace the placeholder with your connection string
     const auto uri = mongocxx::uri{"<connectionString>"};

     // Connect to your cluster
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     // Get a list of the collection's search indexes and print them
     auto siv = collection.search_indexes();
     auto indexes = siv.list();
     for (const auto& index : indexes) {
       std::cout << bsoncxx::to_json(index) << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Name of the database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to retrieve the indexes. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to retrieve the index.

   ```shell
   ./build/get_index
   ```

To view MongoDB Vector Search indexes for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#list-search-indexes) driver 3.1.0 or later, perform the following steps:

1. Create a `.cs` file and use the `.List()` method to retrieve the indexes for the collection.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void ViewSearchIndexes()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Get a list of the collection's search indexes and print them
               var searchIndexView = collection.SearchIndexes;
               var indexes = searchIndexView.List("<indexName>");
               
               foreach (var index in indexes.ToEnumerable())
               {
                   Console.WriteLine(index);
               }
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to retrieve. To return all indexes on the collection, omit this value. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.ViewSearchIndexes();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To view a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file named `get-index.go` and use the `SearchIndexes().List()` method to retrieve the index.

   ```go
   package main

   import (
   	"context"
   	"encoding/json"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Specify the options for the index to retrieve
   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName)

   	// Get the index
   	cursor, err := coll.SearchIndexes().List(ctx, opts)
   	if err != nil {
   		log.Fatalf("failed to get the index: %v", err)
   	}

   	// Print the index details to the console as JSON
   	var results []bson.M
   	if err := cursor.All(ctx, &results); err != nil {
   		log.Fatalf("failed to unmarshal results to bson: %v", err)
   	}
   	res, err := json.Marshal(results)
   	if err != nil {
   		log.Fatalf("failed to marshal results to json: %v", err)
   	}
   	fmt.Println(string(res))
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value and remove the call to the `SetName()` method when creating the Search index options. |

3. Run the following command to retrieve the index.

   ```shell
   go run get-index.go
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and use the `listSearchIndexes()` method to retrieve the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class ViewVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the options for the index to retrieve
               String indexName = "<indexName>";

               // Get the index and print details to the console as JSON
               try {
                   Document listSearchIndex = collection.listSearchIndexes().name(indexName).first();
                   if (listSearchIndex != null) {
                       System.out.println("Index found: " + listSearchIndex.toJson());
                   } else {
                       System.out.println("Index not found.");
                   }
               } catch (Exception e) {
                   throw new RuntimeException("Error finding index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Execute the code to retrieve the index.

   From your IDE, run the file to retrieve the specified index.

To view a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and use the `listSearchIndexes()` method to retrieve the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       const result = await collection.listSearchIndexes("<indexName>").toArray();
       console.log(result);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Run the following command to retrieve the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/view-indexes.ipynb)

To view MongoDB Vector Search indexes for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create a `.py` file and use the `list_search_indexes()` method to retrieve the indexes for the collection.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Get a list of the collection's search indexes and print them
   cursor = collection.list_search_indexes()
   for index in cursor:
       print(index)
   ```

   To learn more, see the [list\_search\_indexes()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.list_search_indexes) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |

3. Run the following command to retrieve the indexes.

   ```shell
   python <file-name>.py
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, and the `sync` feature only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Retrieve the indexes.

   In the `/src` directory of your project, create a file named `get_index.rs`. Copy and paste the following code into the file to retrieve the indexes for the collection by using the `list_search_indexes()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};
   use futures::TryStreamExt;

   pub(crate) async fn get_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       // Retrieve the indexes on the collection.
       let mut cursor = my_coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           println!("{}", index);
       }

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Collection for which you want to retrieve the indexes. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod get_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       get_index::get_index().await
   }
   ```

5. Run the following command to retrieve the indexes.

   ```shell
   cargo run
   ```

To view a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.getSearchIndexes()` method.

   The [`db.collection.getSearchIndexes()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.getSearchIndexes.md#mongodb-method-db.collection.getSearchIndexes) method has the following syntax:

   ```shell
   db.<collectionName>.getSearchIndexes( "<index-name>" );
   ```

To view MongoDB Vector Search indexes for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(get_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(get_index
     get-index.cpp
   )

   target_link_libraries(get_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `get-index.cpp` file and use the `list()` method to retrieve the indexes for the collection.

   ```cpp
   #include <bsoncxx/json.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Replace the placeholder with your connection string
     const auto uri = mongocxx::uri{"<connectionString>"};

     // Connect to your cluster
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     // Get a list of the collection's search indexes and print them
     auto siv = collection.search_indexes();
     auto indexes = siv.list();
     for (const auto& index : indexes) {
       std::cout << bsoncxx::to_json(index) << std::endl;
     }
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Name of the database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to retrieve the indexes. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to retrieve the index.

   ```shell
   ./build/get_index
   ```

To view MongoDB Vector Search indexes for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#list-search-indexes) driver 3.1 or later, perform the following steps:

1. Create a `.cs` file and use the `.List()` method to retrieve the indexes for the collection.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void ViewSearchIndexes()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Get a list of the collection's search indexes and print them
               var searchIndexView = collection.SearchIndexes;
               var indexes = searchIndexView.List("<indexName>");
               
               foreach (var index in indexes.ToEnumerable())
               {
                   Console.WriteLine(index);
               }
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to retrieve. To return all indexes on the collection, omit this value. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.ViewSearchIndexes();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To view a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.1 or later, perform the following steps:

1. Create a file named `get-index.go` and use the `SearchIndexes().List()` method to retrieve the index.

   ```go
   package main

   import (
   	"context"
   	"encoding/json"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/bson"
   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")

   	// Specify the options for the index to retrieve
   	indexName := "<indexName>"
   	opts := options.SearchIndexes().SetName(indexName)

   	// Get the index
   	cursor, err := coll.SearchIndexes().List(ctx, opts)
   	if err != nil {
   		log.Fatalf("failed to get the index: %v", err)
   	}

   	// Print the index details to the console as JSON
   	var results []bson.M
   	if err := cursor.All(ctx, &results); err != nil {
   		log.Fatalf("failed to unmarshal results to bson: %v", err)
   	}
   	res, err := json.Marshal(results)
   	if err != nil {
   		log.Fatalf("failed to marshal results to json: %v", err)
   	}
   	fmt.Println(string(res))
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value and remove the call to the `SetName()` method when creating the Search index options. |

3. Run the following command to retrieve the index.

   ```shell
   go run get-index.go
   ```

To view a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create a `.java` file and use the `listSearchIndexes()` method to retrieve the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class ViewVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the options for the index to retrieve
               String indexName = "<indexName>";

               // Get the index and print details to the console as JSON
               try {
                   Document listSearchIndex = collection.listSearchIndexes().name(indexName).first();
                   if (listSearchIndex != null) {
                       System.out.println("Index found: " + listSearchIndex.toJson());
                   } else {
                       System.out.println("Index not found.");
                   }
               } catch (Exception e) {
                   throw new RuntimeException("Error finding index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3. Execute the code to retrieve the index.

   From your IDE, run the file to retrieve the specified index.

1) Create the `.js` file and use the `listSearchIndexes()` method to retrieve the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       const result = await collection.listSearchIndexes("<indexName>").toArray();
       console.log(result);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2) Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection. |
   | `<collectionName>` | The collection for which you want to retrieve the indexes. |
   | `<indexName>` | The name of your index if you want to retrieve a specific index. To return all indexes on the collection, omit this value. |

3) Run the following command to retrieve the index.

   ```shell
   node <file-name>.js
   ```

1. Create a `.py` file and use the `list_search_indexes()` method to retrieve the indexes for the collection.

2. Replace the following values and save the file.

   | `<connectionString>` | Your cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |

3. Run the following command to retrieve the indexes.

   ```shell
   python <file-name>.py
   ```

To view a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-list-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Retrieve the indexes.

   In the `/src` directory of your project, create a file named `get_index.rs`. Copy and paste the following code into the file to retrieve the indexes for the collection by using the `list_search_indexes()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};
   use futures::TryStreamExt;

   pub(crate) async fn get_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       // Retrieve the indexes on the collection.
       let mut cursor = my_coll.list_search_indexes().await?;
       while let Some(index) = cursor.try_next().await? {
           println!("{}", index);
       }

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Collection for which you want to retrieve the indexes. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod get_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       get_index::get_index().await
   }
   ```

5. Run the following command to retrieve the indexes.

   ```shell
   cargo run
   ```

## Edit a MongoDB Vector Search Index

You can change the [index definition](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search) of an existing MongoDB Vector Search index from the Atlas UI, Atlas Administration API, Atlas CLI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), or a supported [MongoDB Driver](https://www.mongodb.com/docs/drivers/). You can't rename an index or change the index type. If you need to change an index name or type, you must create a new index and delete the old one.

You can change the [index definition](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search) of an existing MongoDB Vector Search index using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), MongoDB Compass, or a supported [MongoDB Driver](https://www.mongodb.com/docs/drivers/). You can't rename an index or change the index type. If you need to change an index name or type, you must create a new index and delete the old one.

You can:

- Replace or delete existing `autoEmbed` type fields

- Add additional text fields to index as the `autoEmbed` type

- Add or remove `filter` type fields

You can't:

- Add a field of type `vector` and `autoEmbed` in the same index

- Modify the field `type` or `modality` after you create the index

If you change the `model`, `quantization`, or `numDimensions` settings, MongoDB Vector Search regenerates the index and embeddings, for which you incur additional cost.

You can't modify an `autoEmbed` type field after you create the index. You can modify the index to add additional `autoEmbed` type fields or to add or remove `filter` type fields.

After you edit an index, MongoDB Vector Search rebuilds it. While the index rebuilds, you can continue to run MongoDB Vector Search queries by using the old index definition. When the index finishes rebuilding, MongoDB Vector Search automatically replaces the old index. This process is similar to MongoDB Search indexes. To learn more, see [Creating and Updating a MongoDB Search Index.](https://www.mongodb.com/docs/search/performance/index-performance.md#std-label-index-create-and-update)

### Required Access

You need the [`Project Data Access Admin`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Data-Access-Admin) or higher role to edit MongoDB Vector Search indexes.

You need [`readWrite`](https://www.mongodb.com/docs/manual/reference/built-in-roles.md#mongodb-authrole-readWrite) or higher role to edit MongoDB Vector Search indexes.

### Procedure

1. In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   If your project has multiple clusters, select the cluster you want to use from the Select cluster dropdown, then click Go to Atlas Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2. Edit the index.

   Locate the `vectorSearch` type index to edit.

   Click  from the Actions column for that index.

   Select either Edit With Visual Editor for a guided experience or Edit With JSON Editor to edit the raw index definition.

   Review the current configuration settings and edit them as needed.

   To learn more about the fields in a MongoDB Vector Search index, see [How to Index Fields for Vector Search.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search)

   Click Save to apply the changes.

   The index's status changes from Active to Building. In this state, you can continue to use the old index because MongoDB Vector Search does not delete the old index until the updated index is ready for use. Once the status returns to Active, the modified index is ready to use.

To edit a MongoDB Vector Search index for a collection using the Atlas Administration API, send a `PATCH` request to the MongoDB Search `indexes` endpoint with either the unique ID or name of the index (line 4) to edit.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" --include \
     --header "Accept: application/json" \
     --header "Content-Type: application/json" \
     --request PATCH "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{indexId} | https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{databaseName}/{collectionName}/{indexName|indexId}" \
     --data'
       {
         "database": "<name-of-database>",
         "collectionName": "<name-of-collection>",
         "type": "vectorSearch",
         "name": "<index-name>",
           "definition": {
             "fields":[ 
               {
                 "type": "vector",
                 "path": <field-to-index>,
                 "numDimensions": <number-of-dimensions>,
                 "similarity": "euclidean | cosine | dotProduct"
               },
               {
                 "type": "filter",
                 "path": "<field-to-index>"
               },
               ...
             }
           ]
         }'
```

To learn more about the syntax and parameters for the endpoints, see [Update One By Name](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-updategroupclustersearchindexbyname) and [Update One By ID.](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-updategroupclustersearchindex)

To edit a MongoDB Vector Search index for a collection using Atlas CLI, perform the following steps:

1. Create a `.json` file and define the changes to the index in the file.

   Your index definition should resemble the following format:

   ```json
   {
       "database": "<name-of-database>",
       "collectionName": "<name-of-collection>",
       "type": "vectorSearch",
       "name": "<index-name>",
       "fields":[ 
         {
           "type": "vector",
           "path": "<field-to-index>",
           "numDimensions": <number-of-dimensions>,
           "similarity": "euclidean | cosine | dotProduct"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
   }
   ```

2. Replace the following placeholder values and save the file.

   | `<name-of-database>` | Database that contains the collection for which you want to create the index. |
   | --- | --- |
   | `<name-of-collection>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, MongoDB Vector Search names the index `vector_index`. |
   | `<number-of-dimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<field-to-index>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   atlas clusters search indexes update <indexId> --clusterName [cluster_name] --file [vector-_index].json
   ```

   In the command, replace the following placeholder values:

   - `cluster_name` - the name of the cluster that contains the collection for which you want to update the index.

   - `vector_index` - the name of the JSON (Javascript Object Notation) file that contains the modified index definition for the MongoDB Vector Search index.

   To learn more about the command syntax and parameters, see the Atlas CLI documentation for the [atlas clusters search indexes update](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-update/) command.

To edit a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to update the index.

3. Run the `db.collection.updateSearchIndex()` method.

   The [`db.collection.updateSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateSearchIndex.md#mongodb-method-db.collection.updateSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.updateSearchIndex(
     "<index-name>",
     {
       fields: [
         {
           "type": "vector",
           "numDimensions": <number-of-dimensions>,
           "path": "<field-to-index>",
           "similarity": "euclidean | cosine | dotProduct"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

To update a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(edit_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(edit_index
     edit-index.cpp
   )

   target_link_libraries(edit_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create an `edit-index.cpp` file and define the index changes in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Specify the new index definition with a vector field
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "<fieldToIndex>"),
                 kvp("numDimensions", <numberOfDimensions>),
                 kvp("similarity", "<similarity>"),
                 kvp("quantization", "<quantization>")))));

     // Update the search index
     siv.update_one(name, definition.view());
     std::cout << "Search index named " << name << " is updating."
               << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to edit the index. |
   | `<collectionName>` | Collection for which you want to edit the index. |
   | `<indexName>` | Name of the index you want to edit. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field that contains your vector embeddings. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. This value must match the number of dimensions in your embeddings. |
   | `<similarity>` | Vector similarity function to use when searching. You can specify `euclidean`, `cosine`, or `dotProduct`. |
   | `<quantization>` | Automatic quantization to use for vectors before indexing, which reduces resource consumption. You can specify `none`, `scalar`, or `binary`. Use `scalar` to reduce memory while retaining accuracy, `binary` for the largest memory savings with the highest impact on accuracy, or `none` to disable quantization. To learn how to choose a quantization method, see [Vector Quantization.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-mdb_vs-quantization) |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to update the index.

   ```shell
   ./build/edit_index
   ```

To update a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#update-a-search-index) driver 3.1.0 or later, perform the following steps:

1. Create the `.cs` file and define the index changes in the file.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void EditVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");
               
               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "<fieldToIndex>" },
                               { "numDimensions", <numberOfDimensions> },
                               { "similarity", "euclidean | cosine | dotProduct" }
                           }
                       }
                   }
               };
               
               // Update your search index
               var searchIndexView = collection.SearchIndexes;
               searchIndexView.Update(name, definition);
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.EditVectorIndex();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To update a MongoDB Vector Search index for a collection using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `edit-index.go` and define the index changes in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connection-string>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	definition := vectorDefinition{
   		Fields: []vectorDefinitionField{{
   			Type:          "vector",
   			Path:          "<fieldToIndex>",
   			NumDimensions: <numberOfDimensions>,
   			Similarity:    "euclidean | cosine | dotProduct"}},
   	}
   	err = coll.SearchIndexes().UpdateOne(ctx, indexName, definition)

   	if err != nil {
   		log.Fatalf("failed to update the index: %v", err)
   	}

   	fmt.Println("Successfully updated the search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   go run edit-index.go
   ```

To edit a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create the `.java` file and  use the `updateSearchIndex()` method to define the index changes in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;

   public class EditVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index changes
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                       new Document("type", "vector")
                           .append("path", "<fieldToIndex>")
                           .append("numDimensions", "<numberOfDimensions>")
                           .append("similarity", "euclidean | cosine | dotProduct")
                           .append("quantization", "none | scalar | binary")));

               // Update the index
               collection.updateSearchIndex(indexName, definition);
               System.out.println("Successfully updated the index");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Execute the code to update the index.

   From your IDE, run the file to update the index with your changes.

To update a MongoDB Vector Search index for a collection using the [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and define the index changes in the file.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connection-string>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // define your MongoDB Search index
       const index = {
           name: "<indexName>",
           type: "vectorSearch",
           //updated search index definition
           definition: {
             "fields": [
               {
                 "type": "vector",
                 "numDimensions": <numberOfDimensions>,
                 "path": "<field-to-index>",
                 "similarity": "euclidean | cosine | dotProduct"
               },
               {
                 "type": "filter",
                 "path": "<fieldToIndex>"
               },
               ...
             ]
           }
       }

       // run the helper method
       await collection.updateSearchIndex("<index-name>", index);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/edit-indexes.ipynb)

To update a MongoDB Vector Search index for a collection using the [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create the `.py` file and define the index changes in the file.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   definition = {
     "fields": [
       {
         "type": "vector",
         "numDimensions": <numberofDimensions>,
         "path": "<fieldToIndex>",
         "similarity": "euclidean | cosine | dotProduct",
         "quantization": " none | scalar | binary "
       },
       {
         "type": "filter",
         "path": "<fieldToIndex>"
       },
       ...
     ]
   }
       
   # Update your search index
   collection.update_search_index("<indexName>", definition)
   ```

   To learn more, see the [update\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.update_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   python <file-name>.py
   ```

To update a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `sync` feature is required only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index changes.

   In the `/src` directory of your project, create a file named `edit_index.rs`. Copy and paste the following code into the file to update the index by using the `update_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection};

   pub(crate) async fn edit_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Define the updated index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "<fieldToIndex>",
                   "numDimensions": <numberOfDimensions>,
                   "similarity": "<vectorSimilarity>"
               }
           ]
       };

       my_coll.update_search_index(index_name, definition).await?;
       println!("Successfully updated the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to update the index. |
   | `<collectionName>` | Collection for which you want to update the index. |
   | `<indexName>` | Name of the index that you want to update. |
   | `<fieldToIndex>` | Vector field to index. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<vectorSimilarity>` | Vector similarity function to use to search for the top K-nearest neighbors. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod edit_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       edit_index::edit_index().await
   }
   ```

5. Run the following command to update the index.

   ```shell
   cargo run
   ```

To edit a MongoDB Vector Search index for a collection using the Atlas UI, perform the following steps:

1. In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   - If you have no clusters, click

     Create cluster to create one. To learn more, see [Create a Cluster.](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster.md#std-label-create-new-cluster)

   - If your project has multiple clusters, select the cluster

     you want to use from the Select cluster dropdown, then click Go to Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2. Click Create Search Index.

3. Start your index configuration.

   Make the following selections on the page and then click Next.

   | Search Type | Select the Vector Search index type. |
   | --- | --- |
   | How do you want to set up your vector data? | Select one of the following: Automated Embedding if you want MongoDB to generate and manage vector embeddings for your text fields.; Bring your own embeddings if you have already generated vector embeddings for your data. Choose Bring your own embeddings. |
   | Index Name and Data Source | Specify the following information: Index Name: `autoembed_index` is the default index name. Index names must be unique within the namespace, regardless of the index type. If you already have an index named `autoembed_index` on this collection, enter a different name.; Database and Collection:`sample_mflix`; `movies` |
   | Configuration Method | For a guided experience, select Visual Editor.To edit the raw index definition, select JSON Editor. |

4. Modify the index definition.

   ###### Visual Editor

   ###### Use the Visual Editor for a guided experience.

   To modify the index, do the following:

   Modify the settings.

   | Setting | Necessity | Value |
   | --- | --- | --- |
   | Path | Required | Add the text field for which you want to enable Automated Embedding. |
   | Embedding Model | Required | Modify the Voyage AI embedding model to use for generating embeddings. You can specify one of the following models: `voyage-4` - (**Recommended**) Optimized for general-purpose and multilingual retrieval quality.; `voyage-4-large` - Maximum accuracy for complex semantic relationships.; `voyage-4-lite` - Optimized for high-volume, cost-sensitive applications.; `voyage-code-4` - (**Recommended for code**) Specialized for code search and technical documentation.; `voyage-code-3` - Legacy model specialized for code search and technical documentation. Use `voyage-code-4` instead. |
   | Advanced | Optional | Configure additional settings for your index. If omitted, MongoDB Vector Search uses the default values for these settings. Quantization - Select the quantization type for your embeddings. Value can be `scalar`, `float`, `binary`, or `binaryNoRescore`.  Defaults to `scalar`.; Number of Dimensions - Select the number of dimensions for your embeddings. Value can be `256`, `512`, `1024`, or `2048`. Defaults to `1024`.; Similarity Function - Select the similarity function to use for your embeddings. Value can be `euclidean`, `cosine`, or `dot product`. Defaults to `dot product`. |

   You can add multiple fields to your index. However:

   - You can't edit an existing `autoEmbed` type field.

   - You can't add a field of type `vector` and `autoEmbed` in the same index.

   Specify the fields to use to pre-filter your data.

   To add a field to pre-filter your data, select the field from the Path dropdown. You can add multiple fields to pre-filter your data.

   Click Next to review your index.

   To learn more about the MongoDB Vector Search index settings, see [How to Index Fields for Vector Search.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search)

   ###### JSON Editor

   ###### Use the JSON Editor to edit the raw JSON.

   Modify the settings in the index definition as needed. To learn more about the MongoDB Vector Search index settings, see [Syntax](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-index-definition) and [MongoDB Vector Search Index Fields.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search-options)

5. Click Create Vector Search Index.

   Atlas displays a modal window to let you know your index is building.

6. Close the You're All Set! Modal Window by clicking the Close button.

7. Check the status.

   The newly created index displays on the Search & Vector Search page. While the index is building, the Status field reads Pending. When the index is finished building, the Status field reads Ready.

   **Note:**

   Larger collections take longer to index. You will receive an email notification when your index is finished building.

To edit a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to update the index.

3. Run the `db.collection.updateSearchIndex()` method.

   The [`db.collection.updateSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateSearchIndex.md#mongodb-method-db.collection.updateSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.updateSearchIndex(
     "<index-name>",
     {
       fields: [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "<field-to-index>",
           "model": "<embedding-model>",
           "similarity": "<similarity-metric>",
           "numDimensions": <number-of-dimensions>,
           "indexingMethod": "<indexing-method>",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           },
           "quantization": "<quantization-type>"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

To update a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(edit_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(edit_index
     edit-auto-embed-index.cpp
   )

   target_link_libraries(edit_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create an `edit-auto-embed-index.cpp` file and define the index changes in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Specify the new index definition with automated embedding and
     // filter fields
     auto definition = make_document(
         kvp("fields",
             make_array(
                 make_document(kvp("type", "autoEmbed"),
                               kvp("modality", "text"),
                               kvp("path", "<indexedField>"),
                               kvp("model", "<embeddingModel>")),
                 make_document(kvp("type", "filter"),
                               kvp("path", "<fieldToIndex>")))));

     // Update the search index
     siv.update_one(name, definition.view());
     std::cout << "Search index named " << name << " is updating."
               << std::endl;

     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to edit the index. |
   | `<collectionName>` | Collection for which you want to edit the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<indexedField>` | Name of the text field to index as the `autoEmbed` type. MongoDB Vector Search automatically generates vector embeddings for this field by using the specified Voyage AI model. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. You can specify `voyage-4-lite`, `voyage-4`, `voyage-4-large`, `voyage-code-4`, or `voyage-code-3`. To learn more, see [Models for Automated Embedding.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-avs-auto-embeddings-model-ecosystem) |
   | `<fieldToIndex>` | Field to index as the `filter` type for pre-filtering your data. Filtering narrows the scope of your semantic search, such as in a multi-tenant environment. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to update the index.

   ```shell
   ./build/edit_index
   ```

1) Create the `.cs` file and define the index changes in the file.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void EditVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");
               
               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "autoEmbed" },
                               { "modality", "text" },
                               { "path", "<indexedField>" },
                               { "model", "<embeddingModel>" },
                               { "similarity", "<similarityMetric>" },
                               { "indexingMethod", "<indexingMethod>" },
                               { "hnswOptions", new BsonDocument
                                   {
                                       { "maxEdges", <maxEdges> },
                                       { "numEdgeCandidates", <numEdgeCandidates> }
                                   }
                               },
                               { "quantization", "<quantizationType>" },
                               { "numDimensions", <numDimensions> }
                           },
                           new BsonDocument
                           {
                               { "type", "filter" },
                               { "path", "<fieldToIndex>" }
                           },
                           new BsonDocument
                           {
                               { "type", "filter" },
                               { "path", "<fieldToIndex>" }
                           }
                       }
                   }
               };
               
               // Update your search index
               var searchIndexView = collection.SearchIndexes;
               searchIndexView.Update(<indexName>, definition);
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2) Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3) Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.EditVectorIndex();
   ```

4) Compile and run your project.

   ```shell
   dotnet run
   ```

1. Create a file called `edit-index.go` and define the index changes in the file.

   ```go
   package main  
     
   import (  
   	"context"  
   	"fmt"  
   	"log"  
     
   	"go.mongodb.org/mongo-driver/v2/mongo"  
   	"go.mongodb.org/mongo-driver/v2/mongo/options"  
   )  
     
   func main() {  
   	ctx := context.Background()  
     
   	// Replace the placeholder with your connection string  
   	const uri = "<connection-string>"  
     
   	// Connect to your cluster  
   	clientOptions := options.Client().ApplyURI(uri)  
   	client, err := mongo.Connect(ctx, clientOptions)
   	if err != nil {  
   		log.Fatalf("failed to connect to the server: %v", err)  
   	}  
   	defer func() { _ = client.Disconnect(ctx) }()  
     
   	// Set the namespace  
   	coll := client.Database("<database-name>").Collection("<collection-name>")  
   	indexName := "<index-name>"  
     
   	type autoEmbedField struct {  
   		Type             string `bson:"type"`  
   		Modality         string `bson:"modality"`  
   		Path             string `bson:"path"`  
   		Model            string `bson:"model"`
   		Similarity       string `bson:"similarity"`  
   		IndexingMethod   string `bson:"indexingMethod"`  
   		HnswOptions      struct {  
   			MaxEdges         int `bson:"maxEdges"`  
   			NumEdgeCandidates int `bson:"numEdgeCandidates"`  
   		} `bson:"hnswOptions"`  
   		Quantization string `bson:"quantization"`  
   		NumDimensions  int    `bson:"numDimensions"`  
   	}  
     
   	type filterField struct {  
   		Type string `bson:"type"`  
   		Path string `bson:"path"`  
   	}  
     
   	type indexDefinition struct {  
   		Fields []interface{} `bson:"fields"`  
   	}  
     
   	definition := indexDefinition{  
   		Fields: []interface{}{  
   			autoEmbedField{  
   				Type:     "autoEmbed",  
   				Modality: "text",  
   				Path:     "<indexed-field>",  
   				Model:    "<embedding-model>", 
   				Similarity:       "<similarity-metric>",  
   				IndexingMethod:   "<indexing-method>",  
   				HnswOptions:      struct {  
   					MaxEdges         int `bson:"maxEdges"`  
   					NumEdgeCandidates int `bson:"numEdgeCandidates"`  
   				} {  
   					MaxEdges:         <max-edges>,  
   					NumEdgeCandidates: <num-edge-candidates>,  
   				},  
   				Quantization: "<quantization-type>",  
   				NumDimensions:  <num-dimensions>,  
   			},  
   			filterField{  
   				Type: "filter",
   				Path: "<field-to-index>",  
   			},  
   		},  
   	}  
     
   	err = coll.SearchIndexes().UpdateOne(ctx, <index-name>, definition)  
     
   	if err != nil {  
   		log.Fatalf("failed to update the index: %v", err)  
   	}  
     
   	fmt.Println("Successfully updated the search index")  
   }  
   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Run the following command to update the index.

   ```shell
   go run edit-index.go
   ```

To edit a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and use the `updateSearchIndex()` method to add or remove `filter` type fields.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;

   public class EditVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index changes
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "autoEmbed")
                           .append("modality", "text")
                           .append("model", "<modelName>")
                           .append("path", "<indexedField>")
                           .append("similarity", "<similarityMetric>")
                           .append("indexingMethod", "<indexingMethod>")
                           .append("hnswOptions", new Document()
                               .append("maxEdges", <maxNumEdges>)
                               .append("numEdgeCandidates", <numEdgeCandidates>))
                           .append("quantization", "<quantizationType>")
                           .append("numDimensions", <numDimensions>),
                       new Document("type", "filter")
                           .append("path", "<filterField1>"),
                       new Document("type", "filter")
                           .append("path", "<filterField2>")));

               // Update the index
               collection.updateSearchIndex(indexName, definition);
               System.out.println("Successfully updated the index");
           }
       }
   }

   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Execute the code to update the index.

   From your IDE, run the file to update the index with your changes.

1) Create the `.js` file and define the index changes in the file.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connection-string>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // define your MongoDB Search index
       const index = {
           name: "<indexName>",
           type: "vectorSearch",
           //updated search index definition
           definition: {
             "fields": [
               {
                 "type": "autoEmbed",
                 "modality": "text",
                 "path": "<fieldToIndex>",
                 "model": "<embeddingModel>",
                 "similarity": "<similarityMetric>",
                 "indexingMethod": "<indexingMethod>",
                 "hnswOptions": {
                   "maxEdges": <maxEdges>,
                   "numEdgeCandidates": <numEdgeCandidates>
                 },
                 "quantization": "<quantizationType>",
                 "numDimensions": <numDimensions>
               },
               {
                 "type": "filter",
                 "path": "<fieldToIndex>"
               },
               ...
             ]
           }
       }

       // run the helper method
       await collection.updateSearchIndex("<index-name>", index);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2) Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3) Run the following command to update the index.

   ```shell
   node <file-name>.js
   ```

1. Create the `.py` file and define the index changes in the file.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   definition = {
     "fields": [
       {
         "type": "autoEmbed",
         "modality": "text",
         "path": "<fieldToIndex>",
         "model": "<embeddingModel>",
         "similarity": "<similarityMetric>",
         "indexingMethod": "<indexingMethod>",
         "hnswOptions": {
           "maxEdges": <maxEdges>,
           "numEdgeCandidates": <numEdgeCandidates>
         },
         "quantization": "<quantizationType>",
         "numDimensions": <numDimensions>
       },
       {
         "type": "filter",
         "path": "<fieldToIndex>"
       },
       ...
     ]
   }
       
   # Update your search index
   collection.update_search_index("<indexName>", definition)
   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to update the index. |
   | `<indexName>` | Name of your index that you want to update. |

3. Run the following command to update the index.

   ```shell
   python <file-name>.py
   ```

To edit a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-update-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index changes.

   In the `/src` directory of your project, create a file named `edit_index.rs`. Copy and paste the following code into the file to update the index by using the `update_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection};

   pub(crate) async fn edit_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<database-name>")
           .collection("<collection-name>");

       let index_name = "<index-name>";

       // Define the updated index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "<indexed-field>",
                   "model": "<embedding-model>"
               },
               {
                   "type": "filter",
                   "path": "<field-to-index>"
               }
           ]
       };

       my_coll.update_search_index(index_name, definition).await?;
       println!("Successfully updated the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to update the index. |
   | `<collection-name>` | Collection for which you want to update the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<indexed-field>` | Name of the field indexed as the `autoEmbed` type. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod edit_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       edit_index::edit_index().await
   }
   ```

5. Run the following command to update the index.

   ```shell
   cargo run
   ```

To edit a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to update the index.

3. Run the `db.collection.updateSearchIndex()` method.

   The [`db.collection.updateSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateSearchIndex.md#mongodb-method-db.collection.updateSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.updateSearchIndex(
     "<index-name>",
     {
       fields: [
         {
           "type": "vector",
           "numDimensions": <number-of-dimensions>,
           "path": "<field-to-index>",
           "similarity": "euclidean | cosine | dotProduct"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

To update a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(edit_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(edit_index
     edit-index.cpp
   )

   target_link_libraries(edit_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create an `edit-index.cpp` file and define the index changes in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Specify the new index definition with a vector field
     auto definition = make_document(
         kvp("fields",
             make_array(make_document(
                 kvp("type", "vector"),
                 kvp("path", "<fieldToIndex>"),
                 kvp("numDimensions", <numberOfDimensions>),
                 kvp("similarity", "<similarity>"),
                 kvp("quantization", "<quantization>")))));

     // Update the search index
     siv.update_one(name, definition.view());
     std::cout << "Search index named " << name << " is updating."
               << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to edit the index. |
   | `<collectionName>` | Collection for which you want to edit the index. |
   | `<indexName>` | Name of the index you want to edit. If you omit the index name, defaults to `vector_index`. |
   | `<fieldToIndex>` | Field that contains your vector embeddings. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. This value must match the number of dimensions in your embeddings. |
   | `<similarity>` | Vector similarity function to use when searching. You can specify `euclidean`, `cosine`, or `dotProduct`. |
   | `<quantization>` | Automatic quantization to use for vectors before indexing, which reduces resource consumption. You can specify `none`, `scalar`, or `binary`. Use `scalar` to reduce memory while retaining accuracy, `binary` for the largest memory savings with the highest impact on accuracy, or `none` to disable quantization. To learn how to choose a quantization method, see [Vector Quantization.](https://www.mongodb.com/docs/vector-search/about/vector-quantization.md#std-label-mdb_vs-quantization) |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to update the index.

   ```shell
   ./build/edit_index
   ```

To update a MongoDB Vector Search index for a collection using the [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#update-a-search-index) driver 3.1.0 or later, perform the following steps:

1. Create the `.cs` file and define the index changes in the file.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void EditVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");
               
               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "vector" },
                               { "path", "<fieldToIndex>" },
                               { "numDimensions", <numberOfDimensions> },
                               { "similarity", "euclidean | cosine | dotProduct" }
                           }
                       }
                   }
               };
               
               // Update your search index
               var searchIndexView = collection.SearchIndexes;
               searchIndexView.Update(name, definition);
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.EditVectorIndex();
   ```

4. Compile and run your project.

   ```shell
   dotnet run
   ```

To update a MongoDB Vector Search index for a collection using the [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `edit-index.go` and define the index changes in the file.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connection-string>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	type vectorDefinitionField struct {
   		Type          string `bson:"type"`
   		Path          string `bson:"path"`
   		NumDimensions int    `bson:"numDimensions"`
   		Similarity    string `bson:"similarity"`
   	}

   	type vectorDefinition struct {
   		Fields []vectorDefinitionField `bson:"fields"`
   	}

   	definition := vectorDefinition{
   		Fields: []vectorDefinitionField{{
   			Type:          "vector",
   			Path:          "<fieldToIndex>",
   			NumDimensions: <numberOfDimensions>,
   			Similarity:    "euclidean | cosine | dotProduct"}},
   	}
   	err = coll.SearchIndexes().UpdateOne(ctx, indexName, definition)

   	if err != nil {
   		log.Fatalf("failed to update the index: %v", err)
   	}

   	fmt.Println("Successfully updated the search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   go run edit-index.go
   ```

To edit a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create the `.java` file and  use the `updateSearchIndex()` method to define the index changes in the file.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Collections;

   public class EditVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index changes
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Collections.singletonList(
                       new Document("type", "vector")
                           .append("path", "<fieldToIndex>")
                           .append("numDimensions", "<numberOfDimensions>")
                           .append("similarity", "euclidean | cosine | dotProduct")
                           .append("quantization", "none | scalar | binary")));

               // Update the index
               collection.updateSearchIndex(indexName, definition);
               System.out.println("Successfully updated the index");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Execute the code to update the index.

   From your IDE, run the file to update the index with your changes.

To update a MongoDB Vector Search index for a collection using the [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and define the index changes in the file.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connection-string>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // define your MongoDB Search index
       const index = {
           name: "<indexName>",
           type: "vectorSearch",
           //updated search index definition
           definition: {
             "fields": [
               {
                 "type": "vector",
                 "numDimensions": <numberOfDimensions>,
                 "path": "<field-to-index>",
                 "similarity": "euclidean | cosine | dotProduct"
               },
               {
                 "type": "filter",
                 "path": "<fieldToIndex>"
               },
               ...
             ]
           }
       }

       // run the helper method
       await collection.updateSearchIndex("<index-name>", index);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/edit-indexes.ipynb)

To update a MongoDB Vector Search index for a collection using the [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create the `.py` file and define the index changes in the file.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   definition = {
     "fields": [
       {
         "type": "vector",
         "numDimensions": <numberofDimensions>,
         "path": "<fieldToIndex>",
         "similarity": "euclidean | cosine | dotProduct",
         "quantization": " none | scalar | binary "
       },
       {
         "type": "filter",
         "path": "<fieldToIndex>"
       },
       ...
     ]
   }
       
   # Update your search index
   collection.update_search_index("<indexName>", definition)
   ```

   To learn more, see the [update\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.update_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<fieldToIndex>` | Vector and filter fields to index. |

3. Run the following command to update the index.

   ```shell
   python <file-name>.py
   ```

To update a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `sync` feature is required only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index changes.

   In the `/src` directory of your project, create a file named `edit_index.rs`. Copy and paste the following code into the file to update the index by using the `update_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection};

   pub(crate) async fn edit_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Define the updated index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "vector",
                   "path": "<fieldToIndex>",
                   "numDimensions": <numberOfDimensions>,
                   "similarity": "<vectorSimilarity>"
               }
           ]
       };

       my_coll.update_search_index(index_name, definition).await?;
       println!("Successfully updated the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to update the index. |
   | `<collectionName>` | Collection for which you want to update the index. |
   | `<indexName>` | Name of the index that you want to update. |
   | `<fieldToIndex>` | Vector field to index. |
   | `<numberOfDimensions>` | Number of vector dimensions that MongoDB Vector Search enforces at index-time and query-time. |
   | `<vectorSimilarity>` | Vector similarity function to use to search for the top K-nearest neighbors. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod edit_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       edit_index::edit_index().await
   }
   ```

5. Run the following command to update the index.

   ```shell
   cargo run
   ```

To view a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection for which you want to update the index.

3. Run the `db.collection.updateSearchIndex()` method.

   The [`db.collection.updateSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateSearchIndex.md#mongodb-method-db.collection.updateSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.updateSearchIndex(
     "<index-name>",
     {
       fields: [
         {
           "type": "autoEmbed",
           "modality": "text",
           "path": "<field-to-index>",
           "model": "<embedding-model>",
           "similarity": "<similarity-metric>",
           "numDimensions": <number-of-dimensions>,
           "indexingMethod": "<indexing-method>",
           "hnswOptions": {
             "maxEdges": <number-of-connected-neighbors>,
             "numEdgeCandidates": <number-of-nearest-neighbors>
           },
           "quantization": "<quantization-type>"
         },
         {
           "type": "filter",
           "path": "<field-to-index>"
         },
         ...
       ]
     }
   );
   ```

To update a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

**Note:**

`voyage-code-4` requires an Atlas deployment. On self-managed deployments, use `voyage-code-3` for code search and technical documentation.

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(edit_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(edit_index
     edit-auto-embed-index.cpp
   )

   target_link_libraries(edit_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create an `edit-auto-embed-index.cpp` file and define the index changes in the file.

   ```cpp
   #include <bsoncxx/builder/basic/document.hpp>
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   using bsoncxx::builder::basic::kvp;
   using bsoncxx::builder::basic::make_array;
   using bsoncxx::builder::basic::make_document;

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Specify the new index definition with automated embedding and
     // filter fields
     auto definition = make_document(
         kvp("fields",
             make_array(
                 make_document(kvp("type", "autoEmbed"),
                               kvp("modality", "text"),
                               kvp("path", "<indexedField>"),
                               kvp("model", "<embeddingModel>")),
                 make_document(kvp("type", "filter"),
                               kvp("path", "<fieldToIndex>")))));

     // Update the search index
     siv.update_one(name, definition.view());
     std::cout << "Search index named " << name << " is updating."
               << std::endl;

     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to edit the index. |
   | `<collectionName>` | Collection for which you want to edit the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<indexedField>` | Name of the text field to index as the `autoEmbed` type. MongoDB Vector Search automatically generates vector embeddings for this field by using the specified Voyage AI model. |
   | `<embeddingModel>` | Name of the supported Voyage AI embedding model to use for generating embeddings. You can specify `voyage-4-lite`, `voyage-4`, `voyage-4-large`, `voyage-code-4`, or `voyage-code-3`. To learn more, see [Models for Automated Embedding.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-avs-auto-embeddings-model-ecosystem) |
   | `<fieldToIndex>` | Field to index as the `filter` type for pre-filtering your data. Filtering narrows the scope of your semantic search, such as in a multi-tenant environment. You can filter on boolean, date, objectId, numeric, string, and UUID values, including arrays of these types. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to update the index.

   ```shell
   ./build/edit_index
   ```

1) Create the `.cs` file and define the index changes in the file.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";
       // Other class methods here...
       public void EditVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");
               
               var definition = new BsonDocument
               {
                   { "fields", new BsonArray
                       {
                           new BsonDocument
                           {
                               { "type", "autoEmbed" },
                               { "modality", "text" },
                               { "path", "<indexedField>" },
                               { "model", "<embeddingModel>" },
                               { "similarity", "<similarityMetric>" },
                               { "indexingMethod", "<indexingMethod>" },
                               { "hnswOptions", new BsonDocument
                                   {
                                       { "maxEdges", <maxEdges> },
                                       { "numEdgeCandidates", <numEdgeCandidates> }
                                   }
                               },
                               { "quantization", "<quantizationType>" },
                               { "numDimensions", <numDimensions> }
                           },
                           new BsonDocument
                           {
                               { "type", "filter" },
                               { "path", "<fieldToIndex>" }
                           },
                           new BsonDocument
                           {
                               { "type", "filter" },
                               { "path", "<fieldToIndex>" }
                           }
                       }
                   }
               };
               
               // Update your search index
               var searchIndexView = collection.SearchIndexes;
               searchIndexView.Update(<indexName>, definition);
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2) Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3) Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.EditVectorIndex();
   ```

4) Compile and run your project.

   ```shell
   dotnet run
   ```

1. Create a file called `edit-index.go` and define the index changes in the file.

   ```go
   package main  
     
   import (  
   	"context"  
   	"fmt"  
   	"log"  
     
   	"go.mongodb.org/mongo-driver/v2/mongo"  
   	"go.mongodb.org/mongo-driver/v2/mongo/options"  
   )  
     
   func main() {  
   	ctx := context.Background()  
     
   	// Replace the placeholder with your connection string  
   	const uri = "<connection-string>"  
     
   	// Connect to your cluster  
   	clientOptions := options.Client().ApplyURI(uri)  
   	client, err := mongo.Connect(ctx, clientOptions)
   	if err != nil {  
   		log.Fatalf("failed to connect to the server: %v", err)  
   	}  
   	defer func() { _ = client.Disconnect(ctx) }()  
     
   	// Set the namespace  
   	coll := client.Database("<database-name>").Collection("<collection-name>")  
   	indexName := "<index-name>"  
     
   	type autoEmbedField struct {  
   		Type             string `bson:"type"`  
   		Modality         string `bson:"modality"`  
   		Path             string `bson:"path"`  
   		Model            string `bson:"model"`
   		Similarity       string `bson:"similarity"`  
   		IndexingMethod   string `bson:"indexingMethod"`  
   		HnswOptions      struct {  
   			MaxEdges         int `bson:"maxEdges"`  
   			NumEdgeCandidates int `bson:"numEdgeCandidates"`  
   		} `bson:"hnswOptions"`  
   		Quantization string `bson:"quantization"`  
   		NumDimensions  int    `bson:"numDimensions"`  
   	}  
     
   	type filterField struct {  
   		Type string `bson:"type"`  
   		Path string `bson:"path"`  
   	}  
     
   	type indexDefinition struct {  
   		Fields []interface{} `bson:"fields"`  
   	}  
     
   	definition := indexDefinition{  
   		Fields: []interface{}{  
   			autoEmbedField{  
   				Type:     "autoEmbed",  
   				Modality: "text",  
   				Path:     "<indexed-field>",  
   				Model:    "<embedding-model>", 
   				Similarity:       "<similarity-metric>",  
   				IndexingMethod:   "<indexing-method>",  
   				HnswOptions:      struct {  
   					MaxEdges         int `bson:"maxEdges"`  
   					NumEdgeCandidates int `bson:"numEdgeCandidates"`  
   				} {  
   					MaxEdges:         <max-edges>,  
   					NumEdgeCandidates: <num-edge-candidates>,  
   				},  
   				Quantization: "<quantization-type>",  
   				NumDimensions:  <num-dimensions>,  
   			},  
   			filterField{  
   				Type: "filter",
   				Path: "<field-to-index>",  
   			},  
   		},  
   	}  
     
   	err = coll.SearchIndexes().UpdateOne(ctx, <index-name>, definition)  
     
   	if err != nil {  
   		log.Fatalf("failed to update the index: %v", err)  
   	}  
     
   	fmt.Println("Successfully updated the search index")  
   }  
   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to create the index. |
   | `<collection-name>` | Collection for which you want to create the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Run the following command to update the index.

   ```shell
   go run edit-index.go
   ```

To edit a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.2.0 or later, perform the following steps:

1. Create a `.java` file and use the `updateSearchIndex()` method to add or remove `filter` type fields.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;
   import org.bson.conversions.Bson;

   import java.util.Arrays;

   public class EditVectorIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Define the index changes
               String indexName = "<indexName>";
               Bson definition = new Document(
                   "fields",
                   Arrays.asList(
                       new Document("type", "autoEmbed")
                           .append("modality", "text")
                           .append("model", "<modelName>")
                           .append("path", "<indexedField>")
                           .append("similarity", "<similarityMetric>")
                           .append("indexingMethod", "<indexingMethod>")
                           .append("hnswOptions", new Document()
                               .append("maxEdges", <maxNumEdges>)
                               .append("numEdgeCandidates", <numEdgeCandidates>))
                           .append("quantization", "<quantizationType>")
                           .append("numDimensions", <numDimensions>),
                       new Document("type", "filter")
                           .append("path", "<filterField1>"),
                       new Document("type", "filter")
                           .append("path", "<filterField2>")));

               // Update the index
               collection.updateSearchIndex(indexName, definition);
               System.out.println("Successfully updated the index");
           }
       }
   }

   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Execute the code to update the index.

   From your IDE, run the file to update the index with your changes.

1) Create the `.js` file and define the index changes in the file.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri =  "<connection-string>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // define your MongoDB Search index
       const index = {
           name: "<indexName>",
           type: "vectorSearch",
           //updated search index definition
           definition: {
             "fields": [
               {
                 "type": "autoEmbed",
                 "modality": "text",
                 "path": "<fieldToIndex>",
                 "model": "<embeddingModel>",
                 "similarity": "<similarityMetric>",
                 "indexingMethod": "<indexingMethod>",
                 "hnswOptions": {
                   "maxEdges": <maxEdges>,
                   "numEdgeCandidates": <numEdgeCandidates>
                 },
                 "quantization": "<quantizationType>",
                 "numDimensions": <numDimensions>
               },
               {
                 "type": "filter",
                 "path": "<fieldToIndex>"
               },
               ...
             ]
           }
       }

       // run the helper method
       await collection.updateSearchIndex("<index-name>", index);
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);

   ```

2) Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to create the index. |
   | `<collectionName>` | Collection for which you want to create the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `autoembed_index`. |

3) Run the following command to update the index.

   ```shell
   node <file-name>.js
   ```

1. Create the `.py` file and define the index changes in the file.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   definition = {
     "fields": [
       {
         "type": "autoEmbed",
         "modality": "text",
         "path": "<fieldToIndex>",
         "model": "<embeddingModel>",
         "similarity": "<similarityMetric>",
         "indexingMethod": "<indexingMethod>",
         "hnswOptions": {
           "maxEdges": <maxEdges>,
           "numEdgeCandidates": <numEdgeCandidates>
         },
         "quantization": "<quantizationType>",
         "numDimensions": <numDimensions>
       },
       {
         "type": "filter",
         "path": "<fieldToIndex>"
       },
       ...
     ]
   }
       
   # Update your search index
   collection.update_search_index("<indexName>", definition)
   ```

2. Replace the following values and add or modify other settings in the index definition as needed, then save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection. |
   | `<collectionName>` | Name of the collection for which you want to update the index. |
   | `<indexName>` | Name of your index that you want to update. |

3. Run the following command to update the index.

   ```shell
   python <file-name>.py
   ```

To edit a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-update-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Define the index changes.

   In the `/src` directory of your project, create a file named `edit_index.rs`. Copy and paste the following code into the file to update the index by using the `update_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::{doc, Document};
   use mongodb::{Client, Collection};

   pub(crate) async fn edit_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connection-string>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<database-name>")
           .collection("<collection-name>");

       let index_name = "<index-name>";

       // Define the updated index fields.
       let definition = doc! {
           "fields": [
               {
                   "type": "autoEmbed",
                   "modality": "text",
                   "path": "<indexed-field>",
                   "model": "<embedding-model>"
               },
               {
                   "type": "filter",
                   "path": "<field-to-index>"
               }
           ]
       };

       my_coll.update_search_index(index_name, definition).await?;
       println!("Successfully updated the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connection-string>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<database-name>` | Database that contains the collection for which you want to update the index. |
   | `<collection-name>` | Collection for which you want to update the index. |
   | `<index-name>` | Name of your index. If you omit the index name, defaults to `vector_index`. |
   | `<indexed-field>` | Name of the field indexed as the `autoEmbed` type. |
   | `<embedding-model>` | Name of the Voyage AI embedding model to use for generating embeddings. |
   | `<field-to-index>` | Vector and filter fields to index. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod edit_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       edit_index::edit_index().await
   }
   ```

5. Run the following command to update the index.

   ```shell
   cargo run
   ```

## Delete a MongoDB Vector Search Index

You can delete a MongoDB Vector Search index at any time from the Atlas UI, Atlas Administration API, Atlas CLI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

You can delete a MongoDB Vector Search index at any time from the Atlas UI, [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), or a supported [MongoDB Driver.](https://www.mongodb.com/docs/drivers/)

### Required Access

You must have the [`Project Search Index Editor`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Search-Index-Editor) or higher role to delete a MongoDB Vector Search index.

**Note:**

You can use the [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) command or driver helper methods to delete MongoDB Vector Search indexes on all Atlas cluster tiers. For a list of supported driver versions, see [Supported Clients](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-index-supported-drivers).

You need [`readWrite`](https://www.mongodb.com/docs/manual/reference/built-in-roles.md#mongodb-authrole-readWrite) or higher role to delete MongoDB Vector Search indexes.

### Procedure

1. In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   If your project has multiple clusters, select the cluster you want to use from the Select cluster dropdown, then click Go to Atlas Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2. Delete the index.

   Locate the `vectorSearch` type index to delete.

   Click Delete Index from the Actions dropdown for that index.

   Click Drop Index in the confirmation window.

To delete a MongoDB Vector Search index for a collection using the Atlas Administration API, send a `DELETE` request to the MongoDB Search `indexes` endpoint with either the unique ID or the name of the index to delete.

```shell
curl --header "Authorization: Bearer {ACCESS-TOKEN}" \
     --header "Accept: application/json" \
     --include \
     --request DELETE "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{indexId} | https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/search/indexes/{databaseName}/{collectionName}/{indexName|indexId}"
```

To learn more about the syntax and parameters for the endpoint, see [Remove One Search Index By Name](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-deletegroupclustersearchindexbyname) and [Remove One Search Index By ID.](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-deletegroupclustersearchindex)

To delete a MongoDB Vector Search index for a collection using Atlas CLI, perform the following steps:

1. Gather the following information.

   | `<indexId>` | The unique identifier of the index to delete. |
   | --- | --- |
   | `<clusterName>` | The name of the cluster. |
   | `<projectId>` | The unique identifier of the project. |

2. Run the command to delete the index.

   ```shell
   atlas clusters search indexes delete <indexId> [options]
   ```

   In the command, replace the `indexId` placeholder value with the unique identifier of the index to delete.

   To learn more about the command syntax and parameters, see the Atlas CLI documentation for the [atlas clusters search indexes delete](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-delete/) command.

To delete a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.dropSearchIndex()` method.

   The [`db.collection.dropSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.dropSearchIndex.md#mongodb-method-db.collection.dropSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.dropSearchIndex( "<index-name>" );
   ```

To delete a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(delete_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(delete_index
     delete-index.cpp
   )

   target_link_libraries(delete_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `delete-index.cpp` file and use the `drop_one()` method to delete the index.

   ```cpp
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Delete the search index
     siv.drop_one(name);
     std::cout << "Search index named " << name << " is deleted."
               << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index you want to delete. If you omit the index name, defaults to `vector_index`. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to delete the index.

   ```shell
   ./build/delete_index
   ```

To delete a MongoDB Vector Search index for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#drop-a-search-index) driver 3.1.0 or later, perform the following steps:

1. Create the `.cs` file and use the `DropOne()` method to delete the index.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";    
       // Other class methods here...
       public void DeleteVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Delete your search index
               var searchIndexView = collection.SearchIndexes;
               var name = "<indexName>";
               searchIndexView.DropOne(name);
               
               Console.WriteLine($"Dropping search index named {name}. This may take up to a minute.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.DeleteVectorIndex();
   ```

4. Compile and run your project to delete the index.

   ```shell
   dotnet run
   ```

To delete a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `delete-index.go` and use the `SearchIndexes().DropOne()` method to delete the index.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	err = coll.SearchIndexes().DropOne(ctx, indexName)
   	if err != nil {
   		log.Fatalf("failed to delete the index: %v", err)
   	}

   	fmt.Println("Successfully deleted the Vector Search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   go run delete-index.go
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create the `.java` file and use the `collection.dropSearchIndex()` method to delete the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class DeleteIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the index to delete
               String indexName = "<indexName>";

   			try {
                   collection.dropSearchIndex(indexName);
               } catch (Exception e) {
                   throw new RuntimeException("Error deleting index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Execute the code to delete the index.

   From your IDE, run the file to delete the specified index.

To delete a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and use the `dropSearchIndex()` method to delete the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri = "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       await collection.dropSearchIndex("<indexName>");
       
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/delete-indexes.ipynb)

To delete a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create the `.py` file and use the `drop_search_index()` method to delete the index.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Delete your search index
   collection.drop_search_index("<indexName>")
   ```

   To learn more, see the [drop\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.drop_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Run the following command to delete the index.

   ```shell
   python <file-name>.py
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `sync` feature is required only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Delete the index.

   In the `/src` directory of your project, create a file named `delete_index.rs`. Copy and paste the following code into the file to delete the index by using the `drop_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};

   pub(crate) async fn delete_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Delete the index.
       my_coll.drop_search_index(index_name).await?;
       println!("Successfully deleted the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index that you want to delete. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod delete_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       delete_index::delete_index().await
   }
   ```

5. Run the following command to delete the index.

   ```shell
   cargo run
   ```

1) In Atlas, go to the Search & Vector Search page for your cluster.

   You can go the MongoDB Search page from the Search & Vector Search option, or the Data Explorer.

   ###### Search & Vector Search

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Search & Vector Search under the Database heading.

   If your project has multiple clusters, select the cluster you want to use from the Select cluster dropdown, then click Go to Atlas Search.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

   ###### Data Explorer

   If it's not already displayed, select the organization that contains your project from the  Organizations menu in the navigation bar.

   If it's not already displayed, select your project from the Projects menu in the navigation bar.

   In the sidebar, click Data Explorer under the Database heading.

   Expand the database and select the collection.

   Click the Indexes tab for the collection.

   Click the Search and Vector Search link in the banner.

   The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

2) Delete the index.

   Locate the `vectorSearch` type index to delete.

   Click Delete Index from the Actions dropdown for that index.

   Click Drop Index in the confirmation window.

To delete a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.dropSearchIndex()` method.

   The [`db.collection.dropSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.dropSearchIndex.md#mongodb-method-db.collection.dropSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.dropSearchIndex( "<index-name>" );
   ```

To delete a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(delete_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(delete_index
     delete-index.cpp
   )

   target_link_libraries(delete_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `delete-index.cpp` file and specify the index to delete.

   ```cpp
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Delete the search index
     siv.drop_one(name);
     std::cout << "Search index named " << name << " is deleted."
               << std::endl;

     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index you want to delete. If you omit the index name, defaults to `vector_index`. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to delete the index.

   ```shell
   ./build/delete_index
   ```

To delete a MongoDB Vector Search index for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#drop-a-search-index) driver 3.1 or later, perform the following steps:

1. Create the `.cs` file and use the `DropOne()` method to delete the index.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";    
       // Other class methods here...
       public void DeleteVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Delete your search index
               var searchIndexView = collection.SearchIndexes;
               var name = "<indexName>";
               searchIndexView.DropOne(name);
               
               Console.WriteLine($"Dropping search index named {name}. This may take up to a minute.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.DeleteVectorIndex();
   ```

4. Compile and run your project to delete the index.

   ```shell
   dotnet run
   ```

To delete a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `delete-index.go` and use the `SearchIndexes().DropOne()` method to delete the index.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	err = coll.SearchIndexes().DropOne(ctx, indexName)
   	if err != nil {
   		log.Fatalf("failed to delete the index: %v", err)
   	}

   	fmt.Println("Successfully deleted the Vector Search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   go run delete-index.go
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create the `.java` file and use the `collection.dropSearchIndex()` method to delete the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class DeleteIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the index to delete
               String indexName = "<indexName>";

   			try {
                   collection.dropSearchIndex(indexName);
               } catch (Exception e) {
                   throw new RuntimeException("Error deleting index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Execute the code to delete the index.

   From your IDE, run the file to delete the specified index.

To delete a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/), perform the following steps:

1. Create the `.js` file and use the `dropSearchIndex()` method to delete the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri = "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       await collection.dropSearchIndex("<indexName>");
       
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   node <file-name>.js
   ```

To delete a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver, perform the following steps:

1. Create the `.py` file and use the `drop_search_index()` method to delete the index.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Delete your search index
   collection.drop_search_index("<indexName>")
   ```

   To learn more, see the [drop\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.drop_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Run the following command to delete the index.

   ```shell
   python <file-name>.py
   ```

To delete a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-drop-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Delete the index.

   In the `/src` directory of your project, create a file named `delete_index.rs`. Copy and paste the following code into the file to delete the index by using the `drop_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};

   pub(crate) async fn delete_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Delete the index.
       my_coll.drop_search_index(index_name).await?;
       println!("Successfully deleted the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod delete_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       delete_index::delete_index().await
   }
   ```

5. Run the following command to delete the index.

   ```shell
   cargo run
   ```

To delete a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.dropSearchIndex()` method.

   The [`db.collection.dropSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.dropSearchIndex.md#mongodb-method-db.collection.dropSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.dropSearchIndex( "<index-name>" );
   ```

To delete a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(delete_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(delete_index
     delete-index.cpp
   )

   target_link_libraries(delete_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `delete-index.cpp` file and use the `drop_one()` method to delete the index.

   ```cpp
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Delete the search index
     siv.drop_one(name);
     std::cout << "Search index named " << name << " is deleted."
               << std::endl;
     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index you want to delete. If you omit the index name, defaults to `vector_index`. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to delete the index.

   ```shell
   ./build/delete_index
   ```

To delete a MongoDB Vector Search index for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#drop-a-search-index) driver 3.1.0 or later, perform the following steps:

1. Create the `.cs` file and use the `DropOne()` method to delete the index.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";    
       // Other class methods here...
       public void DeleteVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Delete your search index
               var searchIndexView = collection.SearchIndexes;
               var name = "<indexName>";
               searchIndexView.DropOne(name);
               
               Console.WriteLine($"Dropping search index named {name}. This may take up to a minute.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.DeleteVectorIndex();
   ```

4. Compile and run your project to delete the index.

   ```shell
   dotnet run
   ```

To delete a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/fundamentals/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `delete-index.go` and use the `SearchIndexes().DropOne()` method to delete the index.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	err = coll.SearchIndexes().DropOne(ctx, indexName)
   	if err != nil {
   		log.Fatalf("failed to delete the index: %v", err)
   	}

   	fmt.Println("Successfully deleted the Vector Search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   go run delete-index.go
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/indexes/) v5.2.0 or later, perform the following steps:

1. Create the `.java` file and use the `collection.dropSearchIndex()` method to delete the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class DeleteIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the index to delete
               String indexName = "<indexName>";

   			try {
                   collection.dropSearchIndex(indexName);
               } catch (Exception e) {
                   throw new RuntimeException("Error deleting index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Execute the code to delete the index.

   From your IDE, run the file to delete the specified index.

To delete a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/) v6.6.0 or later, perform the following steps:

1. Create the `.js` file and use the `dropSearchIndex()` method to delete the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri = "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       await collection.dropSearchIndex("<indexName>");
       
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `vector_index`. |

3. Run the following command to delete the index.

   ```shell
   node <file-name>.js
   ```

Work with a runnable version of this example as a [Python notebook.](https://github.com/mongodb/docs-notebooks/blob/main/manage-indexes/delete-indexes.ipynb)

To delete a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver v4.7 or later, perform the following steps:

1. Create the `.py` file and use the `drop_search_index()` method to delete the index.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Delete your search index
   collection.drop_search_index("<indexName>")
   ```

   To learn more, see the [drop\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.drop_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Run the following command to delete the index.

   ```shell
   python <file-name>.py
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-atlas-search-indexes) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `sync` feature is required only for the synchronous API. To learn more about installing the driver, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Delete the index.

   In the `/src` directory of your project, create a file named `delete_index.rs`. Copy and paste the following code into the file to delete the index by using the `drop_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};

   pub(crate) async fn delete_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Delete the index.
       my_coll.drop_search_index(index_name).await?;
       println!("Successfully deleted the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index that you want to delete. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod delete_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       delete_index::delete_index().await
   }
   ```

5. Run the following command to delete the index.

   ```shell
   cargo run
   ```

To delete a MongoDB Vector Search index for a collection using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh), perform the following steps:

1. Connect to the cluster using [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh).

   To learn more, see [Connect to a Cluster via mongosh.](https://www.mongodb.com/docs/atlas/mongo-shell-connection.md#std-label-connect-mongo-shell)

2. Switch to the database that contains the collection.

3. Run the `db.collection.dropSearchIndex()` method.

   The [`db.collection.dropSearchIndex()`](https://www.mongodb.com/docs/manual/reference/method/db.collection.dropSearchIndex.md#mongodb-method-db.collection.dropSearchIndex) method has the following syntax:

   ```shell
   db.<collectionName>.dropSearchIndex( "<index-name>" );
   ```

To delete a MongoDB Vector Search index for a collection using the [C++](https://www.mongodb.com/docs/drivers/cxx/) driver v3.11.0 or later, perform the following steps:

1. Create a `CMakeLists.txt` file in your project directory.

   Copy and paste the following lines into the `CMakeLists.txt` file:

   ```console
   cmake_minimum_required(VERSION 3.15)

   project(delete_index)

   set(CMAKE_CXX_STANDARD 17)

   find_package(mongocxx REQUIRED)

   add_executable(delete_index
     delete-index.cpp
   )

   target_link_libraries(delete_index PRIVATE mongo::mongocxx_shared)
   ```

2. Create a `delete-index.cpp` file and specify the index to delete.

   ```cpp
   #include <iostream>
   #include <mongocxx/client.hpp>
   #include <mongocxx/instance.hpp>
   #include <mongocxx/search_index_view.hpp>
   #include <mongocxx/uri.hpp>

   int main() {
     mongocxx::instance inst;

     // Connect to your deployment
     const auto uri = mongocxx::uri{"<connectionString>"};
     mongocxx::client conn{uri};

     // Access your database and collection
     auto collection = conn["<databaseName>"]["<collectionName>"];

     auto siv = collection.search_indexes();
     auto name = "<indexName>";

     // Delete the search index
     siv.drop_one(name);
     std::cout << "Search index named " << name << " is deleted."
               << std::endl;

     return 0;
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of the index you want to delete. If you omit the index name, defaults to `vector_index`. |

4. Prepare and build your project.

   ```shell
   cmake -B build
   cmake --build build
   ```

5. Run the following command to delete the index.

   ```shell
   ./build/delete_index
   ```

To delete a MongoDB Vector Search index for a collection using [C#](https://www.mongodb.com/docs/drivers/csharp/current/fundamentals/indexes/#drop-a-search-index) driver 3.1 or later, perform the following steps:

1. Create the `.cs` file and use the `DropOne()` method to delete the index.

   ```csharp
   namespace query_quick_start;

   using MongoDB.Bson;
   using MongoDB.Driver;

   public class IndexService
   {
       private const string MongoConnectionString = "<connectionString>";    
       // Other class methods here...
       public void DeleteVectorIndex()
       {
           try
           {
               // connect to your deployment
               var client = new MongoClient(MongoConnectionString);

               // Access your database and collection
               var database = client.GetDatabase("<databaseName>");
               var collection = database.GetCollection<BsonDocument>("<collectionName>");

               // Delete your search index
               var searchIndexView = collection.SearchIndexes;
               var name = "<indexName>";
               searchIndexView.DropOne(name);
               
               Console.WriteLine($"Dropping search index named {name}. This may take up to a minute.");
           }
           catch (Exception e)
           {
               Console.WriteLine($"Exception: {e.Message}");
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Initialize the class and call the method in `Program.cs`.

   ```csharp
   using query_quick_start;

   var indexService = new IndexService();
   indexService.DeleteVectorIndex();
   ```

4. Compile and run your project to delete the index.

   ```shell
   dotnet run
   ```

To delete a MongoDB Vector Search index for a collection using [MongoDB Go driver](https://www.mongodb.com/docs/drivers/go/current/indexes/) v2.0 or later, perform the following steps:

1. Create a file called `delete-index.go` and use the `SearchIndexes().DropOne()` method to delete the index.

   ```go
   package main

   import (
   	"context"
   	"fmt"
   	"log"

   	"go.mongodb.org/mongo-driver/v2/mongo"
   	"go.mongodb.org/mongo-driver/v2/mongo/options"
   )

   func main() {
   	ctx := context.Background()

   	// Replace the placeholder with your connection string
   	const uri = "<connectionString>"

   	// Connect to your cluster
   	clientOptions := options.Client().ApplyURI(uri)
   	client, err := mongo.Connect(clientOptions)
   	if err != nil {
   		log.Fatalf("failed to connect to the server: %v", err)
   	}
   	defer func() { _ = client.Disconnect(ctx) }()

   	// Set the namespace
   	coll := client.Database("<databaseName>").Collection("<collectionName>")
   	indexName := "<indexName>"

   	err = coll.SearchIndexes().DropOne(ctx, indexName)
   	if err != nil {
   		log.Fatalf("failed to delete the index: %v", err)
   	}

   	fmt.Println("Successfully deleted the Vector Search index")
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Run the following command to delete the index.

   ```shell
   go run delete-index.go
   ```

To delete a MongoDB Vector Search index for a collection using the [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/indexes/) v5.7 or later, perform the following steps:

1. Create the `.java` file and use the `collection.dropSearchIndex()` method to delete the index.

   ```java
   import com.mongodb.client.MongoClient;
   import com.mongodb.client.MongoClients;
   import com.mongodb.client.MongoCollection;
   import com.mongodb.client.MongoDatabase;
   import org.bson.Document;

   public class DeleteIndex {

       public static void main(String[] args) {

           // Replace the placeholder with your connection string
           String uri = "<connectionString>";

           // Connect to your cluster
           try (MongoClient mongoClient = MongoClients.create(uri)) {

               // Set the namespace
               MongoDatabase database = mongoClient.getDatabase("<databaseName>");
               MongoCollection<Document> collection = database.getCollection("<collectionName>");

               // Specify the index to delete
               String indexName = "<indexName>";

   			try {
                   collection.dropSearchIndex(indexName);
               } catch (Exception e) {
                   throw new RuntimeException("Error deleting index: " + e);
               }

           } catch (Exception e) {
               throw new RuntimeException("Error connecting to MongoDB: " + e);
           }
       }
   }

   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Execute the code to delete the index.

   From your IDE, run the file to delete the specified index.

To delete a MongoDB Vector Search index for a collection using [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/fundamentals/indexes/), perform the following steps:

1. Create the `.js` file and use the `dropSearchIndex()` method to delete the index.

   ```javascript
   const { MongoClient } = require("mongodb");

   // connect to your deployment
   const uri = "<connectionString>";

   const client = new MongoClient(uri);

   async function run() {
     try {
       const database = client.db("<databaseName>");
       const collection = database.collection("<collectionName>");

       // run the helper method
       await collection.dropSearchIndex("<indexName>");
       
     } finally {
       await client.close();
     }
   }
   run().catch(console.dir);
   ```

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The database that contains the collection for which you want to create the index. |
   | `<collectionName>` | The collection for which you want to create the index. |
   | `<indexName>` | The name of your index. If you omit the index name, defaults to `autoembed_index`. |

3. Run the following command to delete the index.

   ```shell
   node <file-name>.js
   ```

To delete a MongoDB Vector Search index for a collection using [PyMongo](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/indexes/atlas-search-index/) driver, perform the following steps:

1. Create the `.py` file and use the `drop_search_index()` method to delete the index.

   ```python
   from pymongo.mongo_client import MongoClient

   # Connect to your deployment
   uri = "<connectionString>"
   client = MongoClient(uri)

   # Access your database and collection
   database = client["<databaseName>"]
   collection = database["<collectionName>"]

   # Delete your search index
   collection.drop_search_index("<indexName>")
   ```

   To learn more, see the [drop\_search\_index()](https://pymongo.readthedocs.io/en/4.7.1/api/pymongo/collection.html#pymongo.collection.Collection.drop_search_index) method.

2. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | The name of the database that contains the collection. |
   | `<collectionName>` | The name of the collection. |
   | `<indexName>` | The name of the index to delete. |

3. Run the following command to delete the index.

   ```shell
   python <file-name>.py
   ```

To delete a MongoDB Vector Search index for a collection by using the [MongoDB Rust driver](https://www.mongodb.com/docs/drivers/rust/current/indexes/atlas-search-indexes.md#std-label-rust-drop-search-index) v3.1.0 or later, perform the following steps:

1. Install the MongoDB Rust driver.

   Add the driver to your project's `Cargo.toml` file:

   ```toml
   [dependencies]
   futures = "0.3"
   tokio = { version = "1", features = ["full"] }

   [dependencies.mongodb]
   version = "3.1.0"
   features = ["sync"]
   ```

   The `futures` crate is required only for the asynchronous API, while the `sync` feature is only for the synchronous API. To learn more about the Rust driver installation, see [Download and Install](https://www.mongodb.com/docs/drivers/rust/current/get-started.md#std-label-rust-quick-start-download-and-install). To learn more about the synchronous API, see [Configure the Synchronous API.](https://www.mongodb.com/docs/drivers/rust/current/runtimes.md#std-label-rust-runtimes-configure-sync)

2. Delete the index.

   In the `/src` directory of your project, create a file named `delete_index.rs`. Copy and paste the following code into the file to delete the index by using the `drop_search_index()` method.

   ### Asynchronous API

   ```rust
   use mongodb::bson::Document;
   use mongodb::{Client, Collection};

   pub(crate) async fn delete_index() -> mongodb::error::Result<()> {
       // Replace the placeholder with your connection string.
       let uri = "<connectionString>";
       let client = Client::with_uri_str(uri).await?;

       // Access your database and collection.
       let my_coll: Collection<Document> = client
           .database("<databaseName>")
           .collection("<collectionName>");

       let index_name = "<indexName>";

       // Delete the index.
       my_coll.drop_search_index(index_name).await?;
       println!("Successfully deleted the search index.");

       Ok(())
   }

   ```

3. Replace the following values and save the file.

   | `<connectionString>` | Cluster connection string. To learn more, see [Connect to a Cluster via Client Libraries.](https://www.mongodb.com/docs/atlas/driver-connection.md#std-label-connect-via-driver) |
   | --- | --- |
   | `<databaseName>` | Database that contains the collection for which you want to delete the index. |
   | `<collectionName>` | Collection for which you want to delete the index. |
   | `<indexName>` | Name of your index. If you omit the index name, defaults to `vector_index`. |

4. Call the function from your `main.rs` file.

   ### Asynchronous API

   ```rust
   mod delete_index;

   #[tokio::main]
   async fn main() -> mongodb::error::Result<()> {
       delete_index::delete_index().await
   }
   ```

5. Run the following command to delete the index.

   ```shell
   cargo run
   ```

#### Index Status

When you create the MongoDB Vector Search index, the Status column shows the current state of the index on the primary node of the cluster. Click the View status details link below the status to view the state of the index on all the nodes of the cluster.

When the Status column reads Active, the index is ready to use. In other states, queries against the index may return incomplete results.

| Status | Description |
| --- | --- |
| Not Started | Atlas has not yet started building the index. |
| Pending | Atlas is building the index or rebuilding the index after an edit. When the index is in this state: For a new index, MongoDB Vector Search does not serve queries until the index build is complete.; For an existing index, you can continue to use the old index for existing and new queries until the index rebuild is complete. |
| Ready | Index is ready to use. |
| Recovering | Replication encountered an error. This state commonly occurs when the current replication point is no longer available on the [`mongod`](https://www.mongodb.com/docs/manual/reference/program/mongod.md#mongodb-binary-bin.mongod) oplog. You can still query the existing index until it updates and its status changes to Active. Use the error in the View status details modal window to troubleshoot the issue. To learn more, see [Fix Issues.](https://www.mongodb.com/docs/atlas/reference/alert-resolutions/atlas-search-alerts.md#std-label-atlas-search-alerts) |
| Failed | Atlas could not build the index. Use the error in the View status details modal window to troubleshoot the issue. To learn more, see [Fix Issues.](https://www.mongodb.com/docs/atlas/reference/alert-resolutions/atlas-search-alerts.md#std-label-atlas-search-alerts) |
| Delete in Progress | Atlas is deleting the index from the cluster nodes. |

While Atlas builds the index and after the build completes, the Documents column shows the percentage and number of documents indexed. The column also shows the total number of documents in the collection.
