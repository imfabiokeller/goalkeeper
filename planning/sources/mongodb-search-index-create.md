> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

<!--
Tab options on this page. Append to the .md URL to filter:
  ?tabs=<id,...>   select specific tabs (e.g. ?tabs=nodejs,shell)
  ?allTabs=true    include every tab
  (no param)       default: one tab per tabset

Available tabs:
  other tabs: dynamic-mappings-syntax, static-mappings-syntax, analyzers-syntax, custom-analyzers-syntax, synonyms-syntax, scoring-syntax, numPartitions-syntax, storedSource-syntax, search-equals-operator, searchMeta-equals-operator, count-option, facet-collector
-->

# Queries and Indexes

The relationship between search queries and search indexes dictates how efficiently and effectively you can find data within your MongoDB collections using MongoDB Search.

MongoDB Search queries specify the criteria for finding documents within a database. MongoDB Search queries take the form of an [aggregation pipeline](https://www.mongodb.com/docs/manual/aggregation.md#std-label-aggregation) that begins with the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) or [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) pipeline stage. You can use [operators](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-operators), [collectors](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-collectors), and [search options](https://www.mongodb.com/docs/search/query/search-options.md#std-label-fts-search-options) inside the pipeline stages to implement complex search functionality like full-text search, relevance-based ranking, faceted search, filtering, and sorting.

Before you can run a MongoDB Search query, you must create a MongoDB Search index on the fields that you want to search. Search indexes are data structures that are optimized to quickly retrieve documents that meet the search criteria of your query. When you define a search index, you specify which fields to index and how these fields should be tokenized.

Effective search queries depend on properly defined search indexes. The fields you intend to search must be indexed, and your index configuration determines whether your search supports sorting, faceting, autocomplete, and other search functionality. You can iterate on both query and index design to balance search accuracy with performance.

This page describes how to plan your MongoDB Search search experience and define a MongoDB Search index and query to fit your search requirements.

## Plan Your Search Experience

When planning your MongoDB Search implementation, start by defining the search experience you want to deliver:

- Clearly identify what types of searches your application needs to perform. Are you building a search feature for a blog website that needs full-text search and autocomplete for article titles, or an e-commerce site that requires faceted search and filtering by product categories?

- Determine how users will interact with your application. Prioritize features that will enhance the user experience, such as quick response times or accurate autocomplete suggestions.

Then, consider the following questions to help determine the structure of your MongoDB Search indexes and queries based on those user needs:

### What are your users searching for?

#### Choose between returning document content or search metadata.

Consider whether your application users want to return the content of documents or metadata about your documents:

- If users want document content, use the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) aggregation stage to return documents that match their search criteria.

- If users want metadata about their search results, use the [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) stage to return customizable counts of matching documents and facets.

### Which fields in your documents contain likely search terms?

#### Determine which fields to index based on which fields contain the data your users want to find.

