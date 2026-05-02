// Day 13 — RAG Architectures
// Updated: March 2026
// Review changes:
// - Added Contextual Retrieval (Anthropic's own technique, 67% improvement)
// - Added advanced RAG patterns: Agentic RAG, GraphRAG, Self-RAG
// - Updated vector DB landscape: Supabase pgvector HNSW prominence
// - Softened RAG vs fine-tuning claim: "often preferred" with hybrid caveat
// - Added RAGAS framework for RAG-specific evaluation
// - Added GraphRAG mention for enterprise document intelligence
// - Added GitHub commit task structure
// - Preserved: failure mode identification, hybrid search recommendation

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[13] = {
  subtitle: 'The most-deployed AI architecture \u2014 build the retrieval layer that makes models know your data.',

  context: `<p><strong>Retrieval-Augmented Generation (RAG)</strong> solves the fundamental problem that language models don\u2019t know your private data. At query time, retrieve relevant chunks from a vector database, inject them into the model\u2019s context, and generate a response grounded in retrieved content. RAG is often preferred over fine-tuning for knowledge because it\u2019s updateable (add new documents without retraining), auditable (trace which chunks grounded the answer), and cheaper to maintain. However, hybrid approaches \u2014 combining RAG with fine-tuning for domain-specific reasoning patterns \u2014 are increasingly common in 2025-2026 and can outperform either alone.</p>
  <p>The core pipeline: <strong>Chunking</strong> (how you split documents \u2014 fixed-size, sentence-boundary, recursive with overlap, or structural based on document headings), <strong>Embedding</strong> (dense vector representations via text-embedding-3-small, Voyage AI, or Cohere), <strong>Retrieval</strong> (find top-k similar chunks), and <strong>Generation</strong> (inject chunks into prompt and generate). The most common failure mode is <em>poor retrieval, not poor generation</em> \u2014 the model can only answer well if the right chunks are found. <strong>Hybrid search</strong> (semantic similarity + BM25 keyword search) consistently outperforms pure semantic search, especially for domain-specific terminology.</p>
  <p>RAG architectures have evolved significantly beyond "basic RAG" by 2025-2026: <strong>Agentic RAG</strong> uses an agent that decides what to retrieve, how many times to search, and when it has enough context. <strong>GraphRAG</strong> (Microsoft, 2024) builds knowledge graphs from documents for superior multi-hop reasoning on complex analytical questions. <strong>Self-RAG</strong> lets models decide when retrieval is needed and critique their own retrieval quality. <strong>Contextual retrieval</strong> \u2014 Anthropic\u2019s own contribution \u2014 prepends chunk-specific summaries before embedding, reducing retrieval failures by 67% in Anthropic\u2019s published research. This last technique is directly implementable, citable, and from Anthropic.</p>
  <p><strong>Contextual retrieval in practice:</strong> Before embedding each chunk, generate a brief summary explaining the chunk\u2019s context within the full document. Embed the summary + chunk together. At query time, the embedding captures document-level context that a bare chunk would miss. A chunk that says "The penalty is 5% per annum" is ambiguous. With context: "Section 4.2 of the Master Services Agreement, covering late payment terms: The penalty is 5% per annum" \u2014 now the embedding knows what "penalty" refers to. Source: <a href="https://www.anthropic.com/news/contextual-retrieval" target="_blank">Anthropic contextual retrieval research</a>.</p>`,

  tasks: [
    {
      title: 'Sketch a production RAG architecture',
      description: 'Build the full data pipeline for a knowledge base Q&A product on a company\u2019s internal Confluence. Include: document ingestion, chunking strategy (with rationale), embedding model choice, vector DB choice, retrieval (include hybrid search), and generation (model + system prompt). What does the system do when no relevant content is found? Save as /day-13/rag_architecture_diagram.md.',
      time: '25 min'
    },
    {
      title: 'Chunk size experiment',
      description: 'Take a 2,000-word article or spec. Create chunks at 3 sizes: 256, 512, and 1024 tokens. For each: count the chunks, write 3 questions about the document, and assess which chunk size retrieves the most relevant content. What do you lose at smaller sizes? What do you gain? Save as /day-13/chunk_size_experiment.md.',
      time: '25 min'
    },
    {
      title: 'Implement contextual retrieval',
      description: 'Take 5 chunks from a document. For each, write a 1-2 sentence context summary that explains what the chunk contains in the context of the full document. Compare: would a search for "payment terms" find the right chunk with vs without context prepended? This is Anthropic\u2019s published technique \u2014 cite it. Save as /day-13/contextual_retrieval_test.md.',
      time: '20 min'
    },
    {
      title: 'RAG evaluation design',
      description: 'Define 4 evaluation metrics for your RAG system: context precision (relevant chunks / total retrieved), context recall (relevant chunks retrieved / relevant chunks available), answer faithfulness (answer reflects retrieved context), and answer correctness. How would you measure each? Research the RAGAS framework as an open-source tool for this. Save as /day-13/rag_evaluation_design.md.',
      time: '10 min'
    }
  ],

  codeExample: {
    title: 'RAG pipeline with contextual retrieval \u2014 JavaScript',
    lang: 'js',
    code: `// RAG Pipeline — including Anthropic's contextual retrieval technique
// Production: use real embeddings API (Voyage AI, OpenAI, or Cohere)

// === CONTEXTUAL RETRIEVAL (Anthropic's technique) ===
// Before embedding, prepend context to each chunk
const rawChunks = [
  { id: 1, text: "The penalty is 5% per annum on outstanding balances.", source: "contract.pdf", section: "4.2" },
  { id: 2, text: "Either party may terminate with 90 days written notice.", source: "contract.pdf", section: "7.1" },
  { id: 3, text: "The service tier includes 24/7 support with 4-hour SLA.", source: "contract.pdf", section: "3.3" },
  { id: 4, text: "Payment terms are Net 30 from invoice date.", source: "contract.pdf", section: "4.1" },
  { id: 5, text: "The provider maintains SOC 2 Type II certification.", source: "contract.pdf", section: "5.2" },
];

// Contextual retrieval: add document-level context to each chunk
function addContext(chunk) {
  return {
    ...chunk,
    contextualText: "Section " + chunk.section + " of Master Services Agreement (" + chunk.source + "): " + chunk.text,
    // In production: use Claude to generate richer context summaries
  };
}

const contextualChunks = rawChunks.map(addContext);

// Mock embedding + similarity (production: use real embeddings API)
function mockSimilarity(query, chunkText) {
  const queryWords = new Set(query.toLowerCase().split(/\\s+/));
  const chunkWords = new Set(chunkText.toLowerCase().split(/\\s+/));
  let overlap = 0;
  queryWords.forEach(w => { if (chunkWords.has(w)) overlap++; });
  return overlap / Math.max(queryWords.size, 1);
}

function retrieve(query, chunks, topK) {
  return chunks
    .map(c => ({ ...c, score: mockSimilarity(query, c.contextualText || c.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Compare retrieval: with vs without context
const query = "What are the payment penalty terms?";

console.log("CONTEXTUAL RETRIEVAL COMPARISON");
console.log("Query: " + query);
console.log("=".repeat(55));

console.log("\\nWITHOUT context (raw chunks):");
retrieve(query, rawChunks, 2).forEach((r, i) => {
  console.log("  " + (i+1) + ". [S" + r.section + "] " + r.text.slice(0, 60) + "... (score: " + r.score.toFixed(2) + ")");
});

console.log("\\nWITH contextual retrieval:");
retrieve(query, contextualChunks, 2).forEach((r, i) => {
  console.log("  " + (i+1) + ". [S" + r.section + "] " + r.text.slice(0, 60) + "... (score: " + r.score.toFixed(2) + ")");
});

// RAG evaluation metrics
console.log("\\n" + "=".repeat(55));
console.log("RAG EVALUATION METRICS (RAGAS framework)");
console.log("=".repeat(55));
const metrics = [
  { name: "Context Precision", desc: "Relevant chunks / Total retrieved chunks" },
  { name: "Context Recall", desc: "Relevant chunks found / All relevant chunks in corpus" },
  { name: "Answer Faithfulness", desc: "Answer claims supported by retrieved context" },
  { name: "Answer Correctness", desc: "Answer matches ground truth" },
];
metrics.forEach(m => console.log("  " + m.name + ": " + m.desc));

console.log("\\nAdvanced RAG patterns (2025-2026):");
console.log("  Agentic RAG: Agent decides what/when/how many times to retrieve");
console.log("  GraphRAG: Knowledge graphs for multi-hop reasoning");
console.log("  Self-RAG: Model critiques its own retrieval quality");
console.log("  Contextual retrieval: Anthropic technique, 67% fewer failures");`
  },

  interview: {
    question: 'Design a RAG system for a legal firm\u2019s document Q&A product. What are the key architectural decisions?',
    answer: `For legal RAG, three decisions differ from general implementations.<br><br><strong>Chunking:</strong> Legal documents have logical sections (clauses, exhibits) that must stay together. I\u2019d use structural chunking respecting heading boundaries, not fixed token sizes. A clause split across chunks loses legal meaning. Then apply Anthropic\u2019s contextual retrieval: prepend each chunk with a context summary (e.g., "Section 4.2, Late Payment Terms of Master Services Agreement"). Their research shows this reduces retrieval failures by 67%.<br><br><strong>Retrieval:</strong> Legal queries use precise terminology ("non-compete clause," "force majeure"). Hybrid search \u2014 BM25 for exact legal terms plus dense semantic search \u2014 outperforms pure semantic search here. Add a reranking layer (Cohere Rerank or Voyage AI) to filter top-20 down to top-3 before injection.<br><br><strong>Citation:</strong> Lawyers must know exactly which clause grounded each answer. Build citation extraction into the system prompt and verify citations against retrieved chunks (don\u2019t let the model hallucinate sources). Every answer references specific document, section, and page.<br><br><strong>Evaluation:</strong> Use the RAGAS framework to measure context precision, recall, faithfulness, and correctness. The golden dataset should include adversarial cases: questions where the answer spans multiple sections, questions with no answer in the corpus, and questions requiring cross-document reasoning.`
  },

  pmAngle: 'RAG is the most-deployed AI architecture in enterprise software. The failure mode is almost always poor retrieval, not poor generation. Anthropic\u2019s contextual retrieval technique (prepend context summaries to chunks before embedding) is a directly implementable improvement that reduces failures by 67%. Know it, cite it, recommend it.',

  resources: [
    { type: 'BLOG', title: 'Anthropic: Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval', note: 'Anthropic\u2019s technique: 67% fewer retrieval failures. Directly implementable.' },
    { type: 'DOCS', title: 'Anthropic RAG Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/embeddings', note: 'Embeddings and retrieval best practices from Anthropic.' },
    { type: 'TOOL', title: 'RAGAS Framework', url: 'https://docs.ragas.io/', note: 'Open-source RAG evaluation: precision, recall, faithfulness, correctness.' },
    { type: 'PAPER', title: 'GraphRAG \u2014 Microsoft', url: 'https://microsoft.github.io/graphrag/', note: 'Knowledge graph-based RAG for complex multi-hop reasoning.' },
    { type: 'DOCS', title: 'LangChain RAG Tutorial', url: 'https://python.langchain.com/docs/tutorials/rag/', note: 'End-to-end RAG implementation walkthrough.' },
    { type: 'PAPER', title: 'RAG Original Paper', url: 'https://arxiv.org/abs/2005.11401', note: 'Facebook AI\u2019s original RAG paper. Foundational reading.' }
  ]
};
