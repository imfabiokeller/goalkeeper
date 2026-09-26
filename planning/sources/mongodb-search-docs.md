> Source: https://www.mongodb.com/docs/search/ (landing page, text extracted from HTML; the .md export 404s for this page) and https://www.mongodb.com/docs/search/llms.txt (the section index). Saved September 26, 2026.

# MongoDB Search Overview 

## What is MongoDB Search ? 

MongoDB Search is an embedded full-text search that gives you a seamless, scalable experience for building relevance-based app features and eliminates the need to run a separate search system alongside your database. 
You can use MongoDB Search for fine-grained text indexing and querying of data on your cluster. MongoDB Search provides several kinds of text analyzers (https://www.mongodb.com/docs/search/indexes/analyzers/overview/#std-label-analyzers-ref), a rich query language (https://www.mongodb.com/docs/search/query/query-ref/#std-label-query-syntax-ref)to create complex search logic, customizable score-based results ranking, and advanced search features for your applications like autocomplete, pagination, and faceting. Get Started with MongoDB Search (https://www.mongodb.com/docs/atlas/atlas-search/tutorial/)

## Use Cases 

MongoDB Search supports diverse use cases including the following: 

Search-as-you-type: To predict words with increasing accuracy as users enter characters in your application's search field, you can use the MongoDB Search autocomplete (https://www.mongodb.com/docs/search/query/operators-collectors/autocomplete/#std-label-autocomplete-ref)operator to predict and return results for partial words. To learn more, see How to Run Autocomplete and Partial Match MongoDB Search Queries. (https://www.mongodb.com/docs/search/tutorial/partial-match/#std-label-partial-match-tutorial)

Faceted Search: To enable users of your application to narrow down search results through the use of filters, you can use the MongoDB Search facet ( MongoDB Search Operator) (https://www.mongodb.com/docs/search/query/operators-collectors/facet/#std-label-fts-facet-ref)collector to build facets that group results by values or ranges in the faceted fields. To learn more, see How to Use Facets with MongoDB Search . (https://www.mongodb.com/docs/search/tutorial/facet-tutorial/#std-label-facet-tutorial)

Paginated Results: To group pages of results and implement functions like "Next Page" and "Previous Page", you can use the MongoDB Search searchSequenceToken with searchAfter and searchBefore options to traverse pages in-order and jump across pages. To learn more, see How to Paginate the Results. (https://www.mongodb.com/docs/search/query/paginate-results/#std-label-fts-paginate-results)

## Key Concepts 

The following concepts form the basis of MongoDB Search and are essential to optimize your application. 

### What are search queries? 

Search queries consult a search index to return a set of results. Search queries differ from traditional database queries, as they meet more general information needs. Where a database query must follow a strict syntax, you can use search queries for simple text matching. You can also search for similar phrases, number or date ranges, and regular expressions or wildcards. 
MongoDB Search queries take the form of an aggregation pipeline stage (https://www.mongodb.com/docs/manual/aggregation/#std-label-aggregation). MongoDB Search provides $search (https://www.mongodb.com/docs/search/query/aggregation-stages/search/#mongodb-pipeline-pipe.-search)and $searchMeta (https://www.mongodb.com/docs/search/query/aggregation-stages/searchmeta/#mongodb-pipeline-pipe.-searchMeta)stages, which you can use with other aggregation pipeline stages (https://www.mongodb.com/docs/manual/aggregation/#std-label-aggregation)in your query pipeline. MongoDB Search provides query operators (https://www.mongodb.com/docs/search/query/operators-collectors/overview/#std-label-operators-ref)and collectors (https://www.mongodb.com/docs/search/query/operators-collectors/overview/#std-label-collectors-ref)that you can use inside these aggregation pipeline stages. 
To learn more, see Queries and Indexes. (https://www.mongodb.com/docs/search/about/searching/#std-label-fts-about-queries)

### What is a search index? 

In the context of search, an index is a data structure that categorizes data in an easily searchable format. Search indexes enable faster retrieval of documents that contain a given term without having to scan the entire collection. While both MongoDB Search indexes and MongoDB Indexes (https://www.mongodb.com/docs/manual/indexes/)make data retrieval faster, they differ. Like the index in the back of a book, a search index is a mapping between terms and the documents that contain those terms. Search indexes also contain other relevant metadata, such as the positions of terms in documents. 
You can create a MongoDB Search index on a single field or on multiple fields by using static mappings (https://www.mongodb.com/docs/search/indexes/define-field-mappings/#std-label-static-dynamic-mappings). Alternatively, you can enable dynamic mappings (https://www.mongodb.com/docs/search/indexes/define-field-mappings/#std-label-static-dynamic-mappings)to automatically index all the dynamically indexable fields in your documents. You can create MongoDB Search indexes on polymorphic data and embedded documents, or for specific use-cases like search-as-you-type or faceted search. 
To learn more, see Supported Clients. (https://www.mongodb.com/docs/search/indexes/manage-indexes/#std-label-fts-manage-indexes)

### What are search analyzers and tokens? 

When you create a search index, Atlas Search transforms your data into a sequence of tokens or terms . An analyzer facilitates this process through steps including: 

Tokenization : Breaks words in a string into indexable tokens, such as splitting a sentence by whitespace and punctuation. 

Normalization : Organizes data for consistent representation and easier analysis, such as transforming text to lowercase or removing unwanted words called stop words . 

Stemming : Reduces words to their root form by ignoring suffixes, prefixes, and plural word forms. 
The specifics of tokenization are language-specific and can require making additional choices. Which analyzer to use depends on your data and application. 
MongoDB Search provides some built-in analyzers (https://www.mongodb.com/docs/search/indexes/analyzers/overview/#std-label-analyzers-ref). You can also create your own custom analyzer (https://www.mongodb.com/docs/search/indexes/analyzers/custom/#std-label-custom-analyzers). You can specify alternate analyzers using multi (https://www.mongodb.com/docs/search/indexes/analyzers/multi/#std-label-ref-multi-analyzers)analyzer. 
To learn more, see Process Data with Analyzers. (https://www.mongodb.com/docs/search/indexes/analyzers/overview/#std-label-analyzers-ref)

### What is a search score? 

Each document in the query results receives a relevancy score that orders results from highest to lowest relevance. In the simplest form of scoring, documents score higher if the query term appears frequently in a document and lower if the query term appears across many documents in the collection. You can also customize scoring to tailor search to a specific domain by boosting, decaying, or modifying the relevance-based default score. 
To learn more, see Score Documents. (https://www.mongodb.com/docs/search/query/score/overview/#std-label-scoring-ref)

## Next Steps 

For a hands-on experience creating MongoDB Search indexes and running MongoDB Search queries against sample data, try the MongoDB Search Quick Start. (https://www.mongodb.com/docs/search/tutorial/#std-label-fts-tutorial-ref)

---

# MongoDB Search documentation index (llms.txt)

# MongoDB Search

> Learn about MongoDB Search.

- [Design Search for Your Data Model](https://www.mongodb.com/docs/search/about/design-patterns.md): Learn common design patterns for MongoDB Search so you can effectively query across different data models.
- [MongoDB Search Playground](https://www.mongodb.com/docs/search/about/playground.md): Try MongoDB Search features by configuring search indexes and running queries on your data without needing an Atlas account.
- [Queries and Indexes](https://www.mongodb.com/docs/search/about/searching.md): Create a MongoDB Search query to perform a full text search on indexed fields using the MongoDB Shell (mongosh), a driver, or the Atlas user interface.
- [Use Views with MongoDB Search](https://www.mongodb.com/docs/search/about/view-support.md): Use MongoDB Search to create indexes on Views to transform documents and collections, partially index data, handle incompatible types, and support faceting on Views.
- [MongoDB Search Deployment Options](https://www.mongodb.com/docs/search/deployment/deployment-options.md): Deploy mongod and mongot on the same node for testing and on separate search nodes for production.
- [MongoDB Search Compatibility & Limitations](https://www.mongodb.com/docs/search/deployment/feature-compatibility.md): Learn which MongoDB MongoDB Search features are available on which MongoDB versions.
- [Monitor MongoDB Search](https://www.mongodb.com/docs/search/deployment/monitoring.md): Learn how to monitor your MongoDB Search alerts and metrics, and view analytics for your tagged query terms.
- [Build a Multi-Tenant Architecture for MongoDB Search](https://www.mongodb.com/docs/search/deployment/multi-tenant-architecture.md): Explore design patterns for MongoDB Search multi-tenancy, including shared collections, per-tenant indexes, and strategies to ensure tenant isolation at scale.
- [FAQ: MongoDB Search](https://www.mongodb.com/docs/search/faq.md): Find answers to common questions about MongoDB Search.
- [MongoDB Search Overview](https://www.mongodb.com/docs/search/index.md): Learn about MongoDB Search.
- [Character Filters](https://www.mongodb.com/docs/search/indexes/analyzers/character-filters.md): Use the character filters in a MongoDB Search custom analyzer to examine text one character at a time and perform filtering operations.
- [Custom Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/custom.md): Define a custom analyzer to transform and filter characters before indexing for search.
- [Keyword Analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/keyword.md): Use the MongoDB Search keyword analyzer to index multiple terms in a string field as a single searchable term. Only exact matches on the field are returned.
- [Language Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/language.md): Use a language analyzer to create search keywords in your MongoDB Search index that are optimized for a particular natural language.
- [Multi Analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/multi.md): Use the ``multi`` object to specify alternate analyzers to also index the field with. Then you can search with the default or the alternate analyzer.
- [Process Data with Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/overview.md): Learn about the different MongoDB Search analyzers and how each one controls the way MongoDB Search returns the contents of a string field.
- [Simple Analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/simple.md): Use the MongoDB Search simple analyzer to divide text by non-letter characters and convert terms to lowercase.
- [Standard Analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/standard.md): Use the MongoDB Search standard analyzer to divide text into terms based on word boundaries, convert terms to lowercase, and remove punctuation.
- [Token Filters for Custom Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/token-filters.md): Use token filters in a MongoDB Search custom analyzer to modify tokens, such as by stemming, lowercasing tokens, or redacting sensitive information from public documents.
- [Tokenizers for Custom Search Analyzers](https://www.mongodb.com/docs/search/indexes/analyzers/tokenizers.md): Use a tokenizer in a MongoDB Search custom analyzer to split text into groups, or tokens, for indexing. Learn about edgeGram, nGram, keyword, and other tokenizer types.
- [Whitespace Analyzer](https://www.mongodb.com/docs/search/indexes/analyzers/whitespace.md): Use the MongoDB Search whitespace analyzer to divide text into searchable terms at each whitespace character.
- [Define Field Mappings for a MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/define-field-mappings.md): Learn how to define field mappings for a MongoDB Search index. Use dynamic or static mappings to specify which fields to index and configure indexing options.
- [How to Index the Elements of an Array](https://www.mongodb.com/docs/search/indexes/field-types/array-type.md): Use the data type of the elements in an array to include elements inside the array in the search index.
- [How to Index Fields for Autocompletion](https://www.mongodb.com/docs/search/indexes/field-types/autocomplete-type.md): Use the MongoDB Search autocomplete field type to index text values in string fields for autocompletion and search-as-you-type applications.
- [How to Index Boolean Fields](https://www.mongodb.com/docs/search/indexes/field-types/boolean-type.md): Use the MongoDB Search boolean field type to index true and false values and query them with the equals and in operators, or sort results by the field.
- [How to Index Date Fields For Faceted Search](https://www.mongodb.com/docs/search/indexes/field-types/date-facet-type.md): Use the dateFacet field type to include date values for faceting in your search index.
- [How to Index Date Fields](https://www.mongodb.com/docs/search/indexes/field-types/date-type.md): Use the MongoDB Search date field type to index BSON date values in your Atlas Search index and query them with the range, near, in, and equals operators.
- [How to Index Fields in Objects and Documents](https://www.mongodb.com/docs/search/indexes/field-types/document-type.md): Use the MongoDB Search document field type to index fields in objects or subdocuments, with support for dynamic or static field mapping in your search index.
- [How to Index Fields in Arrays of Objects and Documents](https://www.mongodb.com/docs/search/indexes/field-types/embedded-documents-type.md): Use the MongoDB Search embeddedDocument field type to index fields in documents or objects that are in an array.
- [How to Index GeoJSON Objects](https://www.mongodb.com/docs/search/indexes/field-types/geo-type.md): Use the MongoDB Search geo field type to index GeoJSON objects, including polygons, MultiPolygons, LineStrings, and coordinate points for geospatial queries.
- [How to Index Vector Embeddings for Vector Search](https://www.mongodb.com/docs/search/indexes/field-types/knn-vector.md): Use the MongoDB Search knnVector field type to index vector embeddings for vector search using the knnBeta operator.
- [How to Index Numeric Values for Faceted Search](https://www.mongodb.com/docs/search/indexes/field-types/number-facet-type.md): Use the MongoDB Search numberFacet field type to include numeric values of int32, int64, and double data types in the search index for faceted search.
- [How to Index Numeric Values](https://www.mongodb.com/docs/search/indexes/field-types/number-type.md): Use the MongoDB Search number field type to index int32, int64, and double numeric values for querying with the equals, range, near, and facet operators.
- [How to Index ObjectId Fields](https://www.mongodb.com/docs/search/indexes/field-types/object-id-type.md): Use the MongoDB Search objectId field type to index BSON ObjectId values and query or filter them using the equals and in operators in your search index.
- [How to Index String Fields For Faceted Search](https://www.mongodb.com/docs/search/indexes/field-types/string-facet-type.md): Learn how to use the Atlas Search stringFacet field type to index string values for faceted search, configure its properties, and try example index definitions.
- [How to Index String Fields](https://www.mongodb.com/docs/search/indexes/field-types/string-type.md): Use the string field type to index string values in fields.
- [How to Index Token Fields](https://www.mongodb.com/docs/search/indexes/field-types/token-type.md): Use the MongoDB Search token field type to index string values for sorting, faceting, and exact-match querying with the equals, in, and range operators.
- [How to Index UUID Fields for Efficient Filtering and Sorting](https://www.mongodb.com/docs/search/indexes/field-types/uuid-type.md): Use the MongoDB Search uuid field type to index BSON Binary Subtype 4 fields and filter or sort Atlas Search results by UUID values in your search index.
- [How to Index Vector Fields](https://www.mongodb.com/docs/search/indexes/field-types/vector-type.md): Use the vector field type to index vector embeddings.
- [Index Reference](https://www.mongodb.com/docs/search/indexes/index-definitions.md): Learn the JSON syntax to include one or more analyzers, field mappings, or synonyms in your MongoDB Search index.
- [Configure Index Partition](https://www.mongodb.com/docs/search/indexes/index-partition.md): Partition the MongoDB Search index to support more index objects.
- [Manage MongoDB Search Indexes](https://www.mongodb.com/docs/search/indexes/manage-indexes.md): Learn how to create and manage a MongoDB Search Index using the Atlas User Interface, MongoDB Search API, or the Atlas CLI.
- [Sorted Index](https://www.mongodb.com/docs/search/indexes/sort.md): Sort your MongoDB Search results by date, number, and string fields.
- [Define Stored Source Fields in Your MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/stored-source-definition.md): Learn how to store certain fields in MongoDB Search to improve query performance and avoid full document lookup.
- [Define Synonym Mappings in Your MongoDB Search Index](https://www.mongodb.com/docs/search/indexes/synonyms.md): Learn how to index and search your collection for words that have the same or nearly the same meaning.
- [Improve MongoDB Search Index Performance](https://www.mongodb.com/docs/search/performance/index-performance.md): Improve your MongoDB Search index and cluster performance by following resource allocation, memory management, and Atlas cluster scaling recommendations.
- [Improve MongoDB Search Performance](https://www.mongodb.com/docs/search/performance/overview.md): Learn how mongot operates, how to improve your index and query performance, and how to fix and monitor your MongoDB Search issues.
- [Define Performance Options](https://www.mongodb.com/docs/search/performance/performance-options.md): Optimize MongoDB Search query performance with options for parallel execution and minimizing document retrieval overhead.
- [MongoDB Search Query Performance](https://www.mongodb.com/docs/search/performance/query-performance.md): Improve your MongoDB Search query performance by understanding how query complexity, operators, and aggregation pipeline stages affect cluster performance.
- [Improve Accuracy](https://www.mongodb.com/docs/search/query/accuracy.md)
- [``$search``](https://www.mongodb.com/docs/search/query/aggregation-stages/search.md): Learn about the MongoDB Search $search stage syntax and options.
- [``$searchMeta``](https://www.mongodb.com/docs/search/query/aggregation-stages/searchMeta.md): Learn about the MongoDB Search $searchMeta stage syntax and options.
- [Parallelize Query Execution Across Segments](https://www.mongodb.com/docs/search/query/concurrent-query.md): Learn how to execute each individual MongoDB Search query using multiple threads to reduce query latency, how this affects CPU usage on Search Nodes, and how to monitor it.
- [Count MongoDB Search Results](https://www.mongodb.com/docs/search/query/counting.md): Learn how to use the Atlas Search count option to return the total or lowerBound number of matching results from your $search or $searchMeta aggregation query.
- [How to Retrieve Query Plan and Execution Statistics](https://www.mongodb.com/docs/search/query/explain.md): Run your MongoDB Search query with the explain method to learn about your $search query plan and its execution statistics.
- [Highlight Search Terms in Results](https://www.mongodb.com/docs/search/query/highlighting.md): Use the highlight option to return search terms within their original context as fields in your query results.
- [``autocomplete`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/autocomplete.md): Use the autocomplete operator to predict words as you type.
- [``compound`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/compound.md): Use the compound operator to combine multiple operators in a single query and get results with a match score.
- [``embeddedDocument`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/embedded-document.md): Use the embeddedDocuments operator to match a single element of an array of embedded documents with multiple query criteria.
- [``equals`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/equals.md): Learn how to find fields whose values match a specific value so that MongoDB Search can add those documents to the result set.
- [``exists`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/exists.md): Use the exists operator to test if a path to an indexed field name exists. If it exists but isn't indexed, the document isn't included in the results.
- [``facet`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/facet.md): Use the MongoDB Search facet collector to group query results by values or ranges in the specified faceted fields and return the document count for each of those groups.
- [``geoShape`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/geoShape.md): Learn how to query values with a specified geometric shape.
- [``geoWithin`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/geoWithin.md): Use the Atlas Search geoWithin operator to query geographic points within a box, circle, or polygon geometry. Includes syntax, options, and driver examples.
- [``hasAncestor`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/hasAncestor.md): Query embeddedDocuments type fields to retrieve nested fields based on parent document criteria.
- [``hasRoot`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/hasRoot.md): Retrieve nested fields as individual documents by searching for the parent embeddedDocuments field.
- [``in`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/in.md): Perform a search for a single or array of numeric, date, boolean, objectID, or string values.
- [``knnBeta`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/knn-beta.md): Explore the deprecated `knnBeta` operator for semantic search using the Hierarchical Navigable Small Worlds algorithm in MongoDB Search.
- [``moreLikeThis`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/morelikethis.md): Learn how to search for similar or alternative results based on one or more documents.
- [``near`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/near.md): Learn how to search near a numeric, date, or GeoJSON point value.
- [Operators and Collectors](https://www.mongodb.com/docs/search/query/operators-collectors/overview.md): Explore Atlas Search operators and collectors to perform specific searches and group query results with the $search and $searchMeta aggregation pipeline stages.
- [``phrase`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/phrase.md): Learn how to use the MongoDB Search phrase operator to search documents for terms in the exact or a similar order to your query. You can also do exact match searches.
- [``queryString`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/queryString.md): Learn how to query a combination of indexed fields and values.
- [``range`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/range.md): Learn how to query values within a specific numeric, date, or string range.
- [``regex`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/regex.md): Learn how to use a regular expression in your MongoDB Search query.
- [``span`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/span.md): Learn how to find text search matches within regions of a text field.
- [``text`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/text.md): Use the MongoDB Search text operator to perform a full-text search on exact, similar, or synonymous terms in your documents. Learn how to configure text queries.
- [``vectorSearch`` (MongoDB Search Operator)](https://www.mongodb.com/docs/search/query/operators-collectors/vectorSearch.md): Use the Atlas Search vectorSearch operator to perform semantic vector searches and hybrid searches that combine vector and full-text search in a single query.
- [``wildcard`` Operator](https://www.mongodb.com/docs/search/query/operators-collectors/wildcard.md): Use a wildcard operator in a MongoDB Search query to match any character.
- [Paginate the Results](https://www.mongodb.com/docs/search/query/paginate-results.md): Retrieve $search results before or after a given reference point.
- [Construct a Query Path](https://www.mongodb.com/docs/search/query/path-construction.md): Use the path parameter to specify which field or fields your MongoDB Search operators should search.
- [Query Reference](https://www.mongodb.com/docs/search/query/query-ref.md)
- [Choose the Aggregation Pipeline Stage](https://www.mongodb.com/docs/search/query/query-syntax.md): Learn how to use the $search and $searchMeta aggregation pipeline stages in Atlas Search to run full-text searches and retrieve documents or metadata.
- [Query, Filter, and Retrieve Arrays of Objects](https://www.mongodb.com/docs/search/query/return-scope.md): Use returnScope option in Search to retrieve nested fields inside array of objects as individual documents.
- [Return Stored Source Fields](https://www.mongodb.com/docs/search/query/return-stored-source.md): Use returnStoredSource in MongoDB Search queries to retrieve only stored fields when storedSource is enabled in your index definition.
- [Customize the Score of the Documents in the Results](https://www.mongodb.com/docs/search/query/score/customize-score.md): Learn how to customize document scores in Atlas Search results by boosting, burying, or normalizing relevance scores using score options like constant, boost, and function.
- [Return the Score Details](https://www.mongodb.com/docs/search/query/score/get-details.md): Learn how to retrieve and analyze detailed score breakdowns for documents in MongoDB Search query results using the scoreDetails option.
- [Modify the Score](https://www.mongodb.com/docs/search/query/score/modify-score.md): Modify the score assigned to a returned document with the boost, constant, embedded, or function options.
- [Score the Documents in the Results](https://www.mongodb.com/docs/search/query/score/overview.md): Understand and modify document scores in MongoDB Search results with options to boost, normalize, or replace scores for enhanced relevance.
- [Process Results with Search Options](https://www.mongodb.com/docs/search/query/search-options.md): Refine and process MongoDB Search query results with options for scoring, sorting, highlighting, and pagination.
- [Sort MongoDB Search Results](https://www.mongodb.com/docs/search/query/sort.md): Sort your MongoDB Search results by date, number, and string fields.
- [MongoDB Search Quick Start](https://www.mongodb.com/docs/search/tutorial.md): Get started with MongoDB Search by creating a search index, running queries against your Atlas collection, and processing the returned search results.
- [How to Run MongoDB Search Queries Across Multiple Collections](https://www.mongodb.com/docs/search/tutorial/cross-collection-tutorials.md): Learn how to run MongoDB Search queries across multiple Atlas collections using $lookup, $unionWith, and materialized views with step-by-step tutorials.
- [How to Run MongoDB Search Queries Against Fields in Embedded Documents](https://www.mongodb.com/docs/search/tutorial/embedded-documents-tutorial.md): In this tutorial, learn how to create a MongoDB Search index for and run MongoDB Search queries against fields in documents that are inside an array.
- [How to Use Facets with MongoDB Search](https://www.mongodb.com/docs/search/tutorial/facet-tutorial.md): Learn how to create an Atlas Search index with facets, run search queries on faceted fields, and group results by string, numeric, or date range values.
- [How to Perform Hybrid Search](https://www.mongodb.com/docs/search/tutorial/hybrid-search.md): Learn how to combine vector and full-text search in MongoDB Atlas for hybrid search results using semantic boosting and rank fusion.
- [How to Run Autocomplete and Partial Match MongoDB Search Queries](https://www.mongodb.com/docs/search/tutorial/partial-match.md): In this tutorial, learn how to run a case-sensitive partial match query using the autocomplete, phrase, regex, or wildcard operator.
- [How to Search Non-Alphabetical Data as Strings](https://www.mongodb.com/docs/search/tutorial/string-operators-tutorial.md): In this tutorial, learn how to create a materialized view to query non-string fields with operators that only support strings.
- [How to Use Synonyms with MongoDB Search](https://www.mongodb.com/docs/search/tutorial/synonyms-tutorial.md): Learn how to configure synonyms in MongoDB Search to find words with the same or similar meaning and run Atlas Search queries using your synonym mappings.