Identify the specific fields within your collections that users are likely to search so that you know which fields to index. Each MongoDB Search query searches a single MongoDB Search index, which contains terms that are extracted from one or more specified fields within a collection. When planning your MongoDB Search queries, decide whether to index only key fields or every field in your specified collection by enabling [static or dynamic mapping](https://www.mongodb.com/docs/search/indexes/define-field-mappings.md#std-label-static-dynamic-mappings). You can query across multiple fields by specifying the [query path](https://www.mongodb.com/docs/search/query/path-construction.md#std-label-ref-path-intro) as an array of fields, or by using the [queryString](https://www.mongodb.com/docs/search/query/operators-collectors/querystring.md#std-label-querystring-ref) operator.

### How closely should users' search terms match your data?

#### Choose search operators based on whether your users' common search terms are exact, similar, or partial matches for your data.

Your users' common search terms may be **exact**, **similar** , or **partial** matches for the data in your cluster. For example, users of a movie review application may want to filter for movies from an *exact* year, or see movie recommendations that are *similar* to their favorite film.

Determine the type of matches your users are searching for to inform which [operators](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-operators) to use in your MongoDB Search queries:

- For **exact** matches, use operators like [equals](https://www.mongodb.com/docs/search/query/operators-collectors/equals.md#std-label-equals-ref) or [in](https://www.mongodb.com/docs/search/query/operators-collectors/in.md#std-label-in-ref) to match documents that contain terms that are identical to the specified `query` value. You can also use the [text](https://www.mongodb.com/docs/search/query/operators-collectors/text.md#std-label-text-ref) operator to match documents that contain `any` or `all` of the strings in the `query` value.

- For **similar** matches, use operators like [near](https://www.mongodb.com/docs/search/query/operators-collectors/near.md#std-label-near-ref), [moreLikeThis](https://www.mongodb.com/docs/search/query/operators-collectors/morelikethis.md#std-label-more-like-this-ref), or [phrase](https://www.mongodb.com/docs/search/query/operators-collectors/phrase.md#std-label-phrase-ref) to match documents that contain numeric values, documents, or string orderings that are similar to the specified search terms. You can also use the [range](https://www.mongodb.com/docs/search/query/operators-collectors/range.md#std-label-range-ref) operator to match documents that contain a value within a specified range of values.

- For **partial** matches, such as search-as-you-type queries, use operators like [autocomplete](https://www.mongodb.com/docs/search/query/operators-collectors/autocomplete.md#std-label-autocomplete-ref), [regex](https://www.mongodb.com/docs/search/query/operators-collectors/regex.md#std-label-regex-ref), or [wildcard](https://www.mongodb.com/docs/search/query/operators-collectors/wildcard.md#std-label-wildcard-ref) to implement search-as-you-type functionality or match terms using regular expressions.

- Use the [compound](https://www.mongodb.com/docs/search/query/operators-collectors/compound.md#std-label-compound-ref) operator to blend multiple matching behaviors in a single query.

### Do you need advanced text analysis?

#### Use text analysis tools if your application requires text normalization, multi-language support, or more.

For applications that require text normalization, multi-language support, stemming, or more, leverage MongoDB Search text analysis tools:

- Choose a [built-in analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/overview.md#std-label-ref-built-in-analyzers) in your index definition to match the language and nature of your text data. Analyzers break text into terms or tokens and can adjust text to remove punctuation and capitalization, convert words to their root form, and more.

- Configure [custom analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/custom.md#std-label-custom-analyzers) if your application has specific requirements like handling domain-specific jargon or parsing formatted text like email addresses or dash-separated IDs. Custom analyzers enable you to filter text by character, define the number of characters to include in each token chunk, or enable stemming or redaction.

- Define [synonyms](https://www.mongodb.com/docs/search/indexes/synonyms.md#std-label-synonyms-ref) to improve search accuracy for terms with the same or similar meanings.

### How do you want to present search results?

#### Use search options to implement filtering, sorting, or relevancy demands for your search results.

You can adjust the presentation of search results based on your users' filtering, sorting, or relevancy demands:

- Use the [score](https://www.mongodb.com/docs/search/query/score/overview.md#std-label-scoring-ref) query option to modify the relevance score of documents and affect the order in which users view results. MongoDB Search queries associate a relevance-based score with every document in the result set, and returns documents in order from the highest to the lowest score.

- Set the [sort](https://www.mongodb.com/docs/search/query/sort.md#std-label-sort-ref) query option for indexed fields that users are likely to sort in ascending or descending order, such as dates or numeric fields.

- Use the [searchBefore or searchAfter](https://www.mongodb.com/docs/search/query/paginate-results.md#std-label-fts-paginate-results) query options to display results as a set of pages that users can navigate sequentially or skip through.

- Use the [`facet` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/facet.md#std-label-fts-facet-ref) collector to allow users to filter results by categories or other dimensions. This can significantly improve the relevance of search results, offering users a more guided search experience.

### How can you optimize search performance?

#### Adjust your index and query configuration to optimize your search performance.

MongoDB Search query performance is affected by your index configuration and the complexity of your queries. Focus on indexing fields that are critical to your application's search functionality and aim for a logical balance between query complexity and speed.

To further optimize performance, consider the following query options:

- Use the [concurrent](https://www.mongodb.com/docs/search/query/concurrent-query.md#std-label-concurrent-ref) query option to set the number of concurrent search requests that are executed when evaluating a query. This option is useful for complex queries or large datasets.

- Use the [returnStoredSource](https://www.mongodb.com/docs/search/query/return-stored-source.md#std-label-fts-return-stored-source-option) query option in combination with the [storedSource](https://www.mongodb.com/docs/search/indexes/stored-source-definition.md#std-label-fts-stored-source-definition) index option to determine whether to return original source documents, stored as part of the index, alongside the search results. This option is useful for applications where you display summaries or highlights based on search criteria.

- Use the [numPartitions](https://www.mongodb.com/docs/search/indexes/index-partition.md#std-label-fts-index-partition) index option to partition your index, distributing index objects between sub-indexes in an optimal way.

For more recommendations on how to optimize your query performance, see [MongoDB Search Query Performance.](https://www.mongodb.com/docs/search/performance/query-performance.md#std-label-query-perf)

## Define Your Index

Before you can search your data using MongoDB Search, you must create one or more MongoDB Search indexes to be used during your MongoDB Search query. This section demonstrates how to apply your query preferences to the JSON (Javascript Object Notation) configuration syntax of a MongoDB Search index.

To use the JSON (Javascript Object Notation) syntax in this section in your index definition, replace the placeholders with valid values and ensure that your full index definition contains the [necessary options.](https://www.mongodb.com/docs/search/indexes/index-definitions.md#std-label-index-definition-options)

To learn how to add your MongoDB Search index to your cluster, see the [MongoDB Search Quick Start.](https://www.mongodb.com/docs/search/tutorial.md#std-label-fts-tutorial-ref)

1. Choose which fields to index.

   If you know which fields you want to query in your collection, enable static mappings and specify the fields in your MongoDB Search index definition. Otherwise, you can enable dynamic mappings to automatically index all fields based on a default or configured set of field types (`typeSet`).

   To learn more, see [Dynamic and Static Mappings.](https://www.mongodb.com/docs/search/indexes/define-field-mappings.md#std-label-static-dynamic-mappings)

   **Note:**

   For more details on MongoDB Search indexes behaviour and limitations, see [Considerations for MongoDB Search Indexes.](https://www.mongodb.com/docs/search/indexes/manage-indexes.md#std-label-ref-index-considerations)

   ### Dynamic Mappings

   ```json
   {
     "mappings": {
       "dynamic": true
     }
   }
   ```

2. *(Optional)* Apply text analysis rules.

   If you have special language, parsing, or scoring requirements for your `string` data, you can apply the following options to your index definition:

   ### Built-in Analyzers

   To specify how MongoDB Search breaks your text fields into tokens, you can set [built-in analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/overview.md#std-label-ref-built-in-analyzers) in your MongoDB Search index.

   ```json
   {
     "analyzer": "<index-analyzer-name>", // top-level index analyzer, used if no analyzer is set in the field mappings
     "searchAnalyzer": "<search-analyzer-name>", // query text analyzer, typically the same as the index analyzer
     "mappings": {
       "dynamic": <boolean>,
       "fields":{
         "<field-name>": [
           {
             "type": "string|autocomplete",
             "analyzer": "<field-analyzer-name>" // field-specific index analyzer
             "multi": {
               "<multi-option-name>": {
                 "type": "string|autocomplete",
                 "analyzer": "<alternate-analyzer-name>" // multi-option specific index analyzer
               }
             }
           }
         ]
       }
     }
   }
   ```

3. *(Optional)* Add options to optimize query performance.

   If you want to optimize your query performance on a large dataset, you can add the following options to your index definition to limit the amount of data that your MongoDB Search query must traverse:

   ### numPartitions

   Use the [numPartitions](https://www.mongodb.com/docs/search/indexes/index-partition.md#std-label-fts-index-partition) option to configure partitions for your index. When you partition your index, MongoDB Search automatically distributes the index objects between sub-indexes in an optimal way.

   ```json
   {
     "numPartitions": <integer>,
   }
   ```

## Define Your Query

After you create an [MongoDB Search index](https://www.mongodb.com/docs/search/indexes/index-definitions.md#std-label-ref-index-definitions) for all the fields that you want to search in your collection, you can run a MongoDB Search query. This section demonstrates how to apply your [goals for your application's search experience](https://www.mongodb.com/docs/search/about/searching.md#std-label-fts-plan-query) to the JSON (Javascript Object Notation) syntax of a MongoDB Search query.

To use the JSON (Javascript Object Notation) syntax in this section in your MongoDB Search query aggregation pipeline, replace the placeholders with valid values and ensure that your full query pipeline contains the required [$search fields](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#std-label-fts-search-fields) or [$searchMeta fields.](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#std-label-fts-searchMeta-fields)

To learn how to run a Search query, see the [MongoDB Search Quick Start.](https://www.mongodb.com/docs/search/tutorial.md#std-label-fts-tutorial-ref)

1. Choose your initial MongoDB Search pipeline stage.

   The first stage of your MongoDB Search query aggregation pipeline must be either the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) or [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) stage, depending on whether you're searching for documents or metadata:

   | Aggregation Pipeline Stage | Purpose |
   | --- | --- |
   | [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) | Return the search results of a full-text search. |
   | [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) | Return metadata about your search results. |

2. Apply operators to define your search criteria.

   To define your search criteria, you must apply one or more [operators](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-operators) or [collectors](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-collectors) to your [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) or [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) pipeline stage.

   MongoDB Search operators allow you to locate and retrieve relevant data from your cluster according to content, format, or data type. To learn which operators support searches for each [field type](https://www.mongodb.com/docs/search/indexes/define-field-mappings.md#std-label-bson-data-types), see the table in the [operators](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-fts-operators) reference section. You must specify one or more indexed search fields in the operator's [query path](https://www.mongodb.com/docs/search/query/path-construction.md#std-label-ref-path) parameter:

   ### $search

   ```json
   {
     $search: {
       "<operator-name>"|"<collector-name>": {
         <operator-specification>|<collector-specification>
       }
     }
   }
   ```

   **Output:**

   ```text
   [
     {
       _id: <result-document-id>,
       ...
     },
     {
       _id: <result-document-id>,
       ...
     },
     ...
   ]
   ```

   **Tip:**

   You can combine multiple operators into one operation using the [compound](https://www.mongodb.com/docs/search/query/operators-collectors/compound.md#std-label-compound-ref) operator. You can also use the [compound](https://www.mongodb.com/docs/search/query/operators-collectors/compound.md#std-label-compound-ref) operator's *filter* clause to filter for query output that matches a given clause.

3. *(Optional)* Apply options or collectors to return metadata.

   If you want to retrieve metadata from your MongoDB Search query, you can apply one of the following configurations to choose between the [count](https://www.mongodb.com/docs/search/query/counting.md#std-label-count-ref) or [`facet` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/facet.md#std-label-fts-facet-ref) type of metadata results document:

   ### Count Metadata

   To return the total or lower-bounded count of your search results, set the [count](https://www.mongodb.com/docs/search/query/counting.md#std-label-count-ref) option in your aggregation stage.

   The [`$searchMeta`](https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta.md#mongodb-pipeline-pipe.-searchMeta) stage returns the `count` metadata results, while the [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) stage stores the metadata results in the [$$SEARCH\_META aggregation variable](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#std-label-fts-aggregation-variable) and returns only the search results. For an example of how to retrieve the `count` metadata results from the `$$SEARCH_META` variable, see [Count Results.](https://www.mongodb.com/docs/search/query/counting.md#std-label-count-results)

   ```json
   {
     "$search" | "$searchMeta": {
       "<operator-name>": {
         <operator-specifications>
       },
       "count": {
         "type": "lowerBound" | "total",
         "threshold": <number-of-documents> // Optional
       }
     }
   }
   ```

4. *(Optional)* Add search options to your $search stage to retrieve additional information about your MongoDB Search query.

   You can retrieve additional information about your [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) stage results using the following options:

   | Option | Use Case |
   | --- | --- |
   | [highlight](https://www.mongodb.com/docs/search/query/highlighting.md#std-label-highlight-ref) | Display your search terms in their original context as fields in your query result. |
   | [scoreDetail](https://www.mongodb.com/docs/search/query/score/get-details.md#std-label-fts-score-details) | Retrieve a detailed breakdown of the score for each document MongoDB Search returns. |
   | [explain](https://www.mongodb.com/docs/search/query/explain.md#std-label-explain-ref) | Retrieve analytics about which Lucene queries MongoDB Search executed to satify your query, and how much time your query spends in the various stages of execution. |

5. *(Optional)* Add $search options to define result ranking.

   You can implement special ordering functionality for your [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) results with the following options:

   | Option | Use Case |
   | --- | --- |
   | [score](https://www.mongodb.com/docs/search/query/score/overview.md#std-label-scoring-ref) | Modify the relevance score of the documents in the results to ensure MongoDB Search returns relevant results. |
   | [sort](https://www.mongodb.com/docs/search/query/sort.md#std-label-sort-ref) | Sort your results by number, string, and date fields, or by score. |
   | [searchBefore/searchAfter](https://www.mongodb.com/docs/search/query/paginate-results.md#std-label-fts-paginate-results) | Set a reference point to stop or start your ordered results |

6. *(Optional)* Add $search options to optimize query performance.

   Optimize query performance using the following [`$search`](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md#mongodb-pipeline-pipe.-search) options:

   | Option | Use Case |
   | --- | --- |
   | [returnStoredSource](https://www.mongodb.com/docs/search/query/return-stored-source.md#std-label-fts-return-stored-source-option) | Run your MongoDB Search query more efficiently by only retrieving fields stored on `mongot` as specified in your MongoDB Search index definition for a collection. |
   | [concurrent](https://www.mongodb.com/docs/search/query/concurrent-query.md#std-label-concurrent-ref) | Parallelize search across segments on [dedicated search nodes.](https://www.mongodb.com/docs/search/deployment/deployment-options.md#std-label-what-is-search-node) |

## Learn More

To learn how to build and run a MongoDB Search index and MongoDB Search query, see the [MongoDB Search Quick Start.](https://www.mongodb.com/docs/search/tutorial.md#std-label-fts-tutorial-ref)

To learn more about the MongoDB Search query configuration options mentioned in this tutorial, see the following reference pages:

- [Choose the Aggregation Pipeline Stage](https://www.mongodb.com/docs/search/query/query-syntax.md#std-label-fts-pipeline-stage)

- [Operators and Collectors](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md#std-label-operators-ref)

- [Process Results with Search Options](https://www.mongodb.com/docs/search/query/search-options.md#std-label-fts-search-options)

- [Score the Documents in the Results](https://www.mongodb.com/docs/search/query/score/overview.md#std-label-scoring-ref)

- [Define Performance Options](https://www.mongodb.com/docs/search/performance/performance-options.md#std-label-fts-performance-options)

To learn more about the MongoDB Search index configuration options mentioned in this tutorial, see the following reference pages:

- [Define Field Mappings for a MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/define-field-mappings.md#std-label-fts-field-mappings)

- [Process Data with Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/overview.md#std-label-analyzers-ref)

- [Custom Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/custom.md#std-label-custom-analyzers)

- [Define Stored Source Fields in Your MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/stored-source-definition.md#std-label-fts-stored-source-definition)

- [Define Synonym Mappings in Your MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/synonyms.md#std-label-synonyms-ref)
