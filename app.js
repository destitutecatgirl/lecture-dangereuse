// =============================================
// LECTURE DANGEREUSE - Main Application
// =============================================

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// =============================================
// STATE
// =============================================
const state = {
    // Config
    supabaseUrl: '',
    supabaseKey: '',
    claudeKey: '',
    openaiKey: '',
    
    // Connection
    dbConnected: false,
    syncing: false,
    
    // View
    view: 'upload',
    teacherTab: 'teacher',
    showApiModal: false,
    
    // Documents
    documents: [],
    activeDoc: null,
    currentPage: 1,
    pages: [],
    
    // Selection
    selection: null,
    selectionPopup: null,
    annotationPanel: null,
    
    // Graph
    nodes: [],
    edges: [],
    selectedNode: null,
    
    // Annotations
    annotations: [],
    
    // Conversation
    conversationId: null,
    messages: [],
    inputText: '',
    
    // Agent nudges
    agentNudges: [],
    
    // Loading & Progress
    loading: {},
    progress: { value: 0, text: '' },
    
    // Toasts
    toasts: [],
    
    // Language Features
    vocabulary: [],
    translationPopup: null,
    showVocabulary: false,
    targetLang: 'en', // Translation target language
    sourceLang: 'fr', // Source language detection
    hoverTranslate: true, // Enable hover translation
    translationCache: {} // Cache translations
};

// =============================================
// LEXICON - Common French Academic/Theoretical Terms
// =============================================
const LEXICON = {
    // Connectors & Academic French
    "en effet": { translation: "indeed, in fact", type: "connector", note: "Confirms and reinforces previous statement" },
    "dès lors": { translation: "from then on, therefore", type: "connector", note: "Indicates consequence or temporal shift" },
    "or": { translation: "now, but, however", type: "connector", note: "NOT 'or' in English! Introduces contrast or new point" },
    "certes": { translation: "certainly, admittedly", type: "connector", note: "Concedes a point before counter-argument" },
    "autrui": { translation: "the other, others", type: "philosophical", note: "Philosophical term for 'the Other'" },
    "soit": { translation: "either...or, that is, let it be", type: "connector", note: "Multiple uses in academic French" },
    "voire": { translation: "even, or even, indeed", type: "connector", note: "Intensifies the preceding claim" },
    "pourtant": { translation: "yet, however, nevertheless", type: "connector", note: "Strong contrast marker" },
    "d'ailleurs": { translation: "moreover, besides, by the way", type: "connector", note: "Adds supporting information" },
    "néanmoins": { translation: "nevertheless, nonetheless", type: "connector", note: "Formal concessive connector" },
    "autrement dit": { translation: "in other words", type: "connector", note: "Reformulation marker" },
    "à savoir": { translation: "namely, that is to say", type: "connector", note: "Introduces specification" },
    "en revanche": { translation: "on the other hand, in contrast", type: "connector", note: "Marks opposition" },
    "quant à": { translation: "as for, regarding", type: "connector", note: "Topic shift marker" },
    "ainsi": { translation: "thus, so, in this way", type: "connector", note: "Conclusive or exemplifying" },
    "lors de": { translation: "during, at the time of", type: "temporal", note: "Formal temporal marker" },
    "au sein de": { translation: "within, in the heart of", type: "spatial", note: "Formal 'within'" },
    
    // Decolonial/Theoretical Terms
    "violence": { translation: "violence", type: "concept", note: "Fanon: Not aberration but foundation of colonial order" },
    "colonisé": { translation: "the colonized", type: "concept", note: "Fanon/Memmi: Actively produced by colonizer, not passive state" },
    "décolonisation": { translation: "decolonization", type: "concept", note: "Fanon: Not reform but rupture, 'always a violent phenomenon'" },
    "nécropolitique": { translation: "necropolitics", type: "concept", note: "Mbembe: Politics of death, sovereignty as capacity to kill" },
    "opacité": { translation: "opacity", type: "concept", note: "Glissant: Right to not be understood, against colonial transparency" },
    "maquis": { translation: "the bush, underground resistance", type: "concept", note: "Space of resistance outside colonial control" },
    "métropole": { translation: "metropole, mother country", type: "colonial", note: "The colonizing country (e.g., France)" },
    "indigène": { translation: "native, indigenous", type: "colonial", note: "Colonial category; see 'Code de l'Indigénat'" },
    "assimilation": { translation: "assimilation", type: "colonial", note: "French colonial policy of cultural absorption" },
    "évolué": { translation: "evolved one", type: "colonial", note: "Colonial term for 'assimilated' Africans" },
    "négritude": { translation: "negritude", type: "concept", note: "Césaire/Senghor: Black consciousness movement" },
    "aliénation": { translation: "alienation", type: "concept", note: "Fanon: Psychological dispossession under colonialism" },
    "conscience": { translation: "consciousness, conscience", type: "philosophical", note: "Both awareness and moral sense" },
    "être": { translation: "being, to be", type: "philosophical", note: "Ontological term" },
    "autrui": { translation: "the Other", type: "philosophical", note: "Levinas/Sartre: the Other as philosophical concept" },
    "vécu": { translation: "lived experience", type: "philosophical", note: "Phenomenological term (Erlebnis)" },
    "rapport": { translation: "relationship, report, ratio", type: "academic", note: "Context-dependent; often 'relationship'" },
    "mise en valeur": { translation: "development, exploitation", type: "colonial", note: "Colonial euphemism for economic exploitation" },
    "travail forcé": { translation: "forced labor", type: "colonial", note: "Colonial labor extraction system" },
    "chef de canton": { translation: "canton chief", type: "colonial", note: "Colonial administrative position" },
    "commandant de cercle": { translation: "district commander", type: "colonial", note: "French colonial administrator" }
};

// Language codes for translation
const LANGUAGES = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'pt': 'Portuguese',
    'ar': 'Arabic',
    'zh': 'Chinese',
    'tr': 'Turkish'
};

// =============================================
// INITIALIZATION
// =============================================
async function init() {
    // Load saved config
    state.supabaseUrl = localStorage.getItem('ld_supabase_url') || '';
    state.supabaseKey = localStorage.getItem('ld_supabase_key') || '';
    state.claudeKey = localStorage.getItem('ld_claude_key') || '';
    state.openaiKey = localStorage.getItem('ld_openai_key') || '';
    
    // Initialize database
    if (state.supabaseUrl && state.supabaseKey) {
        state.dbConnected = await window.db.init(state.supabaseUrl, state.supabaseKey);
    }
    
    // Load documents
    state.documents = await window.db.getDocuments();
    
    render();
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info') {
    const id = Date.now();
    state.toasts.push({ id, message, type });
    render();
    
    setTimeout(() => {
        state.toasts = state.toasts.filter(t => t.id !== id);
        render();
    }, 3000);
}

