> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

# How to Perform Hybrid Search

A hybrid search is an aggregation of different search methods or search queries for the same or similar query criteria. This technique uses algorithms to rank results and return unified results from the different methods of search. You can use [`$rankFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion.md#mongodb-pipeline-pipe.-rankFusion) and [`$scoreFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/scoreFusion.md#mongodb-pipeline-pipe.-scoreFusion) to perform a hybrid search.

## What is Reciprocal Rank Fusion?

Reciprocal rank fusion is a technique to combine results from different search methods into a single result set by performing the following actions:

1. Calculate the reciprocal rank of the documents in the results.

   For each ranked document in each search result, first add the rank (`r`) of the document with a constant number, `60`, to smooth the score (`rank_constant`), and then divide `1` by the sum of `r` and `rank_constant` for the reciprocal rank of the document in the results. You cannot set the value of `rank_constant` and it defaults to `60`.

   ```shell
   reciprocal_rank = 1 / ( r + rank_constant )
   ```

   For each method of search, apply different weights (`w`) to give more importance to that method of search. For each document, the weighted reciprocal rank is calculated by multiplying the weight by the reciprocal rank of the document.

   ```shell
   weighted_reciprocal_rank = w x reciprocal_rank
   ```

2. Combine the rank-derived and weighted scores of the documents in the results.

   For each document across all search results, add the calculated reciprocal ranks for a single score for the document.

3. Sort the results by the combined score of the documents in the results.

   Sort the documents in the results based on the combined score across the results for a single, combined ranked list of documents in the results.

## What is Relative Score Fusion?

Relative score fusion is a technique to combine results from different search methods into a single result set by using the actual relevance scores from each pipeline — rather than the rank position of documents. This gives fine-grained control over how scores from different retrieval methods are normalized, weighted, and merged. You can use [`$scoreFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/scoreFusion.md#mongodb-pipeline-pipe.-scoreFusion) to perform hybrid search using relative score fusion.

Relative score fusion combines results by performing the following actions:

Normalize the scores from each pipeline.

For each document in each pipeline's results, normalizes the raw score to a common scale using the normalization parameter. Score scales differ significantly across retrieval methods — for example, vector search scores are typically between `0` and `1`, while full-text BM25 scores can range much higher. Normalization brings scores from different pipelines onto a comparable scale before combining them. Three normalization methods are supported:

- `none` — Scores are combined as-is without normalization. Use when all pipelines already produce scores on comparable scales.

- `sigmoid` — Applies the sigmoid function to each score, mapping scores to the range (`0, 1`) without considering the distribution of other scores in the result set:

  ```shell
  normalized_score = 1 / (1 + e⁻ˢ)
  ```

- `minMaxScaler` — Applies min-max scaling using the minimum and maximum scores observed across the result set, mapping the lowest score to `0` and the highest to `1`:

  ```shell
  normalized_score = (s - min_s) / (max_s - min_s)
  ```

Apply weights to each pipeline's normalized scores.

For each pipeline, multiplies each document's normalized score by the pipeline's weight `w`. Weights default to `1` if not specified. Use weights to give more importance to one search method over another.

```shell
weighted_score = w x normalized_score
```

Combine the weighted scores for each document.

For each document that appears across all search results, combines the weighted scores from all pipelines in which that document appeared. The default combination method is `avg`, which averages the weighted scores. Use expression to define custom combination logic.

Sort the results by the combined score.

Sorts all documents in the results based on their combined score across all pipelines to produce a single, unified ranked list.

## About the Different Hybrid Search Use Cases

You can use MongoDB Vector Search to perform several types of hybrid search. Specifically, MongoDB Vector Search supports the following use cases:

- Full-text and vector search in a single query: You can combine results from different search methods, such as a semantic and a full-text search. You can use the [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) for the semantic search and the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) for the full-text search results and combine the results by using the reciprocal rank fusion technique. To learn more, see the [Perform Hybrid Vector and Full-Text Search](https://www.mongodb.com/docs/vector-search/hybrid-search/vector-search-with-full-text-search.md#std-label-avs-reciprocal-rank-fusion) tutorial, which demonstrates how to perform a semantic search and full-text search against the `sample_mflix.embedded_movies` namespace and retrieve combined ranked results by using reciprocal rank fusion.

  Alternatively, for a more granular hybrid search where the score matters in addition to the relative ordering of results, you can use the `$scoreFusion` pipeline stage. To learn more, see the [Perform Hybrid Vector and Full-Text Search](https://www.mongodb.com/docs/vector-search/hybrid-search/vector-search-with-full-text-search.md#std-label-avs-reciprocal-rank-fusion) tutorial, which demonstrates how to perform a semantic search and full-text search against the `sample_mflix.embedded_movies` namespace and retrieve input pipeline results into a final scored results set.

  While `$rankFusion` ranks documents based on their positions (relative ranks) in input pipelines using the Reciprocal Rank Fusion algorithm, `$scoreFusion` ranks documents based on scores assigned by the input pipelines, using mathematical expressions for combining the results.

  In `$rankFusion`, rankings are influenced by pipeline weights. In `$scoreFusion`, weights control the contribution of each pipeline's scores to the final result.

  Furthermore, to reorder the documents in the results based on relevance to the query, you can use the [`$rerank`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/rerank.md#mongodb-pipeline-pipe.-rerank) stage after the `$rankFusion` or `$scoreFusion` stage. To learn more, see [`$rerank` Aggregation Pipeline Stage.](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/rerank.md#std-label-rerank-agg-pipeline)

- Multiple vector search queries in a single query: The MongoDB `$rankFusion` pipeline supports multiple sub-pipelines that contain vector search queries executed against the same collection and combining their results using the reciprocal rank fusion technique. The [How to Combine Multiple `$vectorSearch` Queries](https://www.mongodb.com/docs/vector-search/hybrid-search/vector-search-with-rankfusion.md#std-label-avs-with-unionwith) tutorial demonstrates the following types of vector search:

  - Perform a comprehensive search of your dataset for semantically similar terms in the same query.

  - Search multiple fields in your dataset to determine which fields return the best results for the query.

  - Search using embeddings from different embedding models to determine the semantic interpretation differences between the different models.

## Considerations

When using the `$rankFusion` or `$scoreFusion` pipeline stage for hybrid search, consider the following.

### Disjoint Result Sets

If you want to capture false negatives that one search methodology could not catch, having disjoint results from individual sub-pipelines might be acceptable. When you have disjoint results, most or all of the results might appear to be returned from one of the pipelines and not the other. However, if you want all the sub-pipelines to return similar results, try increasing the number of results per sub-pipeline.

### Weights

MongoDB recommends weighing lexical and vector queries on a per-query basis rather than having static weights for all queries to improve the relevance of the results for each query. This also improves computation resource usage by allocating resources on the query that needs it most.

### Multiple Pipelines

You can combine an arbitrary number of sub-pipelines together in the `$rankFusion` or `$scoreFusion` stage, but they must all execute against the same collection. You cannot use the `$rankFusion` or `$scoreFusion` stage to search across collections. Use the [`$unionWith`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith.md#mongodb-pipeline-pipe.-unionWith) stage with [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) for cross-collection search.

### Non-Search Pipelines

MongoDB recommends using [`$match`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/match.md#mongodb-pipeline-pipe.-match), [`$sort`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort.md#mongodb-pipeline-pipe.-sort), and so on in your pipeline to boost on specific fields within your collection without requiring a search pipeline.

### Geospatial Relevance

You can use the [`$geoNear`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear.md#mongodb-pipeline-pipe.-geoNear) and the [near](https://www.mongodb.com/docs/search/query/operators-collectors/near.md#std-label-near-ref) operator inside [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) for a geographic location search within the `$rankFusion` or `$scoreFusion` stage. However, the [`$geoNear`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear.md#mongodb-pipeline-pipe.-geoNear) and the [near](https://www.mongodb.com/docs/search/query/operators-collectors/near.md#std-label-near-ref) operator use different coordinate reference frames. Therefore, the result ordinals and scores might not be identical.

### Limit the Results

MongoDB recommends setting limits for the number of results to return for each sub-pipeline. If the pipeline stage inside the [`$rankFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion.md#mongodb-pipeline-pipe.-rankFusion) or [`$scoreFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/scoreFusion.md#mongodb-pipeline-pipe.-scoreFusion) input pipeline does not support limiting the number of results (such as [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search)), MongoDB recommends that you use [`$limit`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit.md#mongodb-pipeline-pipe.-limit) subsequently inside the input pipeline to limit the number of documents that [`$rankFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion.md#mongodb-pipeline-pipe.-rankFusion) or [`$scoreFusion`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/scoreFusion.md#mongodb-pipeline-pipe.-scoreFusion) evaluates.

### Advanced Pre-Filters

MongoDB recommends using [vectorSearch (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md#std-label-fts-vectorSearch-ref) if you want to pre-filter data for vector search using [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) operators that include analyzed text capabilities such as fuzzy search, phrase matching, location filtering, wildcard pattern matching, and so on.

## Limitations

The following limitations apply to hybrid search using `$rankFusion` and `$scoreFusion`:

- `$rankFusion` is supported only on MongoDB 8.0 and later (including the latest version with auto upgrades). `$scoreFusion` is available on v8.3 and later.

  **Note:**

  To use `$scoreFusion`, your cluster must run MongoDB v8.3 or later. When you upgrade from 8.0, you might have to pause executing `$rankFusion` queries.

- `$rankFusion` and `$scoreFusion` sub-pipelines can contain only the following stages:

  - [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search)

  - [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch)

  - [`$match`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/match.md#mongodb-pipeline-pipe.-match)

  - [`$sort`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort.md#mongodb-pipeline-pipe.-sort)

  - [`$geoNear`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear.md#mongodb-pipeline-pipe.-geoNear)

- `$rankFusion` and `$scoreFusion` preserve a traceable link back to the original input document for each sub-pipeline. Therefore, they do not support the following:

  - [`$project`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/project.md#mongodb-pipeline-pipe.-project) stage

  - [storedSource](https://www.mongodb.com/docs/search/indexes/stored-source-definition.md#std-label-fts-stored-source-definition) fields

- `$rankFusion` and `$scoreFusion` sub-pipelines run serially, not in parallel.

- `$rankFusion` and `$scoreFusion` do not support pagination.

- `rankFusion` can be run on [Views](https://www.mongodb.com/docs/manual/core/views.md#std-label-views-landing-page) only on clusters running MongoDB 8.0 or later. You cannot run `rankFusion` within a view definition or on a time series collection.

## Prerequisites

To try these tutorials, you must have the following:

- A cluster with MongoDB version v8.0 or later. To use `$scoreFusion` or `$rerank`, your cluster must run MongoDB v8.3 or later.

  **Note:**

  **For Automated Embedding**, your cluster auto-scaling must be enabled with the following settings:

  - If your current cluster tier is `M10` or `M20` (burst-able CPU instances), set a maximum instance size of `M30` or larger.

  - If your current cluster tier is `M30` or larger, set the maximum instance size to a tier that is larger than your current tier.

  - For clusters using NVMe storage, select the Scale NVME cluster tier when storage is running low option.

  - For Free (`M0`) and Flex tier clusters, no further action is required.

  **For running the $rerank queries**, you must enable Native Reranking in the Atlas UI. To learn more, see [Enable Native Reranking.](https://www.mongodb.com/docs/vector-search/query/native-reranking/managing.md#std-label-native-reranking-management)

- The [`Project Data Access Admin`](https://www.mongodb.com/docs/atlas/reference/user-roles.md#mongodb-authrole-Project-Data-Access-Admin) access to the project to create MongoDB Vector Search and MongoDB Search indexes.

- The `sample_mflix` database loaded into your cluster. To learn more, see [Load Sample Data.](https://www.mongodb.com/docs/atlas/sample-data/)

- [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) or MongoDB Compass to create the indexes and try the queries on your cluster.

  **Note:**

  You can also try these hybrid search use cases with local Atlas deployments that you create with the Atlas CLI and in your self-managed (on-premises) deployments. To learn more, see [Create a Local Atlas Deployment.](https://www.mongodb.com/docs/atlas/cli/current/atlas-cli-deploy-local/)

-
