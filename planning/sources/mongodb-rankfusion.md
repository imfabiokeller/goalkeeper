> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  drivers: shell, csharp, nodejs
-->

# $rankFusion (aggregation)

**Important:**

`$rankFusion` is only available for deployments that use MongoDB 8.0 and later.

When you upgrade from 8.0, you might have to pause executing `$rankFusion` queries.

## Definition

`$rankFusion` first executes all input pipelines independently and then de-duplicates and combines the input pipeline results into a final ranked results set.

`$rankFusion` outputs a ranked set of documents based on the ranks the input documents appear in their input pipelines and the pipeline weights. This stage uses the [Reciprocal Rank Fusion](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion.md#std-label-rankFusion-rrf) algorithm to rank the combined results of the input pipelines.

Use `$rankFusion` to search for documents in a single collection based on multiple criteria and retrieve a final ranked results set that factors in all specified criteria.

## Syntax

The stage has the following syntax:

```javascript
{ $rankFusion: {
    input: {
         pipelines: {
             <myPipeline1>: <expression>,
             <myPipeline2>: <expression>,
             ...
         }
     },
     combination: {
         weights: {
             <myPipeline1>: <numeric expression>,
             <myPipeline2>: <numeric expression>,
             ...
         }
     },
     scoreDetails: <bool>
 } }
```

### Command Fields

`$rankFusion` takes the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `input` | Object | Defines the input that `$rankFusion` ranks. |
| `input.``pipelines` | Object | Contains a map of pipeline names to the aggregation stages that define that pipeline. `input.pipelines` must contain at least one pipeline. All pipelines must operate on the same collection and must have a unique name. For more information on input pipeline restrictions, see [Input Pipelines](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion.md#std-label-rankFusion-input-pipelines) and [Input Pipeline Names.](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion.md#std-label-rankFusion-pipeline-names) |
| `combination` | Object | Optional. Defines how to combine the `input` pipeline results. |
| `combination.``weights` | Object | Optional. Contains a map from `input` pipeline names to their weights relative to other pipelines. Each weight value must be a non-negative number (whole, or decimal). If you do not specify a weight, the default value is 1. |
| `scoreDetails` | Boolean | Default is false. Specifies if `$rankFusion` computes and populates the `$scoreDetails` metadata field for each output document. See [scoreDetails](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion.md#std-label-rankFusion-scoreDetails) for more information on this field. |

## Behavior

### Collections

You can only use `$rankFusion` with a single collection. You cannot use this aggregation stage at a database scope.

### De-Duplication

`$rankFusion` de-duplicates the results across multiple input pipelines in the final output. Each unique input document appears at most once in the `$rankFusion` output, regardless of the number of times that the document appears in input pipeline outputs.

### Input Pipelines

Each `input` pipeline must be both a Selection Pipeline and a Ranked Pipeline.

#### Selection Pipeline

A Selection Pipeline retrieves a set of documents from a collection without performing any modifications after retrieval. `$rankFusion` compares documents across different input pipelines which requires that all input pipelines output the same unmodified documents.

**Note:**

If you want to modify the documents that you search for with `$rankFusion`, perform those modifications after the `$rankFusion` stage.

A selection pipeline must only contain the following stages:

| Type | Stages |
| --- | --- |
| Search Stages | [`$match`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/match.md#mongodb-pipeline-pipe.-match), including `$match` with [legacy text search](https://www.mongodb.com/docs/manual/core/text-search/on-prem.md#std-label-perform-text-search-onprem); [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search); [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch); [`$sample`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample.md#mongodb-pipeline-pipe.-sample); [`$geoNear`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geonear.md#mongodb-pipeline-pipe.-geoNear) If you use `$geoNear` in a selection pipeline, you cannot specify `includeLogs` or `distanceField` because those fields modify documents. |
| Ordering Stages | [`$sort`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort.md#mongodb-pipeline-pipe.-sort) |
| Pagination Stages | [`$skip`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip.md#mongodb-pipeline-pipe.-skip); [`$limit`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit.md#mongodb-pipeline-pipe.-limit) |

#### Ranked Pipeline

A ranked pipeline sorts or orders documents. `$rankFusion` uses the order of ranked pipeline results to influence the output ranking. Ranked pipelines must meet one of the following criteria:

- Begin with one of the following ordered stages:

  - [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search)

  - [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch)

  - [`$geoNear`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geonear.md#mongodb-pipeline-pipe.-geoNear)

- Contain an explicit [`$sort`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort.md#mongodb-pipeline-pipe.-sort) stage.

### Input Pipeline Names

Pipeline names in `input` must meet the following restrictions:

- Must not be an empty string

- Must not start with a `$`

- Must not contain the ASCII null character delimiter `\0` anywhere in the string

- Must not contain a `.`

### Reciprocal Rank Fusion (RRF) Formula

`$rankFusion` orders results according to the Reciprocal Rank Fusion (RRF) Formula. This stage places the RRF score for each document in the `score` metadata field of the output results. The RRF formula ranks documents with a combination of the following factors:

- The placement of documents in input pipeline results

- The number of times that a document appears in different input pipelines

- The `weights` of input pipelines.

For example, if a document has a high ranking in multiple pipeline result sets, the RRF score for that document would be higher than if that same document has the same ranking in some input pipelines, but is not present (or has a lower ranking) in the other pipelines

The  Reciprocal Rank Fusion (RRF) Formula is equivalent to the following algebraic operation:

![The reciprocal rank fusion formula](/images/rrf-score.png)

**Note:**

In this formula, 60 is a sensitivity parameter that MongoDB determined.

The below table contains the variables that the RRF formula uses:

| Variable | Description |
| --- | --- |
| D | The set of result documents for the whole operation. |
| d | The document that the RRF score is being computed for. |
| R | The set of ranks for input pipelines that `d` appears in. |
| r(d) | The rank of document `d` in this input pipeline. |
| w | The weight of the input pipeline that `d` appears in. |

Each term in the summation represents the appearance of a document `d` in one of the `input` pipelines. The total RRF score for `d` is the summation of each of these terms across all the input pipelines that `d` appears in.

#### RRF Calculation Example

Consider a `$rankFusion` pipeline stage with one `$search` and one `$vectorSearch` input pipeline.

All input pipelines output the same 3 documents: `Document1`, `Document2`, and `Document3`.

The `$search` pipeline ranks the documents in the following order:

1. `Document3`

2. `Document2`

3. `Document1`

The `$vectorSearch` pipeline ranks the documents in the following order:

1. `Document1`

2. `Document2`

3. `Document3`.

`rankFusion` computes the RRF score for `Document1` through the following operation:

```none
RRFscore(Document1) = 1/(60 + search_rank_of_Document1) + (1/(60 + vectorSearch_rank_of_Document1))
RRFscore(Document1) = 1/63 + 1/61
RRFscore(Document1) = 0.0322664585
```

The `score` metadata field for `Document1` is `0.0322664585`.

### scoreDetails

If you set `scoreDetails` to `true`, `$rankFusion` creates a `scoreDetails` metadata field for each document. The `scoreDetails` field contains information about the final ranking.

**Note:**

When you set `scoreDetails` to `true`, `$rankFusion` sets the `scoreDetails` metadata field for each document but does not automatically output the `scoreDetails` metafield.

To view the `scoreDetails` metadata field, you must either:

- use a [`$project`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/project.md#mongodb-pipeline-pipe.-project) stage after `$rankFusion` to project the `scoreDetails` field

- use a [`$addFields`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/addfields.md#mongodb-pipeline-pipe.-addFields) stage after `$rankFusion` to add the `scoreDetails` field to your pipeline output

The `scoreDetails` field contains the following subfields:

| Field | Description |
| --- | --- |
| `value` | The numerical value of the RRF (Reciprocal Rank Fusion) score for this document. |
| `description` | A description of how `$rankFusion` computed the RRF (Reciprocal Rank Fusion) score. |
| `details` | An array where each array entry contains information about the input pipelines that output this document. |

Each array entry in the `details` field contains the following subfields:

| Field | Description |
| --- | --- |
| `inputPipelineName` | The name of the input pipeline that output this document. |
| `rank` | The rank of this document in the input pipeline. Rank is `N/A` in a pipeline stage output if a document that is returned in other pipeline stage output is not present in this pipeline stage's output. |
| `weight` | The weight of the input pipeline. |
| `value` | Optional. If the input pipeline outputs a `{ $meta: 'score' }` for this document, `value` contains `{ $meta: 'score' }`. |
| `description` | Optional. If the input pipeline outputs a `description` field as part of the `scoreDetails` for this document, `details.description` contains that field value. |
| `details` | The `scoreDetails` field of the input pipeline. If the input pipeline does not output a `scoreDetails` field, this field is an empty array. |

**Warning:**

MongoDB does not guarantee any specific output format for `scoreDetails`.

For example, the following code blocks shows the `scoreDetails` field for a `$rankFusion` operation with `$search`, `$vectorSearch`, and `$match` input pipelines:

```js
{
   value: 0.030621785881252923,
   description: "value output by reciprocal rank fusion algorithm, computed as sum of weight * (1 / (60 + rank)) across input pipelines from which this document is output, from:"
   details: [
         {
            inputPipelineName: 'search',
            rank: 2,
            weight: 1,
            value: 0.3876491287,
            description: "sum of:",
            details: [... omitted for brevity in this example ...]
         },
         {
            inputPipelineName: 'vector',
            rank: 9,
            weight: 3,
            value: 0.7793490886688232,
            details: [ ]
         },
         {
            inputPipelineName: 'match',
            rank: 10,
            weight: 1,
            details: []
         }
   ]
 }
```

### Explain Results

MongoDB converts `$rankFusion` operations into a set of existing aggregation stages that, in combination, compute the output result prior to query execution. The [Explain Results](https://www.mongodb.com/docs/manual/reference/explain-results.md#std-label-explain-results) for a `$rankFusion` operation show the full execution of the underlying aggregation stages that `$rankFusion` uses to compose the final result.

## Examples

### MongoDB Shell

This example uses a collection with embeddings and text fields. Create `search` and `vectorSearch` type indexes on the collection.

The following index definition automatically indexes all the dynamically indexable fields in the collection for running [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) queries against the indexed fields.

```js
db.embedded_movies.createSearchIndex(
   "search_index",
   {
      mappings: { dynamic: true }
   }
)
```

The following index definition indexes the field with the embeddings in the collection for running [`$vectorSearch`](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage.md#mongodb-pipeline-pipe.-vectorSearch) queries against that field.

```js
db.embedded_movies.createSearchIndex(
   "vector_index",
   "vectorSearch",
   {
      "fields": [
         {
            "type": "vector",
            "path": "<FIELD_NAME>",
            "numDimensions": <NUMBER_OF_DIMENSIONS>,
            "similarity": "dotProduct"
         }
      ]
   }
);
```

The following aggregation pipeline uses `$rankFusion` with the following input pipelines:

| Pipeline | Number of Documents Returned | Description |
| --- | --- | --- |
| `searchOne` | 20 | Runs a vector search on the field indexed as `vector` type for the term specified as embeddings. The query considers up to 500 nearest neighbors, but limits the results to 20 documents. |
| `searchTwo` | 20 | Runs a full-text search for the same term and limits the results to 20 documents. |

```js
db.embedded_movies.aggregate( [
   {
      $rankFusion: {
         input: {
            pipelines: {
               searchOne: [
                  {
                     "$vectorSearch": {
                        "index": "<INDEX_NAME>",
                        "path": "<FIELD_NAME>",
                        "queryVector": <QUERY_EMBEDDINGS>,
                        "numCandidates": 500,
                        "limit": 20
                     }
                  }
               ],
               searchTwo: [
                  {
                     "$search": {
                        "index": "<INDEX_NAME>",
                        "text": {
                           "query": "<QUERY_TERM>",
                           "path": "<FIELD_NAME>"
                        }
                     }
                  },
                  { "$limit": 20 }
               ],
            }
         }
      }
   },
   { $limit: 20 }
] )
```

This operation performs the following actions:

- Executes the `input` pipelines

- Combines the returned results

- Outputs the first 20 documents which are the top 20 ranked results of the `$rankFusion` pipeline