// =============================================
// API CALLS
// =============================================
async function callClaude(prompt, maxTokens = 2000) {
    if (!state.claudeKey) throw new Error('Claude API key not set');
    
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': state.claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    
    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
}

async function getEmbedding(text) {
    if (!state.openaiKey) throw new Error('OpenAI API key not set');
    
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.openaiKey}`
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.substring(0, 8000)
        })
    });
    
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.data[0].embedding;
}

// =============================================
// TRANSLATION & LANGUAGE FEATURES
// =============================================

// Check lexicon first for instant lookup
function checkLexicon(text) {
    const normalized = text.toLowerCase().trim();
    
    // Direct match
    if (LEXICON[normalized]) {
        return LEXICON[normalized];
    }
    
    // Check for partial matches (for compound terms)
    for (const [term, data] of Object.entries(LEXICON)) {
        if (normalized.includes(term) || term.includes(normalized)) {
            return { ...data, matchedTerm: term };
        }
    }
    
    return null;
}

// Instant translation using Claude
async function translateText(text, targetLang = 'en', sourceLang = null) {
    if (!text?.trim()) return null;
    
    // Check cache first
    const cacheKey = `${text.toLowerCase().trim()}_${targetLang}`;
    if (state.translationCache[cacheKey]) {
        return state.translationCache[cacheKey];
    }
    
    // Check lexicon for instant lookup
    const lexiconEntry = checkLexicon(text);
    if (lexiconEntry && targetLang === 'en') {
        const result = {
            original: text,
            translation: lexiconEntry.translation,
            type: lexiconEntry.type,
            note: lexiconEntry.note,
            source: 'lexicon',
            matchedTerm: lexiconEntry.matchedTerm
        };
        state.translationCache[cacheKey] = result;
        return result;
    }
    
    // Use Claude for translation
    if (!state.claudeKey) {
        return { original: text, translation: '(Set Claude API key for translation)', source: 'none' };
    }
    
    try {
        const langName = LANGUAGES[targetLang] || 'English';
        const prompt = `Translate this text to ${langName}. If it's academic or theoretical French, preserve nuance.

Text: "${text}"

Respond with JSON only:
{
  "translation": "the translation",
  "notes": "brief note on meaning/usage if relevant, or null",
  "detectedLang": "detected source language code"
}`;

        const response = await callClaude(prompt, 500);
        const match = response.match(/\{[\s\S]*\}/);
        
        if (match) {
            const data = JSON.parse(match[0]);
            const result = {
                original: text,
                translation: data.translation,
                note: data.notes,
                detectedLang: data.detectedLang,
                source: 'claude'
            };
            state.translationCache[cacheKey] = result;
            return result;
        }
    } catch (e) {
        console.error('Translation error:', e);
    }
    
    return { original: text, translation: '(Translation failed)', source: 'error' };
}

// Show translation popup on text selection or hover
async function showTranslation(text, x, y, isHover = false) {
    if (!text?.trim() || text.length < 2) {
        state.translationPopup = null;
        render();
        return;
    }
    
    // Show loading state
    state.translationPopup = {
        text: text,
        x: Math.min(x, window.innerWidth - 320),
        y: Math.min(y + 10, window.innerHeight - 200),
        loading: true,
        isHover: isHover
    };
    render();
    
    // Get translation
    const result = await translateText(text, state.targetLang);
    
    if (result) {
        state.translationPopup = {
            ...state.translationPopup,
            loading: false,
            translation: result.translation,
            note: result.note,
            type: result.type,
            source: result.source,
            matchedTerm: result.matchedTerm
        };
        render();
    }
}

// Hide translation popup
function hideTranslation() {
    if (state.translationPopup?.isHover) {
        state.translationPopup = null;
        render();
    }
}

// Save word to vocabulary
async function saveToVocabulary(word, translation, note = '', type = '') {
    const vocabEntry = {
        id: 'vocab_' + Date.now(),
        word: word,
        translation: translation,
        note: note,
        type: type,
        docId: state.activeDoc?.id,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null
    };
    
    // Save to database
    await window.db.saveVocabulary(vocabEntry);
    state.vocabulary.push(vocabEntry);
    
    showToast(`"${word}" saved to vocabulary`, 'success');
    render();
}

// Load vocabulary for current document
async function loadVocabulary() {
    if (state.activeDoc) {
        state.vocabulary = await window.db.getVocabulary(state.activeDoc.id);
    }
}

// Deep analysis of a term (grammar, etymology, usage)
async function analyzeWord(word) {
    if (!state.claudeKey) return null;
    
    try {
        const prompt = `Analyze this French word/phrase for a student reading decolonial theory:

Word: "${word}"

