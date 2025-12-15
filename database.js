// =============================================
// LECTURE DANGEREUSE - Database Module (Supabase)
// =============================================

class Database {
    constructor() {
        this.supabase = null;
        this.userId = this.getOrCreateUserId();
        this.connected = false;
        this.syncQueue = [];
        this.syncing = false;
    }

    getOrCreateUserId() {
        let userId = localStorage.getItem('ld_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ld_user_id', userId);
        }
        return userId;
    }

    async init(supabaseUrl, supabaseKey) {
        if (!supabaseUrl || !supabaseKey) {
            console.log('Supabase not configured, using local storage fallback');
            return false;
        }

        try {
            // Dynamic import of Supabase client
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.connected = true;
            console.log('Connected to Supabase');
            
            // Process any queued operations
            this.processSyncQueue();
            
            return true;
        } catch (e) {
            console.error('Supabase connection failed:', e);
            this.connected = false;
            return false;
        }
    }

    // =============================================
    // DOCUMENTS
    // =============================================
    
    async saveDocument(doc) {
        const docData = {
            id: doc.id,
            user_id: this.userId,
            name: doc.name,
            page_count: doc.pageCount,
            full_text: doc.fullText,
            updated_at: new Date().toISOString()
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('documents')
                    .upsert(docData);
                
                if (error) throw error;
                
                // Save pages
                if (doc.pages) {
                    for (const page of doc.pages) {
                        await this.savePage(doc.id, page);
                    }
                }
                
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving document to Supabase:', e);
                this.queueSync('document', docData);
            }
        }

        // Local fallback
        const docs = JSON.parse(localStorage.getItem('ld_documents') || '[]');
        const idx = docs.findIndex(d => d.id === doc.id);
        if (idx >= 0) {
            docs[idx] = { ...docs[idx], ...docData };
        } else {
            docs.push(docData);
        }
        localStorage.setItem('ld_documents', JSON.stringify(docs));
        
        return { success: true, synced: false };
    }

    async savePage(documentId, page) {
        const pageData = {
            id: `${documentId}-page-${page.number}`,
            document_id: documentId,
            page_number: page.number,
            text_content: page.text,
            paragraphs: page.paragraphs
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('pages')
                    .upsert(pageData);
                if (error) throw error;
            } catch (e) {
                console.error('Error saving page:', e);
            }
        }

        // Local fallback
        const pages = JSON.parse(localStorage.getItem('ld_pages') || '[]');
        const idx = pages.findIndex(p => p.id === pageData.id);
        if (idx >= 0) {
            pages[idx] = pageData;
        } else {
            pages.push(pageData);
        }
        localStorage.setItem('ld_pages', JSON.stringify(pages));
    }

    async getDocuments() {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('documents')
                    .select('*')
                    .eq('user_id', this.userId)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('Error fetching documents:', e);
            }
        }

        // Local fallback
        return JSON.parse(localStorage.getItem('ld_documents') || '[]');
    }

    async getDocument(docId) {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('documents')
                    .select('*')
                    .eq('id', docId)
                    .single();
                
                if (error) throw error;
                
                // Get pages
                const { data: pages } = await this.supabase
                    .from('pages')
                    .select('*')
                    .eq('document_id', docId)
                    .order('page_number');
                
                if (pages) {
                    data.pages = pages.map(p => ({
                        number: p.page_number,
                        text: p.text_content,
                        paragraphs: p.paragraphs
                    }));
                }
                
                return data;
            } catch (e) {
                console.error('Error fetching document:', e);
            }
        }

        // Local fallback
        const docs = JSON.parse(localStorage.getItem('ld_documents') || '[]');
        const doc = docs.find(d => d.id === docId);
        if (doc) {
            const pages = JSON.parse(localStorage.getItem('ld_pages') || '[]');
            doc.pages = pages
                .filter(p => p.document_id === docId)
                .sort((a, b) => a.page_number - b.page_number)
                .map(p => ({
                    number: p.page_number,
                    text: p.text_content,
                    paragraphs: p.paragraphs
                }));
        }
        return doc;
    }

    async deleteDocument(docId) {
        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('documents')
                    .delete()
                    .eq('id', docId);
                if (error) throw error;
            } catch (e) {
                console.error('Error deleting document:', e);
            }
        }

        // Local cleanup
        const docs = JSON.parse(localStorage.getItem('ld_documents') || '[]');
        localStorage.setItem('ld_documents', JSON.stringify(docs.filter(d => d.id !== docId)));
        
        const pages = JSON.parse(localStorage.getItem('ld_pages') || '[]');
        localStorage.setItem('ld_pages', JSON.stringify(pages.filter(p => p.document_id !== docId)));
    }

    // =============================================
    // CHUNKS & EMBEDDINGS
    // =============================================

    async saveChunk(chunk) {
        const chunkData = {
            id: chunk.id,
            document_id: chunk.docId,
            chunk_index: chunk.index,
            text_content: chunk.text,
            embedding: chunk.embedding
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('chunks')
                    .upsert(chunkData);
                if (error) throw error;
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving chunk:', e);
            }
        }

        // Local fallback (embeddings are large, be careful with localStorage limits)
        const chunks = JSON.parse(localStorage.getItem('ld_chunks') || '[]');
        const idx = chunks.findIndex(c => c.id === chunk.id);
        if (idx >= 0) {
            chunks[idx] = chunkData;
        } else {
            chunks.push(chunkData);
        }
        localStorage.setItem('ld_chunks', JSON.stringify(chunks));
        
        return { success: true, synced: false };
    }

    async searchChunks(queryEmbedding, documentId, limit = 5) {
        if (this.connected && queryEmbedding) {
            try {
                const { data, error } = await this.supabase
                    .rpc('search_chunks', {
                        query_embedding: queryEmbedding,
                        match_document_id: documentId,
                        match_count: limit
                    });
                
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('Vector search error:', e);
            }
        }

        // Local fallback - simple cosine similarity
        const chunks = JSON.parse(localStorage.getItem('ld_chunks') || '[]')
            .filter(c => c.document_id === documentId && c.embedding);
        
        if (!queryEmbedding || chunks.length === 0) return [];

        return chunks
            .map(c => ({
                ...c,
                similarity: this.cosineSimilarity(queryEmbedding, c.embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // =============================================
    // GRAPH (NODES & EDGES)
    // =============================================

    async saveNode(node) {
        const nodeData = {
            id: node.id,
            document_id: node.docId,
            label: node.label,
            node_type: node.type,
            description: node.description,
            source: node.source,
            annotation_id: node.annotationId,
            metadata: node.metadata
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('nodes')
                    .upsert(nodeData);
                if (error) throw error;
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving node:', e);
                this.queueSync('node', nodeData);
            }
        }

        // Local fallback
        const nodes = JSON.parse(localStorage.getItem('ld_nodes') || '[]');
        const idx = nodes.findIndex(n => n.id === node.id);
        if (idx >= 0) {
            nodes[idx] = nodeData;
        } else {
            nodes.push(nodeData);
        }
        localStorage.setItem('ld_nodes', JSON.stringify(nodes));
        
        return { success: true, synced: false };
    }

    async saveEdge(edge) {
        const edgeData = {
            id: edge.id,
            document_id: edge.docId,
            source_node_id: edge.source,
            target_node_id: edge.target,
            relationship: edge.relationship
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('edges')
                    .upsert(edgeData);
                if (error) throw error;
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving edge:', e);
            }
        }

        // Local fallback
        const edges = JSON.parse(localStorage.getItem('ld_edges') || '[]');
        const idx = edges.findIndex(e => e.id === edge.id);
        if (idx >= 0) {
            edges[idx] = edgeData;
        } else {
            edges.push(edgeData);
        }
        localStorage.setItem('ld_edges', JSON.stringify(edges));
        
        return { success: true, synced: false };
    }

    async getGraph(documentId) {
        if (this.connected) {
            try {
                const { data: nodes, error: nodesError } = await this.supabase
                    .from('nodes')
                    .select('*')
                    .eq('document_id', documentId);
                
                const { data: edges, error: edgesError } = await this.supabase
                    .from('edges')
                    .select('*')
                    .eq('document_id', documentId);
                
                if (nodesError || edgesError) throw nodesError || edgesError;
                
                return {
                    nodes: (nodes || []).map(n => ({
                        id: n.id,
                        docId: n.document_id,
                        label: n.label,
                        type: n.node_type,
                        description: n.description,
                        source: n.source
                    })),
                    edges: (edges || []).map(e => ({
                        id: e.id,
                        docId: e.document_id,
                        source: e.source_node_id,
                        target: e.target_node_id,
                        relationship: e.relationship
                    }))
                };
            } catch (e) {
                console.error('Error fetching graph:', e);
            }
        }

        // Local fallback
        const nodes = JSON.parse(localStorage.getItem('ld_nodes') || '[]')
            .filter(n => n.document_id === documentId);
        const edges = JSON.parse(localStorage.getItem('ld_edges') || '[]')
            .filter(e => e.document_id === documentId);
        
        return {
            nodes: nodes.map(n => ({
                id: n.id,
                docId: n.document_id,
                label: n.label,
                type: n.node_type,
                description: n.description,
                source: n.source
            })),
            edges: edges.map(e => ({
                id: e.id,
                docId: e.document_id,
                source: e.source_node_id,
                target: e.target_node_id,
                relationship: e.relationship
            }))
        };
    }

    // =============================================
    // ANNOTATIONS
    // =============================================

    async saveAnnotation(annotation) {
        const annData = {
            id: annotation.id,
            document_id: annotation.docId,
            user_id: this.userId,
            page_number: annotation.page,
            selected_text: annotation.text,
            annotation_type: annotation.type,
            note: annotation.note,
            concept_label: annotation.conceptLabel,
            updated_at: new Date().toISOString()
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('annotations')
                    .upsert(annData);
                if (error) throw error;
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving annotation:', e);
                this.queueSync('annotation', annData);
            }
        }

        // Local fallback
        const annotations = JSON.parse(localStorage.getItem('ld_annotations') || '[]');
        const idx = annotations.findIndex(a => a.id === annotation.id);
        if (idx >= 0) {
            annotations[idx] = annData;
        } else {
            annotations.push(annData);
        }
        localStorage.setItem('ld_annotations', JSON.stringify(annotations));
        
        return { success: true, synced: false };
    }

    async getAnnotations(documentId) {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('annotations')
                    .select('*')
                    .eq('document_id', documentId)
                    .order('created_at');
                
                if (error) throw error;
                
                return (data || []).map(a => ({
                    id: a.id,
                    docId: a.document_id,
                    page: a.page_number,
                    text: a.selected_text,
                    type: a.annotation_type,
                    note: a.note,
                    conceptLabel: a.concept_label
                }));
            } catch (e) {
                console.error('Error fetching annotations:', e);
            }
        }

        // Local fallback
        return JSON.parse(localStorage.getItem('ld_annotations') || '[]')
            .filter(a => a.document_id === documentId)
            .map(a => ({
                id: a.id,
                docId: a.document_id,
                page: a.page_number,
                text: a.selected_text,
                type: a.annotation_type,
                note: a.note,
                conceptLabel: a.concept_label
            }));
    }

    // =============================================
    // CONVERSATIONS & MESSAGES
    // =============================================

    async getOrCreateConversation(documentId) {
        if (this.connected) {
            try {
                // Check for existing
                let { data, error } = await this.supabase
                    .from('conversations')
                    .select('*')
                    .eq('document_id', documentId)
                    .eq('user_id', this.userId)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error;
                
                if (!data) {
                    // Create new
                    const { data: newConv, error: createError } = await this.supabase
                        .from('conversations')
                        .insert({
                            document_id: documentId,
                            user_id: this.userId
                        })
                        .select()
                        .single();
                    
                    if (createError) throw createError;
                    data = newConv;
                }
                
                return data;
            } catch (e) {
                console.error('Error with conversation:', e);
            }
        }

        // Local fallback
        const convs = JSON.parse(localStorage.getItem('ld_conversations') || '[]');
        let conv = convs.find(c => c.document_id === documentId);
        if (!conv) {
            conv = {
                id: 'conv_' + Date.now(),
                document_id: documentId,
                user_id: this.userId,
                created_at: new Date().toISOString()
            };
            convs.push(conv);
            localStorage.setItem('ld_conversations', JSON.stringify(convs));
        }
        return conv;
    }

    async saveMessage(conversationId, message) {
        const msgData = {
            id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            conversation_id: conversationId,
            role: message.role,
            content: message.content,
            agent_name: message.agentName,
            metadata: message.metadata
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('messages')
                    .insert(msgData);
                if (error) throw error;
                
                // Update conversation timestamp
                await this.supabase
                    .from('conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', conversationId);
                
                return { success: true, synced: true, id: msgData.id };
            } catch (e) {
                console.error('Error saving message:', e);
                this.queueSync('message', msgData);
            }
        }

        // Local fallback
        const messages = JSON.parse(localStorage.getItem('ld_messages') || '[]');
        messages.push(msgData);
        localStorage.setItem('ld_messages', JSON.stringify(messages));
        
        return { success: true, synced: false, id: msgData.id };
    }

    async getMessages(conversationId) {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at');
                
                if (error) throw error;
                
                return (data || []).map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    agentName: m.agent_name
                }));
            } catch (e) {
                console.error('Error fetching messages:', e);
            }
        }

        // Local fallback
        return JSON.parse(localStorage.getItem('ld_messages') || '[]')
            .filter(m => m.conversation_id === conversationId)
            .map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                agentName: m.agent_name
            }));
    }

    // =============================================
    // SYNC QUEUE (for offline support)
    // =============================================

    queueSync(type, data) {
        this.syncQueue.push({ type, data, timestamp: Date.now() });
        localStorage.setItem('ld_sync_queue', JSON.stringify(this.syncQueue));
    }

    async processSyncQueue() {
        if (this.syncing || !this.connected) return;
        
        this.syncing = true;
        const queue = JSON.parse(localStorage.getItem('ld_sync_queue') || '[]');
        
        for (const item of queue) {
            try {
                switch (item.type) {
                    case 'document':
                        await this.supabase.from('documents').upsert(item.data);
                        break;
                    case 'node':
                        await this.supabase.from('nodes').upsert(item.data);
                        break;
                    case 'annotation':
                        await this.supabase.from('annotations').upsert(item.data);
                        break;
                    case 'message':
                        await this.supabase.from('messages').insert(item.data);
                        break;
                }
            } catch (e) {
                console.error('Sync error:', e);
            }
        }
        
        this.syncQueue = [];
        localStorage.setItem('ld_sync_queue', '[]');
        this.syncing = false;
    }

    // =============================================
    // SETTINGS
    // =============================================

    async saveSettings(settings) {
        const data = {
            user_id: this.userId,
            preferences: settings,
            updated_at: new Date().toISOString()
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('user_settings')
                    .upsert(data);
                if (error) throw error;
            } catch (e) {
                console.error('Error saving settings:', e);
            }
        }

        localStorage.setItem('ld_settings', JSON.stringify(settings));
    }

    async getSettings() {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('user_settings')
                    .select('preferences')
                    .eq('user_id', this.userId)
                    .single();
                
                if (data?.preferences) {
                    localStorage.setItem('ld_settings', JSON.stringify(data.preferences));
                    return data.preferences;
                }
            } catch (e) {
                // Not found is ok
            }
        }

        return JSON.parse(localStorage.getItem('ld_settings') || '{}');
    }

    // =============================================
    // VOCABULARY
    // =============================================

    async saveVocabulary(vocab) {
        const vocabData = {
            id: vocab.id,
            document_id: vocab.docId,
            user_id: this.userId,
            word: vocab.word,
            translation: vocab.translation,
            note: vocab.note,
            word_type: vocab.type,
            review_count: vocab.reviewCount || 0,
            last_reviewed: vocab.lastReviewed,
            created_at: vocab.createdAt || new Date().toISOString()
        };

        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('vocabulary')
                    .upsert(vocabData);
                if (error) throw error;
                return { success: true, synced: true };
            } catch (e) {
                console.error('Error saving vocabulary:', e);
            }
        }

        // Local fallback
        const vocabulary = JSON.parse(localStorage.getItem('ld_vocabulary') || '[]');
        const idx = vocabulary.findIndex(v => v.id === vocab.id);
        if (idx >= 0) {
            vocabulary[idx] = vocabData;
        } else {
            vocabulary.push(vocabData);
        }
        localStorage.setItem('ld_vocabulary', JSON.stringify(vocabulary));
        
        return { success: true, synced: false };
    }

    async getVocabulary(documentId) {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('vocabulary')
                    .select('*')
                    .eq('document_id', documentId)
                    .eq('user_id', this.userId)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                return (data || []).map(v => ({
                    id: v.id,
                    docId: v.document_id,
                    word: v.word,
                    translation: v.translation,
                    note: v.note,
                    type: v.word_type,
                    reviewCount: v.review_count,
                    lastReviewed: v.last_reviewed,
                    createdAt: v.created_at
                }));
            } catch (e) {
                console.error('Error fetching vocabulary:', e);
            }
        }

        // Local fallback
        return JSON.parse(localStorage.getItem('ld_vocabulary') || '[]')
            .filter(v => v.document_id === documentId)
            .map(v => ({
                id: v.id,
                docId: v.document_id,
                word: v.word,
                translation: v.translation,
                note: v.note,
                type: v.word_type,
                reviewCount: v.review_count,
                lastReviewed: v.last_reviewed,
                createdAt: v.created_at
            }));
    }

    async deleteVocabulary(vocabId) {
        if (this.connected) {
            try {
                const { error } = await this.supabase
                    .from('vocabulary')
                    .delete()
                    .eq('id', vocabId);
                if (error) throw error;
            } catch (e) {
                console.error('Error deleting vocabulary:', e);
            }
        }

        // Local cleanup
        const vocabulary = JSON.parse(localStorage.getItem('ld_vocabulary') || '[]');
        localStorage.setItem('ld_vocabulary', JSON.stringify(vocabulary.filter(v => v.id !== vocabId)));
    }

    async getAllVocabulary() {
        if (this.connected) {
            try {
                const { data, error } = await this.supabase
                    .from('vocabulary')
                    .select('*')
                    .eq('user_id', this.userId)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('Error fetching all vocabulary:', e);
            }
        }

        return JSON.parse(localStorage.getItem('ld_vocabulary') || '[]');
    }
}

// Export singleton
window.db = new Database();
