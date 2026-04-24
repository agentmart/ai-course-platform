// Day 16 — Vector Databases & Embeddings
// Updated: March 2026
// Review changes:
// - CRITICAL: Added Voyage AI (Anthropic acquisition 2024) as recommended embedding provider
// - Replaced mock cosine similarity demo with real-API-first guidance
// - Added re-ranking with Cohere or Voyage AI
// - Added multimodal embeddings mention (CLIP, advanced topic)
// - Added pgvector HNSW vs IVFFlat distinction
// - Updated embedding model landscape
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[16] = {
  subtitle: 'The storage layer for AI memory \u2014 how products give models access to millions of documents, powered by the right embeddings.',

  context: `<p><strong>Embeddings</strong> are dense numerical vector representations of text that capture semantic meaning. Similar texts produce similar vectors, enabling semantic search. The embedding model landscape in 2026: <strong>OpenAI\u2019s text-embedding-3-small</strong> (1536 dims, fast, cheap) and <strong>text-embedding-3-large</strong> (3072 dims, higher quality) remain popular. <strong>Cohere Embed v3</strong> is competitive for multilingual use cases. But the most important development for Anthropic-ecosystem PMs: <strong>Voyage AI</strong>.</p>
  <p><strong>Anthropic acquired Voyage AI in 2024.</strong> This is directly relevant product knowledge. Voyage AI offers high-quality embeddings that are now the recommended pairing with Claude: <code>voyage-3</code> (general purpose), <code>voyage-3-lite</code> (fast, cost-efficient), <code>voyage-code-3</code> (optimized for code). Anthropic does not offer its own public embedding model \u2014 Voyage AI fills that gap in the ecosystem. For PM candidates at Anthropic, knowing the Voyage AI acquisition and recommending Voyage embeddings for Claude-based applications demonstrates ecosystem awareness that generic "use OpenAI embeddings" does not.</p>
  <p><strong>Vector databases</strong> store embeddings and retrieve the most similar ones to a query. The landscape: <strong>pgvector</strong> (Postgres extension \u2014 best choice if you already use Postgres, now with HNSW indexing for better recall), <strong>Pinecone</strong> (fully managed, easy scaling), <strong>Qdrant</strong> (Rust-based, very fast), and <strong>Weaviate</strong> (built-in ML features). For most teams, especially those using Supabase (which has excellent pgvector support with HNSW indexing), pgvector is the right starting point: no new infrastructure, SQL integration, familiar backup/monitoring. Move to a dedicated vector DB only when query latency at scale becomes a measured problem.</p>
  <p>A configuration decision that affects search quality: pgvector supports two index types. <strong>IVFFlat</strong> (default, cheaper to build, lower recall on large datasets) and <strong>HNSW</strong> (better recall, more memory, recommended for production). For any product where search quality matters, use HNSW. The difference between 85% recall (IVFFlat) and 95% recall (HNSW) on your golden dataset is a product quality issue, not just an infrastructure detail.</p>
  <p><strong>Hybrid search</strong> (semantic + keyword BM25) consistently outperforms pure semantic search, especially for domain-specific terminology. <strong>Re-ranking</strong> \u2014 using a second model to reorder top-k results by relevance \u2014 is now standard in production RAG pipelines. Voyage AI and Cohere both offer re-ranking models that significantly improve final result quality at modest cost. The pipeline: vector search returns top-20 \u2192 re-ranker scores and reorders \u2192 top-3 injected into prompt.</p>`,

  tasks: [
    {
      title: 'Embedding similarity with real API',
      description: 'Generate embeddings for 10 sentences using the Voyage AI API (voyageai.com) or OpenAI embeddings API. Group by semantic similarity. Then test: does the model understand your product\u2019s domain vocabulary? Try 5 industry-specific terms. Compare Voyage vs OpenAI on the same sentences if possible. Save as /day-16/embedding_similarity_demo.md.',
      time: '25 min'
    },
    {
      title: 'Vector database selection decision',
      description: 'Choose a vector DB for: (a) a startup with 100K docs on Supabase, (b) a company already using Postgres with 1M docs, (c) an enterprise with 100M docs and 10K concurrent users. For (a), specify pgvector with HNSW. Include re-ranking recommendation. Save as /day-16/vector_db_selection_decision.md.',
      time: '20 min'
    },
    {
      title: 'Design the vector schema',
      description: 'Build the schema for a document search product: what metadata fields alongside each embedding? (doc_id, user_id, created_at, chunk_index, source_url, document_type, access_level.) How do you handle filtering by access level? How do you update when a document changes? Save as /day-16/vector_schema_design.md.',
      time: '20 min'
    },
    {
      title: 'Voyage AI vs OpenAI comparison',
      description: 'Research Voyage AI\u2019s embedding models (voyage-3, voyage-3-lite, voyage-code-3) and compare to OpenAI\u2019s text-embedding-3 family. Dimensions, pricing, strengths. When would you choose Voyage for a Claude-based product? What is the Anthropic acquisition\u2019s strategic significance? Save as /day-16/voyage_ai_vs_openai_comparison.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'Embedding pipeline with re-ranking \u2014 JavaScript',
    lang: 'js',
    code: `// Embedding Pipeline — Voyage AI + pgvector + Re-ranking
// Production pattern for Claude-based applications

// Embedding model options (verify pricing at each provider)
const EMBEDDING_MODELS = {
  // Anthropic ecosystem (recommended for Claude products)
  'voyage-3':       { dims: 1024, provider: 'Voyage AI (Anthropic)', strength: 'General purpose, high quality' },
  'voyage-3-lite':  { dims: 512,  provider: 'Voyage AI (Anthropic)', strength: 'Fast, cost-efficient' },
  'voyage-code-3':  { dims: 1024, provider: 'Voyage AI (Anthropic)', strength: 'Code-optimized' },
  // OpenAI
  'text-embedding-3-small': { dims: 1536, provider: 'OpenAI', strength: 'General purpose, widely used' },
  'text-embedding-3-large': { dims: 3072, provider: 'OpenAI', strength: 'Highest quality general' },
  // Cohere
  'embed-v3':       { dims: 1024, provider: 'Cohere', strength: 'Best multilingual' },
};

// Vector DB recommendation engine
function recommendVectorDB(numDocs, existingDB, concurrentUsers) {
  if (existingDB === 'postgres' || existingDB === 'supabase') {
    if (numDocs < 5000000 && concurrentUsers < 1000) {
      return { db: 'pgvector (HNSW)', reason: 'Already on Postgres. HNSW index for production recall.' };
    }
    return { db: 'Qdrant or Pinecone', reason: 'Scale exceeds pgvector sweet spot. Dedicated vector DB needed.' };
  }
  if (numDocs > 10000000) return { db: 'Pinecone or Qdrant', reason: 'Web-scale requires dedicated infrastructure.' };
  return { db: 'pgvector (HNSW)', reason: 'Best default. No new infrastructure.' };
}

// Re-ranking pipeline simulation
function rerankResults(query, results, topK) {
  // In production: call Voyage AI or Cohere re-ranking API
  // Re-ranker uses cross-encoder (query + each result) for more accurate scoring
  console.log("  Re-ranking top " + results.length + " results for: " + query);
  console.log("  (In production: Voyage AI rerank or Cohere Rerank API)");
  return results.slice(0, topK); // Simulated — real re-ranker reorders
}

// Demo
console.log("EMBEDDING MODEL LANDSCAPE (2026)");
console.log("=".repeat(60));
Object.entries(EMBEDDING_MODELS).forEach(([name, m]) => {
  console.log("  " + name.padEnd(28) + m.dims + "d  " + m.provider.padEnd(25) + m.strength);
});

console.log("\\n" + "=".repeat(60));
console.log("VECTOR DB RECOMMENDATIONS");
console.log("=".repeat(60));
const scenarios = [
  { docs: 100000, db: 'supabase', users: 50, label: 'Startup on Supabase' },
  { docs: 1000000, db: 'postgres', users: 200, label: 'Company on Postgres' },
  { docs: 100000000, db: 'none', users: 10000, label: 'Enterprise at scale' },
];
scenarios.forEach(s => {
  const rec = recommendVectorDB(s.docs, s.db, s.users);
  console.log("\\n  " + s.label + " (" + s.docs.toLocaleString() + " docs, " + s.users + " users)");
  console.log("  Recommendation: " + rec.db);
  console.log("  Reason: " + rec.reason);
});

console.log("\\n" + "=".repeat(60));
console.log("PRODUCTION RAG PIPELINE");
console.log("=".repeat(60));
console.log("1. Embed query with Voyage AI (voyage-3)");
console.log("2. Vector search: pgvector HNSW → top 20 results");
console.log("3. BM25 keyword search → top 20 results");
console.log("4. Reciprocal Rank Fusion (combine semantic + keyword)");
console.log("5. Re-rank: Voyage AI reranker → top 3 results");
console.log("6. Inject top 3 into Claude Sonnet 4.6 prompt");
console.log("\\npgvector index choice:");
console.log("  IVFFlat: cheaper to build, ~85% recall");
console.log("  HNSW:    more memory, ~95%+ recall (USE THIS IN PRODUCTION)");`
  },

  interview: {
    question: 'How would you pick an embedding provider and vector database for a Claude-based product?',
    answer: `For a Claude-based product, I\u2019d start with the Anthropic ecosystem: <strong>Voyage AI embeddings</strong>. Anthropic acquired Voyage AI in 2024, making it the recommended embedding provider for Claude applications. voyage-3 for general use, voyage-code-3 for code-heavy products. This isn\u2019t just a quality call \u2014 it\u2019s ecosystem alignment that demonstrates product awareness to Anthropic interviewers.<br><br>For the vector database: <strong>pgvector with HNSW indexing</strong> for most teams. If you\u2019re already on Postgres or Supabase (as many startups are), pgvector means zero new infrastructure. HNSW index is critical \u2014 the default IVFFlat has noticeably lower recall on large datasets. Only migrate to Qdrant or Pinecone when query latency at 10K+ concurrent users becomes a measured problem, not a hypothetical one.<br><br>The full pipeline: hybrid search (semantic via Voyage embeddings + BM25 keyword search), combined with Reciprocal Rank Fusion, then re-ranked with Voyage AI\u2019s reranker or Cohere Rerank. This multi-stage pipeline (retrieve broadly, then refine) typically improves answer quality by 15-25% over pure semantic search.<br><br>The key PM decision: p99 search latency must be under 200ms for the chat UX to feel responsive. That constraint drives whether integrated pgvector is sufficient or a dedicated vector DB is needed.`
  },

  pmAngle: 'For Claude-based products, Voyage AI embeddings are the ecosystem-native choice \u2014 know this acquisition and recommend it. Vector databases are infrastructure; PMs should understand cost and performance tradeoffs well enough to question architectural decisions and set realistic latency SLAs. The HNSW vs IVFFlat choice is a product quality decision disguised as an infrastructure setting.',

  resources: [
    { type: 'DOCS', title: 'Voyage AI Embeddings', url: 'https://docs.voyageai.com/', note: 'Anthropic-acquired. Recommended pairing for Claude-based products.' },
    { type: 'DOCS', title: 'Voyage AI Reranking', url: 'https://docs.voyageai.com/docs/reranker', note: 'Cross-encoder reranking for production RAG quality improvement.' },
    { type: 'DOCS', title: 'pgvector Documentation', url: 'https://github.com/pgvector/pgvector', note: 'Postgres vector extension. Use HNSW index for production.' },
    { type: 'DOCS', title: 'Cohere Embed v3 + Reranking', url: 'https://docs.cohere.com/docs/reranking', note: 'Strong multilingual alternative. Excellent reranking model.' },
    { type: 'DOCS', title: 'Supabase Vector', url: 'https://supabase.com/modules/vector', note: 'Managed pgvector with HNSW. If you use Supabase, this is your vector DB.' },
    { type: 'PAPER', title: 'Hybrid Search Paper', url: 'https://arxiv.org/abs/2210.11610', note: 'Why combining dense and sparse retrieval outperforms either alone.' }
  ]
};