Provide detailed analysis in JSON:
{
  "word": "${word}",
  "translation": "English translation",
  "partOfSpeech": "noun/verb/connector/etc",
  "etymology": "brief etymology if relevant",
  "academicUsage": "how it's used in academic/theoretical French",
  "examples": ["example sentence 1", "example sentence 2"],
  "relatedTerms": ["related term 1", "related term 2"],
  "commonMistakes": "common misunderstandings for English speakers",
  "theoreticalContext": "if this is a theoretical term, who uses it and how"
}`;

        const response = await callClaude(prompt, 1000);
        const match = response.match(/\{[\s\S]*\}/);
        
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (e) {
        console.error('Word analysis error:', e);
    }
    
    return null;
}

// Handle double-click for instant translation
function handleWordDoubleClick(e) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 1) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showTranslation(text, rect.left, rect.bottom, false);
    }
}

// Handle hover for translation (with delay)
let hoverTimeout = null;
function handleWordHover(e) {
    if (!state.hoverTranslate) return;
    
    clearTimeout(hoverTimeout);
    
    // Check if hovering over a word
    const target = e.target;
    if (target.classList.contains('word-hoverable')) {
        hoverTimeout = setTimeout(() => {
            const text = target.textContent || target.innerText;
            const rect = target.getBoundingClientRect();
            showTranslation(text, rect.left, rect.bottom, true);
        }, 500); // 500ms delay
    }
}

function handleWordHoverEnd() {
    clearTimeout(hoverTimeout);
    // Delay hiding to allow moving to popup
    setTimeout(() => {
        if (state.translationPopup?.isHover) {
            hideTranslation();
        }
    }, 300);
}

// =============================================
// PDF PROCESSING
// =============================================
async function processPDF(file) {
    state.loading.pdf = true;
    state.progress = { value: 0, text: 'Loading PDF...' };
    render();
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const doc = {
            id: 'doc_' + Date.now(),
            name: file.name,
            pageCount: pdf.numPages,
            createdAt: new Date().toISOString()
        };
        
        const pages = [];
        const allText = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
            state.progress = { value: (i / pdf.numPages) * 30, text: `Extracting page ${i}/${pdf.numPages}...` };
            render();
            
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ').trim();
            
            pages.push({
                number: i,
                text: pageText,
                paragraphs: pageText.split(/\n\n+/).filter(p => p.trim().length > 20)
            });
            allText.push(pageText);
        }
        
        doc.pages = pages;
        doc.fullText = allText.join('\n\n');
        
        // Save to database
        state.progress = { value: 35, text: 'Saving document...' };
        render();
        const saveResult = await window.db.saveDocument(doc);
        
        if (saveResult.synced) {
            showToast('Document saved to cloud', 'success');
        } else {
            showToast('Document saved locally', 'info');
        }
        
        state.documents.push(doc);
        
        // Build knowledge graph
        await buildKnowledgeGraph(doc);
        
        // Load document
        state.activeDoc = doc;
        state.pages = pages;
        state.currentPage = 1;
        state.view = 'reading';
        
        // Load graph
        const graph = await window.db.getGraph(doc.id);
        state.nodes = graph.nodes;
        state.edges = graph.edges;
        
        // Load annotations
        state.annotations = await window.db.getAnnotations(doc.id);
        
        // Initialize conversation
        const conv = await window.db.getOrCreateConversation(doc.id);
        state.conversationId = conv.id;
        state.messages = await window.db.getMessages(conv.id);
        
        // Start teacher if new
        if (state.messages.length === 0) {
            await initTeacher();
        }
        
        showToast('Document ready!', 'success');
        
    } catch (e) {
        console.error('PDF processing error:', e);
        showToast('Error processing PDF: ' + e.message, 'error');
    }
    
    state.loading.pdf = false;
    state.progress = { value: 0, text: '' };
    render();
}

// =============================================
// KNOWLEDGE GRAPH
// =============================================
async function buildKnowledgeGraph(doc) {
    if (!state.claudeKey) {
        state.progress = { value: 100, text: 'Skipping graph (no Claude key)' };
        return;
    }
    
    state.progress = { value: 40, text: 'Extracting concepts...' };
    render();
    
    // Chunk the document
    const chunks = [];
    const chunkSize = 1500;
    const text = doc.fullText;
    
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push({
            id: `${doc.id}-chunk-${chunks.length}`,
            docId: doc.id,
            text: text.substring(i, i + chunkSize),
            index: chunks.length
        });
    }
    
    // Extract concepts with Claude
    const conceptPrompt = `Analyze this text about anticolonial history. Extract key concepts, people, events, places and their relationships.

TEXT:
${chunks.slice(0, 3).map(c => c.text).join('\n\n').substring(0, 4000)}

Return JSON:
{
  "nodes": [{"id": "unique_id", "label": "Name", "type": "concept|person|event|place|theory", "description": "Brief description"}],
  "edges": [{"source": "node_id", "target": "node_id", "relationship": "description"}]
}`;

    try {
        const response = await callClaude(conceptPrompt, 2500);
        const match = response.match(/\{[\s\S]*\}/);
        
        if (match) {
            const graph = JSON.parse(match[0]);
            
            // Save nodes
            for (const node of graph.nodes || []) {
                const nodeData = {
                    id: `${doc.id}-${node.id}`,
                    docId: doc.id,
                    label: node.label,
                    type: node.type || 'concept',
                    description: node.description || '',
                    source: 'extraction'
                };
                await window.db.saveNode(nodeData);
            }
            
            // Save edges
            for (const edge of graph.edges || []) {
                const edgeData = {
                    id: `${doc.id}-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    docId: doc.id,
                    source: `${doc.id}-${edge.source}`,
                    target: `${doc.id}-${edge.target}`,
                    relationship: edge.relationship
                };
                await window.db.saveEdge(edgeData);
            }
        }
    } catch (e) {
        console.error('Graph extraction error:', e);
    }
    
    // Generate embeddings
    if (state.openaiKey) {
        state.progress = { value: 60, text: 'Generating embeddings...' };
        render();
        
        for (let i = 0; i < Math.min(chunks.length, 20); i++) {
            try {
                chunks[i].embedding = await getEmbedding(chunks[i].text);
                await window.db.saveChunk(chunks[i]);
                state.progress = { 
                    value: 60 + (i / Math.min(chunks.length, 20)) * 35, 
                    text: `Embedding chunk ${i + 1}...` 
                };
                render();
            } catch (e) {
                console.error('Embedding error:', e);
                break;
            }
        }
    }
    
    state.progress = { value: 100, text: 'Complete!' };
    render();
}

// =============================================
// SEMANTIC SEARCH
// =============================================
async function semanticSearch(query, topK = 5) {
    if (!state.openaiKey || !state.activeDoc) return [];
    
    try {
        const queryEmbedding = await getEmbedding(query);
        return await window.db.searchChunks(queryEmbedding, state.activeDoc.id, topK);
    } catch (e) {
        console.error('Search error:', e);
        return [];
    }
}

// =============================================
// TEACHER SYSTEM
// =============================================
async function initTeacher() {
    const intro = {
        role: 'teacher',
        content: `Welcome. I see you've uploaded "${state.activeDoc?.name || 'a document'}".

Before we begin, I want you to approach this text actively. As you read:
• **Annotate** passages that strike you
• **Question** what seems unclear
• **Connect** ideas to what you know
• **Identify** concepts for our mind map

Read the first page slowly. When something catches your attention—select it and annotate.

What draws your eye first?`
    };
    
    state.messages.push(intro);
    await window.db.saveMessage(state.conversationId, intro);
    render();
}

