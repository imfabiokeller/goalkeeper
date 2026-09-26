> For the complete MongoDB documentation index, see www.mongodb.com/docs/llms.txt

# Natural Language to MongoDB Queries

This page provides guidance on how to generate MongoDB queries for your data from natural language using a large language model (LLM).

For example, consider the following natural language query to generated query in [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) for the Atlas [sample\_mflix](https://www.mongodb.com/docs/atlas/sample-data/sample-mflix/) database:

| Given the following natural language query: `Show me the genres and runtime of
10 movies from 2015 that have
the most comments` | This generates the following [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) code: `db.movies.aggregate([
  {
    $match: {
      year: 2015,
    },
  },
  {
    $sort: {
      num_mflix_comments: -1,
    },
  },
  {
    $limit: 10,
  },
  {
    $project: {
      _id: 0,
      genres: 1,
      runtime: 1,
    },
  },
]);` |
| --- | --- |

## Available Methods

In addition to using LLMs out of the box, you can use the following tools built by MongoDB to generate MongoDB queries from natural language:

- [Compass Natural Language Querying](https://www.mongodb.com/docs/compass/current/query-with-natural-language.md#std-label-compass-query-natural-language)

- [MongoDB MCP Server](https://www.mongodb.com/docs/mcp-server/)

- [MongoDB Extension for Github Copilot](https://www.mongodb.com/docs/mongodb-vscode/copilot/)

- [LangChain MongoDB Integration](https://www.mongodb.com/docs/atlas/ai-integrations/langchain/natural-language-to-mql/)

## Selecting a Model

Models that perform well on general tasks typically also perform well at MongoDB query generation. When selecting an LLM to generate MongoDB queries, refer to popular benchmarks like [MMLU-Pro](https://huggingface.co/spaces/TIGER-Lab/MMLU-Pro) and [Chatbot Arena ELO](https://openlm.ai/chatbot-arena/) to evaluate performance between models.

## Effective Prompting

This section outlines effective strategies for prompting an LLM to generate MongoDB queries.

**Note:**

The following prompting strategies are based on benchmarks created by MongoDB. To learn more, see our public benchmark of natural language to [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) code on [Hugging Face.](https://huggingface.co/datasets/mongodb-eai/natural-language-to-mongosh)

### Base Prompt

Your base prompt, also called the system prompt, should provide a clear overview of your task, including:

- The type of query to generate.

- Information about the expected output structure, such as the driver language or tool that executes the query.

The following base prompt example demonstrates how to generate a MongoDB read operation or aggregation for [`mongosh`:](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh)

```markdown
You are an expert data analyst experienced at using MongoDB.
Your job is to take information about a MongoDB database plus a natural language query and generate a MongoDB shell (mongosh) query to execute to retrieve the information needed to answer the natural language query.

Format the mongosh query in the following structure:

`db.<collection name>.find({/* query */})` or `db.<collection name>.aggregate({/* query */})`

```

#### General Guidance

To improve query quality, add the following guidance to your base prompt to provide the model with common tips for generating effective MongoDB queries:

```markdown
Some general query-authoring tips:

1. Ensure proper use of MongoDB operators ($eq, $gt, $lt, etc.) and data types (ObjectId, ISODate)
2. For complex queries, use aggregation pipeline with proper stages ($match, $group, $lookup, etc.)
3. Consider performance by utilizing available indexes, avoiding $where and full collection scans, and using covered queries where possible
4. Include sorting (.sort()) and limiting (.limit()), when appropriate, for result set management
5. Handle null values and existence checks explicitly with $exists and $type operators to differentiate between missing fields, null values, and empty arrays
6. Do not include `null` in results objects in aggregation, e.g. do not include _id: null
7. For date operations, NEVER use an empty new date object (e.g. `new Date()`). ALWAYS specify the date, such as `new Date("2024-10-24")`. 
8. For Decimal128 operations, prefer range queries over exact equality
9. When querying arrays, use appropriate operators like $elemMatch for complex matching, $all to match multiple elements, or $size for array length checks

```

#### Chain of Thought

You can prompt the model to "think out loud" before generating the response to improve response quality. This technique, called [chain of thought](https://www.promptingguide.ai/techniques/cot) prompting, improves performance but increases generation time and costs.

To encourage the model to think step-by-step before generating the query, add the following text to your base prompt:

```markdown
Think step by step about the code in the answer before providing it. In your thoughts, consider:
1. Which collections are relevant to the query.
2. Which query operation to use (find vs aggregate) and what specific operators ($match, $group, $project, etc.) are needed.
3. What fields are relevant to the query.
4. Which indexes you can use to improve performance.
5. What specific transformations or projections are required.
6. What data types are involved and how to handle them appropriately (ObjectId, Decimal128, Date, etc.).
7. What edge cases to consider (empty results, null values, missing fields).
8. How to handle any array fields that require special operators ($elemMatch, $all, $size).
9. Any other relevant considerations.
```

### Include Sample Documents

To significantly improve query quality, include a few representative sample documents from your collection. Two to three representative documents typically provide the model with sufficient context about the data structure.

When providing sample documents, follow these guidelines:

- Use the [BSON.EJSON.serialize()](https://www.mongodb.com/docs/mongodb-shell/reference/ejson.md#std-label-mongosh-ejson) function to convert BSON documents to EJSON strings for the prompt.

- Truncate long fields or deeply nested objects.

- Exclude long string values.

- For large arrays, like vector embeddings, include only a few elements.

#### Sample Documents Example

##### Sample documents for the movies collection to include in a prompt

For example, for the `sample_mflix` database and `movies` collection, you might include the following documents in your prompt:

```markdown
[
  {
    _id: {
      $oid: "573a13bbf29313caabd526d0",
    },
    plot: "Van Erp shows us what the Dutch do in their spare time and takes a look at the industry behind all t...",
    genres: ["Documentary"],
    runtime: 90,
    title: "Pretpark Nederland",
    num_mflix_comments: 0,
    poster:
      "https://m.media-amazon.com/images/M/MV5BMTUwNjU0ODg3N15BMl5BanBnXkFtZTcwMzg3NjYxNA@@._V1_SY1000_SX67...",
    countries: ["Netherlands"],
    fullplot:
      "Van Erp displays the mechanics behind the Dutch tourism industry. Key figures behind events and dest...",
    languages: ["Dutch", "Mandarin"],
    released: {
      $date: "2006-10-18T00:00:00.000Z",
    },
    directors: ["Michiel van Erp"],
    writers: ["Renè van 't Erve (scenario)", "Michiel van Erp (scenario)"],
    awards: {
      wins: 0,
      nominations: 1,
      text: "1 nomination.",
    },
    lastupdated: "2015-02-26T00:48:24.883Z",
    year: 2006,
    imdb: {
      rating: 7.3,
      votes: 237,
      id: 882800,
    },
    type: "movie",
    tomatoes: {
      viewer: {
        rating: 2.2,
        numReviews: 19,
      },
      dvd: {
        $date: "2010-06-22T00:00:00.000Z",
      },
      lastUpdated: {
        $date: "2014-11-24T14:15:50.000Z",
      },
    },
    hash: {
      low: -1866172407,
      high: -2147460187,
      unsigned: false,
    },
  },
  {
    _id: {
      $oid: "573a13caf29313caabd7c4e0",
    },
    fullplot:
      "A drama centered on a rising country-music songwriter (Hedlund) who sparks with a fallen star (Paltr...",
    imdb: {
      rating: 6.3,
      votes: 14066,
      id: 1555064,
    },
    year: 2010,
    plot: "A rising country-music songwriter works with a fallen star to work their way fame, causing romantic ...",
    genres: ["Drama", "Music"],
    rated: "PG-13",
    metacritic: 45,
    title: "Country Strong",
    lastupdated: "2015-09-03T00:39:54.710Z",
    languages: ["English"],
    writers: ["Shana Feste"],
    type: "movie",
    tomatoes: {
      website: "http://www.countrystrong-movie.com/?hs308=CST6186",
      viewer: {
        rating: 3.3,
        numReviews: 32825,
        meter: 53,
      },
      dvd: {
        $date: "2011-04-12T00:00:00.000Z",
      },
      critic: {
        rating: 4.5,
        numReviews: 130,
        meter: 22,
      },
      boxOffice: "$20.2M",
      consensus:
        "The cast gives it their all, and Paltrow handles her songs with aplomb, but Country Strong's cliched...",
      rotten: 101,
      production: "Screen Gems",
      lastUpdated: {
        $date: "2015-08-17T18:04:40.000Z",
      },
      fresh: 29,
    },
    poster:
      "https://m.media-amazon.com/images/M/MV5BMTUxMjQ0NjE3OV5BMl5BanBnXkFtZTcwODIxNDEwNA@@._V1_SY1000_SX67...",
    num_mflix_comments: 0,
    released: {
      $date: "2011-01-07T00:00:00.000Z",
    },
    awards: {
      wins: 2,
      nominations: 6,
      text: "Nominated for 1 Oscar. Another 1 win & 6 nominations.",
    },
    countries: ["USA"],
    cast: [
      "Gwyneth Paltrow",
      "Tim McGraw",
      "Garrett Hedlund",
      "...and 1 more items",
    ],
  },
];

```

### Best Practices

Apply the following prompting best practices for specific use cases when generating MongoDB queries from natural language.

#### Include Index Information

Include collection indexes in your prompt to encourage the LLM to generate more performant queries. MongoDB drivers and [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) provide methods to get index information. For example, the Node.js driver provides the [listIndexes()](https://www.mongodb.com/docs/drivers/node/current/indexes/) method to get indexes for your prompt.

#### Time-Based Queries

Most LLM tools include the date in their system prompt. However, if you're using an LLM out of the box, the model does not know the current date or time. Therefore, when working with base models or building your own natural language to MongoDB tools, include the latest date in your prompt. Use the method for your programming language to get the current date as a string such as JavaScript's `new Date().toString()` or Python's `str(datetime.now())`.

#### Annotated Database Schemas

Include annotated schemas of relevant database collections in your prompt. While no single representation method works best for all LLMs, some approaches are more effective than others.

We recommend representing collections using programming language-native types that describe data shape, such as TypeScript Types, Python Pydantic models, or Go structs. If you use MongoDB from these languages, you likely have the data shape defined already. To guide the LLM and reduce ambiguity, add comments to your prompt to describe each field.

The following example shows a TypeScript type for the `sample_mflix.movies` collection:

##### TypeScript Schema Example

###### Annotated TypeScript schema example for the sample\_mflix.movies collection

```typescript
interface Movie {
  /**
   * Unique identifier for the movie document.
   */
  _id: ObjectId;
  /**
   * Brief description of the movie's plot.
   */
  plot: string;
  /**
   * List of genres associated with the movie.
   */
  genres: string[];
  /**
   * Duration of the movie in minutes.
   */
  runtime: number;
  /**
   * Title of the movie.
   */
  title: string;
  /**
   * Number of comments on the movie in the mflix system.
   */
  num_mflix_comments: number;
  /**
   * URL to the movie's poster image.
   */
  poster: string;
  /**
   * List of countries where the movie was produced.
   */
  countries: string[];
  /**
   * Detailed description of the movie's plot.
   */
  fullplot: string;
  /**
   * Languages spoken in the movie.
   */
  languages: string[];
  /**
   * Release date of the movie.
   */
  released: Date;
  /**
   * List of directors of the movie.
   */
  directors: string[];
  /**
   * List of writers of the movie.
   */
  writers: string[];
  /**
   * Awards received by the movie.
   */
  awards: {
    /**
     * Number of awards won by the movie.
     */
    wins: number;
    /**
     * Number of award nominations received by the movie.
     */
    nominations: number;
    /**
     * Textual description of the awards.
     */
    text: string;
  };
  /**
   * Last updated timestamp for the movie document.
   */
  lastupdated: string;
  /**
   * Year the movie was released.
   */
  year: number;
  /**
   * IMDb information for the movie.
   */
  imdb: {
    /**
     * IMDb rating of the movie.
     */
    rating: number;
    /**
     * Number of votes the movie received on IMDb.
     */
    votes: number;
    /**
     * IMDb identifier for the movie.
     */
    id: number;
  };
  /**
   * Type of the movie (e.g., movie, series).
   */
  type: string;
  /**
   * Rotten Tomatoes information for the movie.
   */
  tomatoes: {
    /**
     * Viewer ratings on Rotten Tomatoes.
     */
    viewer?: {
      /**
       * Viewer rating score.
       */
      rating: number;
      /**
       * Number of reviews by viewers.
       */
      numReviews: number;
      /**
       * Viewer meter score.
       */
      meter: number;
    };
    /**
     * DVD release date.
     */
    dvd?: Date;
    /**
     * Last updated timestamp for Rotten Tomatoes data.
     */
    lastUpdated?: Date;
    /**
     * Official website for the movie.
     */
    website?: string;
    /**
     * Critic ratings on Rotten Tomatoes.
     */
    critic?: {
      /**
       * Critic rating score.
       */
      rating: number;
      /**
       * Number of reviews by critics.
       */
      numReviews: number;
      /**
       * Critic meter score.
       */
      meter: number;
    };
    /**
     * Box office earnings.
     */
    boxOffice?: string;
    /**
     * Consensus statement from Rotten Tomatoes.
     */
    consensus?: string;
    /**
     * Number of rotten reviews.
     */
    rotten?: number;
    /**
     * Production company.
     */
    production?: string;
    /**
     * Number of fresh reviews.
     */
    fresh?: number;
  };
  /**
   * Hash value for the movie document.
   */
  hash: Long;
  /**
   * MPAA rating of the movie.
   */
  rated?: string;
  /**
   * Metacritic score of the movie.
   */
  metacritic?: number;
  /**
   * List of main cast members in the movie.
   */
  cast: string[];
}

```

## Prompt Template

The following example demonstrates a complete prompt using the strategies described on this page for generating [`mongosh`](https://www.mongodb.com/docs/mongodb-shell.md#mongodb-binary-bin.mongosh) code from natural language.

### Base Prompt Example

Use the following system prompt example as a template for your MongoDB query generation tasks. The sample prompt includes the following components:

- Task overview and expected output format

- General MongoDB query authoring [guidance](https://www.mongodb.com/docs/manual/natural-language-to-mongodb.md#std-label-natural-language-general-guidance)

```markdown
You are an expert data analyst experienced at using MongoDB.
Your job is to take information about a MongoDB database plus a natural language query and generate a MongoDB shell (mongosh) query to execute to retrieve the information needed to answer the natural language query.

Format the mongosh query in the following structure:

`db.<collection name>.find({/* query */})` or `db.<collection name>.aggregate({/* query */})`

Some general query-authoring tips:

1. Ensure proper use of MongoDB operators ($eq, $gt, $lt, etc.) and data types (ObjectId, ISODate).
2. For complex queries, use aggregation pipeline with proper stages ($match, $group, $lookup, etc.).
3. Consider performance by utilizing available indexes, avoiding $where and full collection scans, and using covered queries where possible.
4. Include sorting (.sort()) and limiting (.limit()) when appropriate for result set management.
5. Handle null values and existence checks explicitly with $exists and $type operators to differentiate between missing fields, null values, and empty arrays.
6. Do not include `null` in results objects in aggregation, e.g. do not include _id: null.
7. For date operations, NEVER use an empty new date object (e.g. `new Date()`). ALWAYS specify the date, such as `new Date("2024-10-24")`. Use the provided 'Latest Date' field to inform dates in queries.
8. For Decimal128 operations, prefer range queries over exact equality.
9. When querying arrays, use appropriate operators like $elemMatch for complex matching, $all to match multiple elements, or $size for array length checks.
```

**Note:**

You might also add the [chain-of-thought prompt](https://www.mongodb.com/docs/manual/natural-language-to-mongodb.md#std-label-natural-language-cot) to encourage step-by-step thinking before code generation.

### User Message Template

Then, use the following user message template to provide the model with the necessary context about your database and your desired query:

````markdown
Generate MongoDB Shell (mongosh) queries for the following database and natural language query:

## Database Information

Name: {{Database name}}
Description: {{database description}}
Latest Date: {{latest date}} (use this to inform dates in queries)

### Collections

#### Collection `{{collection name. Do for each collection you want to query over}}`
Description: {{collection description}}

Schema:
```
{{interpreted or annotated schema here}}
```

Example documents:
```
{{truncated example documents here}}
```

Indexes:
```
{{collection index descriptions here}}
```

Natural language query: {{Natural language query here}}

````
