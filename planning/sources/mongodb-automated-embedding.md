> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  other tabs: atlas, self
-->

# Automated Embedding Overview

### Atlas

You can configure MongoDB Vector Search to automatically generate and manage vector embeddings for the text data in your Atlas cluster. When you enable Automated Embedding, MongoDB Vector Search automatically generates embeddings using the specified Voyage AI embedding model at index-time for the specified text field in your collection and at query-time for the text string in your query.

Automated Embedding simplifies the process of building semantic search. You don't need to generate, store, or manage vector embeddings yourself. Atlas handles embedding generation, updates, and querying natively.

**Note:**

When you use Automated Embedding, MongoDB Vector Search stores generated vector embeddings on your cluster.

When you use Automated Embedding on dedicated clusters (`M10+`), you must enable storage auto-scaling. If your cluster runs out of disk space, MongoDB Vector Search pauses embedding generation and the index transitions to Stale state. Once the disk space is freed up, MongoDB Vector Search resumes embedding generation.

## Enable and Use Automated Embedding

### Atlas

To enable Automated Embedding, you create a MongoDB Vector Search index using the `autoEmbed` type. The `autoEmbed` type specifies the field for which you want to enable Automated Embedding and the embedding model that you want to use. You can also include one or more fields to pre-filter your data using the `filter` type.

```json
{
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
    },
    ...
  ]
}
```

To learn more about the index syntax and fields, see [How to Index Fields for Vector Search.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-avs-types-vector-search)

MongoDB Vector Search automatically generates embeddings for existing and new documents that you insert or update.

Once you've created the index, you can run your queries. MongoDB Vector Search automatically generates embeddings for your query text using the same embedding model that you specified in the index. You can optionally specify a different embedding model using the `model` option in the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) pipeline stage, but the specified embedding model must be compatible with the embedding model used at index-time.

```json
[
  {
    "$vectorSearch": {
      "index": "<index-name>",
      "path": "<field-to-index>",
      "query": "<query-text>",
      "model": "<embedding-model>"
    }
  },
  {
    "$project": {
      "_id": 0,
      "<field-to-index>": 1,
      "score": { "$meta": "vectorSearchScore" }
    }
  }
]
```

To learn more, see [Run Vector Search ANN and ENN Queries.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-return-vector-search-results)

## Embeddings Storage

Automated embedding indexes generate vector embeddings asynchronously and persist to your MongoDB cluster on a separate reserve database. Each Automated Embedding index has exactly one corresponding generated embeddings collection. The generated embeddings collection is stored in a dedicated internal database on the same cluster.

To learn more, see [Generated Embeddings Collection.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview.md#std-label-auto-embed-materialized-views)

## Available Models

MongoDB Vector Search integrates with Voyage AI's state-of-the-art embedding models, each optimized for specific use-case:

| Embedding Model | Description | Price Per 1M Tokens |
| --- | --- | --- |
| `voyage-4-lite` | Optimized for high-volume, cost-sensitive applications. | $0.02 |
| `voyage-4` | (**Recommended**) Balanced performance for general text search. | $0.06 |
| `voyage-4-large` | Maximum accuracy for complex semantic relationships. | $0.12 |
| `voyage-code-4` | (**Recommended for code**) Specialized for code search and technical documentation. | $0.12 |
| `voyage-code-3` | Legacy model specialized for code search and technical documentation. Use `voyage-code-4` instead. | $0.18 |

**Note:**

`voyage-code-4` requires an Atlas deployment. On self-managed deployments, use `voyage-code-3` for code search and technical documentation.

To learn more, see [Models for Automated Embedding.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-avs-auto-embeddings-model-ecosystem)

## Key Concepts

embedding model

Embedding models are algorithms that convert data into vector embeddings that capture your data's semantic, or underlying, meaning. These vectors enable vector search.

To learn more about the embedding models for Automated Embedding, see [Available Models.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding.md#std-label-auto-embed-supported-models)

vector embeddings

A vector embedding is an array of numbers, with each dimension representing a different feature or attribute of your data. Vectors can be used to represent any type of data, from text, images, and video to unstructured data. You create vector embeddings by passing your data through an embedding model, and you can store these embeddings in a database that supports vector embeddings like MongoDB.

To learn more about the embeddings storage for Automated Embedding, see [Generated Embeddings Collection.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview.md#std-label-auto-embed-materialized-views)

tokens

In the context of embedding models and LLMs, tokens are the fundamental units of text, such as words, subwords, or characters that the model processes to create embeddings or generate text. Tokens are how you are billed for usage of embedding models and LLMs.

To learn more about tokens for Automated Embedding, see [Manage Billing for Automated Embedding.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/billing.md#std-label-auto-embed-billing)

rate limits

Rate limits are restrictions imposed by API providers on the number of requests a user can make within a specific time frame, often measured in tokens per minute (TPM) or requests per minute (RPM). These limits ensure fair usage, prevent abuse, and maintain the stability and performance of the service for all users.

To learn more about rate limits for Automated Embedding, see [Rate Limits.](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models.md#std-label-auto-embed-rate-limits)

quantization

Quantization reduces the precision of vector embeddings to decrease memory and storage usage, with trade-offs in search accuracy. For Automated Embedding, MongoDB Vector Search supports the following quantization types:

| Quantization Type | Description |
| --- | --- |
| `float` | Stores the vector embeddings as 32-bit float values. |
| `scalar` | Reduces each vector dimension from 32-bit float to 8-bit integer. |
| `binary` | Reduces each vector dimension to a single bit and rescores the top results. |
| `binaryNoRescore` | Reduces each vector dimension to a single bit without rescoring. |

To learn more about the quantization for Automated Embedding, see [About Quantization.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-quantization-auto)

number of dimensions

The number of dimensions specifies the length of the embedding vector for each document (how many numbers are in the array). Higher dimensions capture more semantic detail and generally improve retrieval accuracy, but increase storage and compute costs (index size, RAM usage, and sometimes latency).

To learn more, see [`numCandidates` Selection.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#std-label-avs-num-candidates)

similarity

The similarity function is used to measure the similarity between two vectors or the closeness of a query vector to the vectors in the index. MongoDB Vector Search supports the following similarity functions:

- `cosine` - measures similarity based on the angle between vectors. We recommend this similarity function for unnormalized vectors like `scalar` quantization.

- `dotProduct` - measures similarity like `cosine`, but takes into account the magnitude of the vector. We recommend this similarity function for normalized vectors like float (full fidelity) quantization.

- `euclidean` - measures the distance between ends of vectors. We recommend this similarity function for `binary` or `binaryNoRescore` quantization, where vectors are compressed and distance in Hamming or Euclidean space is the right signal.

To learn more about the similarity functions for Automated Embedding, see [About the Similarity Functions.](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type.md#std-label-mdb-vs-similarity-functions-auto)