async function sendToTeacher(text) {
    if (!text?.trim() || !state.claudeKey) return;
    
    const studentMsg = { role: 'student', content: text };
    state.messages.push(studentMsg);
    await window.db.saveMessage(state.conversationId, studentMsg);
    
    state.inputText = '';
    state.loading.teacher = true;
    render();
    
    try {
        // Get relevant context
        let context = '';
        if (state.openaiKey) {
            const relevant = await semanticSearch(text, 3);
            if (relevant.length) {
                context = '\n\nRELEVANT PASSAGES:\n' + relevant.map(r => r.text_content || r.text).join('\n---\n');
            }
        }
        
        const recentAnnotations = state.annotations.slice(-5).map(a => 
            `[${a.type}] "${a.text.substring(0, 50)}...": ${a.note}`
        ).join('\n');
        
        const prompt = `You are a rigorous but encouraging teacher of decolonial studies and Francophone African history.
You're guiding a student through "${state.activeDoc?.name || 'a text'}".

Your approach:
- Ask leading questions rather than giving answers
- Push for precision: "What exactly do you mean by...?"
- Connect to Fanon, Césaire, Mbembe, Glissant
- Challenge oversimplifications while being supportive
- Encourage annotation and close reading

Current page: ${state.currentPage}
${context}

Recent annotations:
${recentAnnotations || '(none yet)'}

Conversation:
${state.messages.slice(-8).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

STUDENT: ${text}

Respond as their teacher. Be specific. Ask them to annotate if they haven't.`;

        const response = await callClaude(prompt, 1200);
        const teacherMsg = { role: 'teacher', content: response };
        state.messages.push(teacherMsg);
        await window.db.saveMessage(state.conversationId, teacherMsg);
        
        // Maybe trigger agent nudge
        maybeNudgeAgent(text, response);
        
    } catch (e) {
        const errorMsg = { role: 'teacher', content: `I encountered an error: ${e.message}` };
        state.messages.push(errorMsg);
    }
    
    state.loading.teacher = false;
    render();
    
    setTimeout(() => {
        const container = document.querySelector('.teacher-content');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
}

// =============================================
// AGENT NUDGES
// =============================================
const AGENTS = {
    archiviste: {
        name: "L'Archiviste",
        trigger: ['source', 'document', 'archive', 'when', 'date', 'record'],
        prompt: `You are L'Archiviste. Offer a brief observation about primary sources, dates, or archival gaps. One paragraph max.`
    },
    sceptique: {
        name: "Le Sceptique",
        trigger: ['but', 'however', 'problem', 'missing', 'absent', 'silent'],
        prompt: `You are Le Sceptique. Raise ONE pointed question about what's missing or unquestioned.`
    },
    theoricien: {
        name: "Le Théoricien",
        trigger: ['fanon', 'theory', 'concept', 'violence', 'colonial', 'power', 'mbembe'],
        prompt: `You are Le Théoricien. Offer ONE brief theoretical connection. Name specific thinkers. Two sentences max.`
    }
};

async function maybeNudgeAgent(studentText, teacherResponse) {
    if (!state.claudeKey || Math.random() > 0.3) return;
    
    const combined = (studentText + ' ' + teacherResponse).toLowerCase();
    
    for (const [id, agent] of Object.entries(AGENTS)) {
        if (agent.trigger.some(t => combined.includes(t))) {
            try {
                const nudge = await callClaude(`${agent.prompt}

Student said: "${studentText}"
Teacher responded: ${teacherResponse.substring(0, 200)}

Your brief interjection:`, 300);
                
                state.agentNudges.push({ id: Date.now(), agent: id, name: agent.name, content: nudge });
                render();
            } catch (e) {
                console.error('Agent nudge error:', e);
            }
            break;
        }
    }
}

function dismissNudge(id) {
    state.agentNudges = state.agentNudges.filter(n => n.id !== id);
    render();
}

// =============================================
// ANNOTATIONS
// =============================================
function handleTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
        state.selection = null;
        state.selectionPopup = null;
        render();
        return;
    }
    
    const text = selection.toString().trim();
    if (text.length < 3) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    state.selection = { text, range, page: state.currentPage };
    state.selectionPopup = { x: rect.left + (rect.width / 2) - 100, y: rect.bottom + 10 };
    render();
}

function openAnnotationPanel(type) {
    if (!state.selection) return;
    
    const rect = state.selection.range.getBoundingClientRect();
    state.annotationPanel = {
        text: state.selection.text,
        type: type,
        note: '',
        conceptLabel: '',
        x: Math.min(rect.left, window.innerWidth - 340),
        y: Math.min(rect.bottom + 10, window.innerHeight - 400)
    };
    state.selectionPopup = null;
    render();
}

async function saveAnnotation() {
    if (!state.annotationPanel || !state.activeDoc) return;
    
    const annotation = {
        id: `${state.activeDoc.id}-ann-${Date.now()}`,
        docId: state.activeDoc.id,
        text: state.annotationPanel.text,
        type: state.annotationPanel.type,
        note: state.annotationPanel.note,
        page: state.currentPage,
        conceptLabel: state.annotationPanel.conceptLabel
    };
    
    const result = await window.db.saveAnnotation(annotation);
    state.annotations.push(annotation);
    
    // Add to graph if concept
    if (state.annotationPanel.type === 'concept' || state.annotationPanel.conceptLabel) {
        const node = {
            id: `${state.activeDoc.id}-node-${Date.now()}`,
            docId: state.activeDoc.id,
            label: state.annotationPanel.conceptLabel || state.annotationPanel.text.substring(0, 30),
            type: state.annotationPanel.type === 'concept' ? 'concept' : state.annotationPanel.type,
            description: state.annotationPanel.note,
            source: 'annotation',
            annotationId: annotation.id
        };
        await window.db.saveNode(node);
        state.nodes.push(node);
    }
    
    // Log to conversation
    const sysMsg = {
        role: 'system',
        content: `[Annotation: ${annotation.type}] "${annotation.text.substring(0, 50)}..." — ${annotation.note || '(no note)'}`
    };
    state.messages.push(sysMsg);
    await window.db.saveMessage(state.conversationId, sysMsg);
    
    showToast(result.synced ? 'Annotation saved to cloud' : 'Annotation saved locally', 'success');
    
    state.annotationPanel = null;
    state.selection = null;
    window.getSelection().removeAllRanges();
    render();
}

