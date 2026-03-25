// Day 21 — LlamaIndex & Document Intelligence
// Updated: March 2026 | Review: LlamaParse, LlamaCloud, Workflows, competing frameworks

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};
window.COURSE_DAY_DATA[21] = {
  subtitle: 'The document intelligence framework that powers production knowledge apps \u2014 now with LlamaParse and LlamaCloud.',
  context: `<p><strong>LlamaIndex</strong> is a data framework purpose-built for connecting LLMs to external data. Where LangChain is general-purpose orchestration, LlamaIndex is optimized for the extremely common pattern: index a corpus of documents, then query it intelligently. Its primitives \u2014 Documents, Nodes, Indexes, and Query Engines \u2014 map cleanly onto the product problem of "give the model access to my company\u2019s documents."</p>
  <p>The LlamaIndex ecosystem has matured significantly by 2025-2026. <strong>LlamaCloud</strong> is the managed enterprise version with hosted ingestion and retrieval. <strong>LlamaParse</strong> is LlamaCloud\u2019s document parsing service \u2014 now the recommended ingestion layer for complex PDFs with tables, charts, and mixed layouts. It handles documents that basic text extraction mangles, which is most real enterprise documents. <strong>LlamaIndex Workflows</strong> is the latest abstraction for complex agentic document processing pipelines. The API has changed significantly across versions (v0.10+ introduced breaking changes), so always reference the current documentation.</p>
  <p>LlamaIndex\u2019s standout capability remains its document loader ecosystem via <strong>LlamaHub</strong>: pre-built connectors for Notion, Google Drive, Slack, Confluence, GitHub, and dozens more. Quality varies by connector \u2014 some are maintained by LlamaIndex, others by the community. The <strong>SubQuestionQueryEngine</strong> decomposes complex questions into sub-queries across different indexes, enabling analytical questions that simple embedding search can\u2019t answer. And <strong>permission-aware retrieval</strong> \u2014 filtering results to only documents the user can access \u2014 is essential for any enterprise deployment.</p>
  <p><strong>Competing frameworks</strong> for document intelligence: <strong>Unstructured.io</strong> (powerful open-source document parsing many teams use before LlamaIndex), <strong>Docling</strong> (IBM, open-source, high-quality document parsing released 2024), and <strong>Azure Document Intelligence</strong> (enterprise-grade OCR and form extraction). A PM should know when LlamaParse vs these alternatives is the right choice.</p>`,
  tasks: [
    { title: 'Compare LlamaParse vs basic text extraction', description: 'Upload a complex PDF (annual report or contract with tables) to LlamaParse (cloud.llamaindex.ai/parse) and compare extraction quality to basic PyPDF text extraction. What use cases justify the additional cost? Save as /day-21/llamaparse_comparison.md.', time: '25 min' },
    { title: 'Design a multi-source document pipeline', description: 'Your product ingests Confluence, Slack, and Google Drive. Design: sync frequency per source, handling deleted documents, metadata preservation, permission-gated retrieval, and incremental indexing. Save as /day-21/llamaindex_pipeline_design.md.', time: '25 min' },
    { title: 'Design permission-aware retrieval', description: 'For an enterprise product: how do you ensure search results only show documents the querying user has access to? Design the metadata schema, filtering logic, and sync mechanism for permissions. This is the #1 enterprise compliance requirement. Save as /day-21/permission_aware_retrieval_spec.md.', time: '20 min' },
    { title: 'Design a SubQuestion query', description: 'Write a complex business question requiring data from 3 sources. Decompose into 4 sub-questions. What data source does each need? How does the synthesis step combine them? Save as /day-21/subquestion_design.md.', time: '10 min' },
  ],
  codeExample: { title: 'LlamaIndex document pipeline \u2014 JavaScript', lang: 'js', code: `// LlamaIndex pipeline: Document → Node → Index → Query
// 2026 update: LlamaParse for complex docs, LlamaCloud for managed hosting

const LLAMAINDEX_STACK = {
  parsing: {
    basic: 'PyPDF, Unstructured.io — free, good for simple docs',
    llamaParse: 'LlamaParse — best for tables, charts, mixed layouts (paid)',
    docling: 'Docling (IBM) — open-source alternative for complex PDFs',
    azureDocIntel: 'Azure Document Intelligence — enterprise OCR + form extraction'
  },
  indexing: {
    vectorStore: 'pgvector / Pinecone / Qdrant with Voyage AI embeddings',
    keywordIndex: 'BM25 for hybrid search alongside vector',
    knowledgeGraph: 'For multi-hop reasoning (GraphRAG pattern)'
  },
  querying: {
    simple: 'VectorStoreQuery — basic semantic search',
    subQuestion: 'SubQuestionQueryEngine — decompose complex queries',
    router: 'RouterQueryEngine — route to best index per query type',
    agentic: 'AgentQueryEngine — agent decides retrieval strategy'
  }
};

// Permission-aware retrieval (enterprise requirement)
function permissionFilter(userId, results) {
  // In production: check each result's access_list metadata
  return results.filter(r => {
    const accessList = r.metadata.access_list || ['public'];
    return accessList.includes('public') || accessList.includes(userId);
  });
}

console.log('LLAMAINDEX STACK (2026)');
console.log('='.repeat(55));
Object.entries(LLAMAINDEX_STACK).forEach(([layer, options]) => {
  console.log('\\n' + layer.toUpperCase() + ':');
  Object.entries(options).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
});

console.log('\\nENTERPRISE REQUIREMENT: Permission-aware retrieval');
console.log('Every search result filtered by user access level');
console.log('Without this, document Q&A is a compliance nightmare');` },
  interview: { question: 'When would you use LlamaIndex vs LangChain for a document intelligence product?', answer: `LlamaIndex when the core problem is indexing and querying a large document corpus. It has deeper support for document loading (LlamaHub), parsing (LlamaParse for complex PDFs), chunking strategies, index types, and query decomposition (SubQuestionQueryEngine). The managed LlamaCloud offering adds hosted ingestion.<br><br>LangChain when you\u2019re building a general-purpose agent that orchestrates multiple capabilities \u2014 retrieval is one tool among many. LangGraph for agentic workflows with state and cycles.<br><br>In practice, many teams use both: LlamaIndex for the indexing/retrieval layer, LangChain for the orchestration layer calling retrieval as one tool. The interoperability is well-supported.<br><br>For enterprise document intelligence specifically, also evaluate: Unstructured.io for document parsing before LlamaIndex, LlamaParse for complex PDFs, and Azure Document Intelligence for OCR-heavy workflows. The parsing layer is often the hardest part \u2014 not the RAG logic itself.` },
  pmAngle: 'LlamaIndex\u2019s most underrated feature for enterprise sales is permission-aware retrieval \u2014 filtering results to documents the user can access. Without this, document Q&A products are a compliance nightmare. LlamaParse for complex document ingestion is the other key differentiator. Design both into your architecture from day one.',
  resources: [
    { type: 'DOCS', title: 'LlamaIndex Documentation', url: 'https://docs.llamaindex.ai', note: 'Start with quickstart, then document loaders and query engines.' },
    { type: 'TOOL', title: 'LlamaParse', url: 'https://cloud.llamaindex.ai/parse', note: 'Best document parsing for complex PDFs with tables and charts.' },
    { type: 'HUB', title: 'LlamaHub \u2014 Data Loaders', url: 'https://llamahub.ai', note: 'Pre-built connectors for 100+ data sources.' },
    { type: 'TOOL', title: 'Unstructured.io', url: 'https://unstructured.io/', note: 'Open-source document parsing. Many teams use before LlamaIndex.' },
    { type: 'BLOG', title: 'Anthropic: Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval', note: 'Apply contextual retrieval to LlamaIndex chunks for 67% fewer failures.' },
    { type: 'DOCS', title: 'Azure Document Intelligence', url: 'https://learn.microsoft.com/azure/ai-services/document-intelligence/', note: 'Enterprise OCR and form extraction alternative.' }
  ]
};