function closeAnnotationPanel() {
    state.annotationPanel = null;
    state.selection = null;
    state.selectionPopup = null;
    window.getSelection().removeAllRanges();
    render();
}

// =============================================
// DOCUMENT MANAGEMENT
// =============================================
async function loadDocument(docId) {
    state.loading.doc = true;
    render();
    
    const doc = await window.db.getDocument(docId);
    if (!doc) {
        showToast('Document not found', 'error');
        state.loading.doc = false;
        render();
        return;
    }
    
    state.activeDoc = doc;
    state.pages = doc.pages || [];
    state.currentPage = 1;
    
    // Load graph
    const graph = await window.db.getGraph(docId);
    state.nodes = graph.nodes;
    state.edges = graph.edges;
    
    // Load annotations
    state.annotations = await window.db.getAnnotations(docId);
    
    // Load vocabulary
    state.vocabulary = await window.db.getVocabulary(docId);
    
    // Load conversation
    const conv = await window.db.getOrCreateConversation(docId);
    state.conversationId = conv.id;
    state.messages = await window.db.getMessages(conv.id);
    
    state.view = 'reading';
    
    if (state.messages.length === 0 && state.claudeKey) {
        await initTeacher();
    }
    
    state.loading.doc = false;
    render();
}

async function deleteDocument(docId, e) {
    e.stopPropagation();
    if (!confirm('Delete this document and all annotations?')) return;
    
    await window.db.deleteDocument(docId);
    state.documents = state.documents.filter(d => d.id !== docId);
    
    if (state.activeDoc?.id === docId) {
        state.activeDoc = null;
        state.view = 'upload';
    }
    
    showToast('Document deleted', 'info');
    render();
}

// =============================================
// SETTINGS
// =============================================
function saveApiKeys() {
    const supabaseUrl = document.getElementById('supabase-url-input')?.value;
    const supabaseKey = document.getElementById('supabase-key-input')?.value;
    const claudeKey = document.getElementById('claude-key-input')?.value;
    const openaiKey = document.getElementById('openai-key-input')?.value;
    
    if (supabaseUrl) {
        state.supabaseUrl = supabaseUrl;
        localStorage.setItem('ld_supabase_url', supabaseUrl);
    }
    if (supabaseKey) {
        state.supabaseKey = supabaseKey;
        localStorage.setItem('ld_supabase_key', supabaseKey);
    }
    if (claudeKey) {
        state.claudeKey = claudeKey;
        localStorage.setItem('ld_claude_key', claudeKey);
    }
    if (openaiKey) {
        state.openaiKey = openaiKey;
        localStorage.setItem('ld_openai_key', openaiKey);
    }
    
    // Reconnect to Supabase if configured
    if (supabaseUrl && supabaseKey) {
        window.db.init(supabaseUrl, supabaseKey).then(connected => {
            state.dbConnected = connected;
            if (connected) {
                showToast('Connected to Supabase', 'success');
            }
            render();
        });
    }
    
    state.showApiModal = false;
    showToast('Settings saved', 'success');
    render();
}

// =============================================
// FILE HANDLING
// =============================================
function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.type === 'application/pdf') processPDF(file);
}

function handleFileSelect(e) {
    const file = e.target?.files?.[0];
    if (file?.type === 'application/pdf') processPDF(file);
}

// =============================================
// MIND MAP
// =============================================
function renderMindMap() {
    const container = document.getElementById('mindmap-svg');
    if (!container || !state.nodes.length) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    d3.select(container).selectAll('*').remove();
    
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    
    const nodeIds = new Set(state.nodes.map(n => n.id));
    const links = state.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    
    const simulation = d3.forceSimulation(state.nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));
    
    const link = svg.append('g').selectAll('line').data(links).enter().append('line').attr('class', 'link');
    
    const node = svg.append('g').selectAll('g').data(state.nodes).enter().append('g')
        .attr('class', d => `node ${d.type}${state.selectedNode?.id === d.id ? ' selected' : ''}`)
        .call(d3.drag()
            .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
        )
        .on('click', (e, d) => { state.selectedNode = d; render(); });
    
    node.append('circle').attr('r', d => d.source === 'annotation' ? 8 : 12).attr('stroke-width', 2);
    node.append('text').attr('dx', 15).attr('dy', 4).text(d => d.label?.substring(0, 20) || '');
    
    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// =============================================
// RENDER
// =============================================
function render() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <header>
            <h1>LECTURE DANGEREUSE</h1>
            <div class="status-bar">
                <div class="status-indicator">
                    <span class="status-dot ${state.dbConnected ? 'connected' : ''}"></span>
                    <span>${state.dbConnected ? 'Cloud' : 'Local'}</span>
                </div>
                ${state.activeDoc ? `
                    <div class="lang-toggle">
                        <select onchange="state.targetLang=this.value" title="Translation target">
                            ${Object.entries(LANGUAGES).map(([code, name]) => 
                                `<option value="${code}" ${state.targetLang === code ? 'selected' : ''}>${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
            <nav>
                <button class="nav-btn ${state.view === 'upload' ? 'active' : ''}" onclick="state.view='upload';render()">Documents</button>
                ${state.activeDoc ? `
                    <button class="nav-btn ${state.view === 'reading' ? 'active' : ''}" onclick="state.view='reading';render()">Read</button>
                    <button class="nav-btn ${state.view === 'mindmap' ? 'active' : ''}" onclick="state.view='mindmap';render();setTimeout(renderMindMap,100)">Mind Map</button>
                    <button class="nav-btn ${state.view === 'vocabulary' ? 'active' : ''}" onclick="state.view='vocabulary';render()">Vocab (${state.vocabulary.length})</button>
                ` : ''}
                <button class="nav-btn ${state.claudeKey ? 'api-set' : 'api-missing'}" onclick="state.showApiModal=true;render()">
                    ${state.claudeKey ? 'Settings ✓' : 'Setup'}
                </button>
            </nav>
        </header>
        
        <div class="main-content">
            ${state.view === 'upload' ? renderUploadView() : ''}
            ${state.view === 'reading' ? renderReadingView() : ''}
            ${state.view === 'mindmap' ? renderMindMapView() : ''}
            ${state.view === 'vocabulary' ? renderVocabularyView() : ''}
        </div>
        
        ${state.selectionPopup ? renderSelectionPopup() : ''}
        ${state.annotationPanel ? renderAnnotationPanel() : ''}
        ${state.translationPopup ? renderTranslationPopup() : ''}
        ${state.showApiModal ? renderApiModal() : ''}
        ${renderToasts()}
    `;
    
    // Attach event listeners
    if (state.view === 'reading') {
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.addEventListener('mouseup', handleTextSelection);
            pageContent.addEventListener('dblclick', handleWordDoubleClick);
            pageContent.addEventListener('mouseover', handleWordHover);
            pageContent.addEventListener('mouseout', handleWordHoverEnd);
        }
    }
    
    if (state.view === 'mindmap') setTimeout(renderMindMap, 50);
}

function renderUploadView() {
    return `
        <div class="upload-screen">
            <div class="upload-zone" ondrop="handleDrop(event)" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" onclick="document.getElementById('file-input').click()">
                <input type="file" id="file-input" accept=".pdf" onchange="handleFileSelect(event)">
                <div class="icon">📖</div>
                <h2>Upload PDF to Begin</h2>
                <p>Drop a PDF here or click to browse</p>
                ${!state.claudeKey ? '<p style="color:var(--danger);margin-top:0.5rem;font-size:0.75rem">Click Setup to configure API keys →</p>' : ''}
            </div>
            
            ${state.loading.pdf ? `
                <div class="progress-container" style="width:100%;max-width:500px">
                    <div class="progress-bar"><div class="progress-fill" style="width:${state.progress.value}%"></div></div>
                    <p class="progress-text">${state.progress.text}</p>
                </div>
            ` : ''}
            
            ${state.documents.length ? `
                <div class="recent-docs">
                    <h3>Your Documents</h3>
                    ${state.documents.map(doc => `
                        <div class="doc-item" onclick="loadDocument('${doc.id}')">
                            <div>
                                <h4>${escapeHtml(doc.name)}</h4>
                                <p>${doc.page_count || doc.pageCount || '?'} pages</p>
                            </div>
                            <div class="meta">
                                <span class="sync-status">${state.dbConnected ? '☁️' : '💾'}</span>
                                <button class="remove" onclick="deleteDocument('${doc.id}', event)">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function renderReadingView() {
    const page = state.pages[state.currentPage - 1];
    const pageAnnotations = state.annotations.filter(a => a.page === state.currentPage);
    
    let pageHtml = '';
    if (page) {
        pageHtml = (page.paragraphs || [page.text]).map(p => {
            let text = typeof p === 'string' ? p : p.text || '';
            
            // Make individual words hoverable for translation
            const words = text.split(/(\s+)/);
            const processedWords = words.map(word => {
                if (/^\s+$/.test(word)) return word; // Keep whitespace
                
                const cleanWord = word.replace(/[.,;:!?«»""''()\[\]–—]/g, '').toLowerCase();
                const isInLexicon = LEXICON[cleanWord];
                const isInVocab = state.vocabulary.some(v => v.word.toLowerCase() === cleanWord);
                
                let classes = 'word-hoverable';
                if (isInLexicon) classes += ' word-lexicon';
                if (isInVocab) classes += ' word-saved';
                
                return `<span class="${classes}">${escapeHtml(word)}</span>`;
            }).join('');
            
            // Apply annotation highlights
            let result = processedWords;
            for (const ann of pageAnnotations) {
                const escaped = escapeHtml(ann.text);
                if (result.includes(escaped)) {
                    result = result.replace(escaped, `<span class="highlight ${ann.type}" title="${escapeHtml(ann.note || '')}">${escaped}</span>`);
                }
            }
            
            return `<p>${result}</p>`;
        }).join('');
    }
    
    return `
        <div class="reading-view">
            <div class="reader-panel">
                <div class="reader-toolbar">
                    <span class="doc-title">${escapeHtml(state.activeDoc?.name || 'Document')}</span>
                    <div class="page-nav">
                        <button onclick="state.currentPage=Math.max(1,state.currentPage-1);render()" ${state.currentPage <= 1 ? 'disabled' : ''}>←</button>
                        <span>Page ${state.currentPage} of ${state.pages.length}</span>
                        <button onclick="state.currentPage=Math.min(state.pages.length,state.currentPage+1);render()" ${state.currentPage >= state.pages.length ? 'disabled' : ''}>→</button>
                    </div>
                    <div class="toolbar-actions">
                        <label class="hover-toggle" title="Toggle hover translation">
                            <input type="checkbox" ${state.hoverTranslate ? 'checked' : ''} onchange="state.hoverTranslate=this.checked">
                            <span>Hover translate</span>
                        </label>
                    </div>
                </div>
                <div class="reader-content">
                    <div class="page-content">
                        ${pageHtml || '<p style="color:var(--text-muted)">No text on this page</p>'}
                    </div>
                </div>
                <div class="reader-footer">
                    <span class="footer-stat">${pageAnnotations.length} annotations</span>
                    <span class="footer-stat">${state.vocabulary.length} saved words</span>
                    <span class="footer-hint">Double-click word to translate · Select text to annotate</span>
                </div>
            </div>
            
            <div class="teacher-panel">
                <div class="teacher-header">
                    <h2>Your Teacher</h2>
                    <div class="teacher-tabs">
                        <button class="teacher-tab ${state.teacherTab === 'teacher' ? 'active' : ''}" onclick="state.teacherTab='teacher';render()">Dialogue</button>
                        <button class="teacher-tab ${state.teacherTab === 'annotations' ? 'active' : ''}" onclick="state.teacherTab='annotations';render()">Notes (${state.annotations.length})</button>
                        <button class="teacher-tab ${state.teacherTab === 'lexicon' ? 'active' : ''}" onclick="state.teacherTab='lexicon';render()">Lexicon</button>
                    </div>
                </div>
                
                <div class="teacher-content">
                    ${state.teacherTab === 'teacher' ? renderTeacherChat() : ''}
                    ${state.teacherTab === 'annotations' ? renderAnnotationsList() : ''}
                    ${state.teacherTab === 'lexicon' ? renderLexiconPanel() : ''}
                </div>
                
                <div class="teacher-input">
                    <textarea placeholder="Respond to your teacher..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendToTeacher(this.value);this.value='';}" ${!state.claudeKey ? 'disabled' : ''}></textarea>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="sendToTeacher(document.querySelector('.teacher-input textarea').value)" ${!state.claudeKey ? 'disabled' : ''}>
                            ${state.loading.teacher ? 'Thinking...' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTeacherChat() {
    return `
        ${state.agentNudges.map(nudge => `
            <div class="agent-nudge">
                <div class="agent-name">${nudge.name}</div>
                <div class="nudge-content">${escapeHtml(nudge.content)}</div>
                <button class="dismiss" onclick="dismissNudge(${nudge.id})">Dismiss</button>
            </div>
        `).join('')}
        
        ${state.messages.map(m => `
            <div class="message ${m.role}">
                <div class="role">${m.role === 'teacher' ? 'Teacher' : m.role === 'student' ? 'You' : 'System'}</div>
                <div class="content">${escapeHtml(m.content)}</div>
            </div>
        `).join('')}
        
        ${!state.messages.length ? '<div class="message system"><div class="content">Click Setup to configure API keys, then upload a document.</div></div>' : ''}
    `;
}

function renderAnnotationsList() {
    return `
        ${state.annotations.length ? state.annotations.map(a => `
            <div class="node-card">
                <div class="type">${a.type} · Page ${a.page}</div>
                <h4>"${escapeHtml(a.text.substring(0, 50))}${a.text.length > 50 ? '...' : ''}"</h4>
                <p>${escapeHtml(a.note || '(no note)')}</p>
            </div>
        `).join('') : '<div class="message system"><div class="content">No annotations yet. Select text while reading to annotate.</div></div>'}
    `;
}

function renderMindMapView() {
    return `
        <div class="mindmap-view">
            <div class="mindmap-container">
                <div id="mindmap-svg" class="mindmap-svg"></div>
            </div>
            <div class="mindmap-sidebar">
                <h3>Concept Map · ${state.nodes.length} nodes</h3>
                <div class="node-details">
                    ${state.selectedNode ? `
                        <div class="node-card">
                            <div class="type">${state.selectedNode.type} · ${state.selectedNode.source}</div>
                            <h4>${escapeHtml(state.selectedNode.label || '')}</h4>
                            <p>${escapeHtml(state.selectedNode.description || 'No description')}</p>
                        </div>
                    ` : '<div class="empty">Click a node to see details</div>'}
                </div>
                <div class="mindmap-controls">
                    <button class="btn btn-secondary" onclick="state.view='reading';render()">← Back to Reading</button>
                </div>
            </div>
        </div>
    `;
}

function renderSelectionPopup() {
    return `
        <div class="selection-popup" style="left:${state.selectionPopup.x}px;top:${state.selectionPopup.y}px">
            <button onclick="showTranslation('${escapeHtml(state.selection?.text || '')}', ${state.selectionPopup.x}, ${state.selectionPopup.y})">Translate</button>
            <button onclick="openAnnotationPanel('annotation')">Annotate</button>
            <button onclick="openAnnotationPanel('question')">Question</button>
            <button onclick="openAnnotationPanel('insight')">Insight</button>
            <button onclick="openAnnotationPanel('concept')">+ Concept</button>
            <button onclick="closeAnnotationPanel()">✕</button>
        </div>
    `;
}

function renderAnnotationPanel() {
    const p = state.annotationPanel;
    return `
        <div class="annotation-panel" style="left:${p.x}px;top:${p.y}px">
            <button class="close" onclick="closeAnnotationPanel()">✕</button>
            <div class="selected-text">"${escapeHtml(p.text.substring(0, 150))}${p.text.length > 150 ? '...' : ''}"</div>
            
            <label>Type</label>
            <div class="type-buttons">
                <button class="type-btn ${p.type === 'annotation' ? 'active' : ''}" onclick="state.annotationPanel.type='annotation';render()">Note</button>
                <button class="type-btn ${p.type === 'question' ? 'active' : ''}" onclick="state.annotationPanel.type='question';render()">Question</button>
                <button class="type-btn ${p.type === 'insight' ? 'active' : ''}" onclick="state.annotationPanel.type='insight';render()">Insight</button>
                <button class="type-btn ${p.type === 'concept' ? 'active' : ''}" onclick="state.annotationPanel.type='concept';render()">Concept</button>
            </div>
            
            ${p.type === 'concept' ? `
                <label>Concept Label</label>
                <input type="text" value="${escapeHtml(p.conceptLabel || '')}" onchange="state.annotationPanel.conceptLabel=this.value" placeholder="${p.text.substring(0, 30)}">
            ` : ''}
            
            <label>Your Note</label>
            <textarea onchange="state.annotationPanel.note=this.value" placeholder="Your thoughts...">${escapeHtml(p.note || '')}</textarea>
            
            <button class="btn btn-primary" style="width:100%" onclick="saveAnnotation()">Save</button>
        </div>
    `;
}

function renderApiModal() {
    return `
        <div class="modal-bg" onclick="state.showApiModal=false;render()">
            <div class="modal" onclick="event.stopPropagation()">
                <h2>Setup</h2>
                <p>Configure your API keys and cloud storage. All keys are stored in your browser.</p>
                
                <label style="display:block;font-size:0.7rem;color:var(--accent);margin-bottom:0.25rem;margin-top:0.5rem">Supabase URL (optional - for cloud sync)</label>
                <input type="text" id="supabase-url-input" placeholder="https://xxx.supabase.co" value="${state.supabaseUrl}">
                
                <label style="display:block;font-size:0.7rem;color:var(--accent);margin-bottom:0.25rem">Supabase Anon Key</label>
                <input type="password" id="supabase-key-input" placeholder="eyJ..." value="${state.supabaseKey}">
                
                <label style="display:block;font-size:0.7rem;color:var(--accent);margin-bottom:0.25rem;margin-top:1rem">Claude API Key (required)</label>
                <input type="password" id="claude-key-input" placeholder="sk-ant-..." value="${state.claudeKey}">
                
                <label style="display:block;font-size:0.7rem;color:var(--success);margin-bottom:0.25rem;margin-top:0.5rem">OpenAI API Key (for embeddings)</label>
                <input type="password" id="openai-key-input" placeholder="sk-..." value="${state.openaiKey}">
                
                <div class="actions">
                    <button class="btn btn-secondary" onclick="state.showApiModal=false;render()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveApiKeys()">Save</button>
                </div>
                
                <p style="font-size:0.7rem;color:var(--text-muted);margin-top:1rem">
                    <a href="https://supabase.com" target="_blank" style="color:var(--accent)">supabase.com</a> · 
                    <a href="https://console.anthropic.com" target="_blank" style="color:var(--accent)">anthropic</a> · 
                    <a href="https://platform.openai.com" target="_blank" style="color:var(--success)">openai</a>
                </p>
            </div>
        </div>
    `;
}

function renderToasts() {
    if (!state.toasts.length) return '';
    return `
        <div class="toast-container">
            ${state.toasts.map(t => `<div class="toast ${t.type}">${escapeHtml(t.message)}</div>`).join('')}
        </div>
    `;
}

function renderTranslationPopup() {
    const p = state.translationPopup;
    return `
        <div class="translation-popup" style="left:${p.x}px;top:${p.y}px" 
            onmouseenter="clearTimeout(hoverTimeout)" 
            onmouseleave="hideTranslation()">
            <button class="close" onclick="state.translationPopup=null;render()">✕</button>
            
            <div class="trans-original">${escapeHtml(p.text)}</div>
            
            ${p.loading ? `
                <div class="trans-loading">Translating...</div>
            ` : `
                <div class="trans-result">
                    ${p.matchedTerm ? `<div class="trans-matched">Matched: "${escapeHtml(p.matchedTerm)}"</div>` : ''}
                    <div class="trans-translation">${escapeHtml(p.translation || '')}</div>
                    ${p.type ? `<div class="trans-type">${escapeHtml(p.type)}</div>` : ''}
                    ${p.note ? `<div class="trans-note">${escapeHtml(p.note)}</div>` : ''}
                    <div class="trans-source">via ${p.source || 'unknown'}</div>
                </div>
                
                <div class="trans-actions">
                    <button class="btn btn-small btn-primary" onclick="saveToVocabulary('${escapeHtml(p.text)}', '${escapeHtml(p.translation || '')}', '${escapeHtml(p.note || '')}', '${escapeHtml(p.type || '')}');state.translationPopup=null;render()">
                        + Save to Vocab
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="analyzeWordDeep('${escapeHtml(p.text)}')">
                        Deep Analysis
                    </button>
                </div>
            `}
        </div>
    `;
}

// Deep word analysis
async function analyzeWordDeep(word) {
    state.translationPopup.loading = true;
    state.translationPopup.analysisMode = true;
    render();
    
    const analysis = await analyzeWord(word);
    
    if (analysis) {
        state.translationPopup = {
            ...state.translationPopup,
            loading: false,
            analysis: analysis
        };
    } else {
        state.translationPopup.loading = false;
    }
    render();
}

function renderVocabularyView() {
    const groupedVocab = {};
    state.vocabulary.forEach(v => {
        const type = v.type || 'general';
        if (!groupedVocab[type]) groupedVocab[type] = [];
        groupedVocab[type].push(v);
    });
    
    return `
        <div class="vocabulary-view">
            <div class="vocab-header">
                <h2>Your Vocabulary</h2>
                <p>${state.vocabulary.length} words saved from "${escapeHtml(state.activeDoc?.name || 'this document')}"</p>
            </div>
            
            <div class="vocab-controls">
                <input type="text" placeholder="Search vocabulary..." class="vocab-search" oninput="filterVocabulary(this.value)">
                <button class="btn btn-secondary" onclick="exportVocabulary()">Export</button>
            </div>
            
            <div class="vocab-list">
                ${state.vocabulary.length === 0 ? `
                    <div class="vocab-empty">
                        <p>No words saved yet.</p>
                        <p>Double-click words while reading to translate and save them.</p>
                    </div>
                ` : ''}
                
                ${Object.entries(groupedVocab).map(([type, words]) => `
                    <div class="vocab-group">
                        <h3 class="vocab-group-title">${escapeHtml(type)}</h3>
                        ${words.map(v => `
                            <div class="vocab-card">
                                <div class="vocab-word">${escapeHtml(v.word)}</div>
                                <div class="vocab-translation">${escapeHtml(v.translation)}</div>
                                ${v.note ? `<div class="vocab-note">${escapeHtml(v.note)}</div>` : ''}
                                <div class="vocab-meta">
                                    <span>Added ${new Date(v.createdAt).toLocaleDateString()}</span>
                                    <button class="vocab-delete" onclick="deleteVocabulary('${v.id}')">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            
            <div class="vocab-footer">
                <button class="btn btn-secondary" onclick="state.view='reading';render()">← Back to Reading</button>
            </div>
        </div>
    `;
}

function renderLexiconPanel() {
    const types = ['connector', 'concept', 'colonial', 'philosophical', 'academic', 'temporal', 'spatial'];
    const groupedLexicon = {};
    
    Object.entries(LEXICON).forEach(([term, data]) => {
        const type = data.type || 'other';
        if (!groupedLexicon[type]) groupedLexicon[type] = [];
        groupedLexicon[type].push({ term, ...data });
    });
    
    return `
        <div class="lexicon-panel">
            <div class="lexicon-intro">
                <p>Common French academic terms and decolonial concepts. Click to see details.</p>
            </div>
            
            ${types.filter(t => groupedLexicon[t]).map(type => `
                <div class="lexicon-group">
                    <h4 class="lexicon-type">${escapeHtml(type)}</h4>
                    ${groupedLexicon[type].map(entry => `
                        <div class="lexicon-item" onclick="showLexiconDetail('${escapeHtml(entry.term)}')">
                            <span class="lexicon-term">${escapeHtml(entry.term)}</span>
                            <span class="lexicon-trans">${escapeHtml(entry.translation)}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

function showLexiconDetail(term) {
    const entry = LEXICON[term];
    if (!entry) return;
    
    state.translationPopup = {
        text: term,
        translation: entry.translation,
        type: entry.type,
        note: entry.note,
        source: 'lexicon',
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 3,
        loading: false
    };
    render();
}

async function deleteVocabulary(id) {
    await window.db.deleteVocabulary(id);
    state.vocabulary = state.vocabulary.filter(v => v.id !== id);
    showToast('Word removed from vocabulary', 'info');
    render();
}

function exportVocabulary() {
    const data = state.vocabulary.map(v => `${v.word}\t${v.translation}\t${v.note || ''}\t${v.type || ''}`).join('\n');
    const header = 'Word\tTranslation\tNote\tType\n';
    const blob = new Blob([header + data], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_${state.activeDoc?.name || 'export'}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vocabulary exported', 'success');
}

function filterVocabulary(query) {
    // Simple client-side filter - could be improved
    const cards = document.querySelectorAll('.vocab-card');
    const q = query.toLowerCase();
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Start app
init();
