# Lecture Dangereuse

**Interactive reading tool for decolonial studies** with AI-powered annotation, knowledge graphs, and long-term memory.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 📖 **PDF Reader** - Upload and read PDFs with clean typography
- ✍️ **Smart Annotations** - Annotate, question, highlight, add concepts
- 🧠 **AI Teacher** - Guided reading with Socratic questioning
- 🕸️ **Knowledge Graph** - Auto-extracted concepts + your annotations as mind map
- 🔍 **Semantic Search** - Find relevant passages using embeddings
- ☁️ **Cloud Sync** - Auto-save everything to Supabase (optional)
- 💾 **Offline Support** - Works locally, syncs when connected

### 🌍 Language Features (NEW)

- **Instant Translation** - Double-click any word for instant translation
- **Hover Translation** - Hover over words (toggle on/off) for quick lookup
- **Built-in Lexicon** - 50+ French academic/theoretical terms pre-defined
- **Vocabulary Tracker** - Save words to your personal vocabulary
- **Multi-language** - Translate to English, Spanish, German, Portuguese, Arabic, Chinese, Turkish
- **Deep Word Analysis** - Get etymology, usage, examples, theoretical context
- **Export Vocabulary** - Download your saved words as TSV file

## Quick Start

### 1. Deploy to GitHub Pages

```bash
# Fork this repo, then enable GitHub Pages:
# Settings → Pages → Source: Deploy from branch → main → / (root)
```

Your site will be live at: `https://yourusername.github.io/lecture-dangereuse`

### 2. Set Up Supabase (Free Cloud Storage)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to **SQL Editor** → Run the schema in `sql/schema.sql`
4. Go to **Settings → API** → Copy your:
   - Project URL: `https://xxx.supabase.co`
   - Anon public key: `eyJ...`

### 3. Get API Keys

- **Claude** (required): [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** (optional, for embeddings): [platform.openai.com](https://platform.openai.com/api-keys)

### 4. Configure

Click **Setup** in the app and enter your keys. All keys are stored locally in your browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (GitHub Pages)                   │
├─────────────────────────────────────────────────────────────┤
│  index.html                                                  │
│  ├── css/style.css                                          │
│  └── js/                                                    │
│      ├── database.js   → Supabase client + local fallback   │
│      └── app.js        → Main application logic             │
├─────────────────────────────────────────────────────────────┤
│                          APIs                                │
│  ├── Claude API        → Teacher, concept extraction        │
│  ├── OpenAI API        → Embeddings for semantic search     │
│  └── Supabase          → PostgreSQL + pgvector storage      │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
documents          -- Uploaded PDFs
├── pages          -- Page-by-page text
├── chunks         -- Chunked text + embeddings (vector)
├── nodes          -- Graph nodes (concepts, people, events)
├── edges          -- Graph relationships
├── annotations    -- User annotations
└── conversations  -- Teacher dialogues
    └── messages   -- Individual messages
```

## Local Development

```bash
# Clone
git clone https://github.com/yourusername/lecture-dangereuse.git
cd lecture-dangereuse

# Serve locally (any static server works)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000

# Open http://localhost:8000
```

## How It Works

### 1. PDF Upload
- PDF.js extracts text from each page
- Claude extracts key concepts, people, events, places
- OpenAI generates embeddings for semantic search
- Everything auto-saves to Supabase (or localStorage)

### 2. Reading with Teacher
- AI teacher guides you through close reading
- Asks Socratic questions, pushes for precision
- Connects your observations to Fanon, Mbembe, Césaire
- Agents occasionally interject with sources, critique, theory

### 3. Language Learning
- **Double-click** any word for instant translation
- **Hover** over words for quick lookup (toggle in toolbar)
- **Gold underlined** words are in the built-in lexicon
- **Green background** words are already in your vocabulary
- Click **+ Save to Vocab** to remember words
- Access **Lexicon** tab for pre-defined academic terms
- View all saved words in **Vocab** page

### 4. Annotation
- Select text → choose type (Note, Question, Insight, Concept)
- Concepts automatically added to the mind map
- All annotations persist across sessions

### 5. Mind Map
- D3.js force-directed graph
- Auto-extracted nodes (larger) + your annotations (smaller)
- Click nodes to see descriptions and connections

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla JS, HTML, CSS |
| PDF Parsing | PDF.js |
| Visualization | D3.js |
| Database | Supabase (PostgreSQL + pgvector) |
| AI Teacher | Claude API |
| Embeddings | OpenAI API |
| Hosting | GitHub Pages |

## Privacy

- API keys stored **only** in your browser's localStorage
- Data syncs to **your own** Supabase instance
- No tracking, no analytics, no third-party data sharing

## Customization

### Change AI Model
In `js/app.js`:
```javascript
model: 'claude-sonnet-4-20250514'  // Change to claude-3-haiku-20240307 for cheaper
```

### Adjust Agents
In `js/app.js`, modify the `AGENTS` object to add/remove/customize agent nudges.

### Styling
All styles in `css/style.css` use CSS variables:
```css
:root {
    --bg-primary: #0a0806;
    --accent: #c4a060;
    /* ... */
}
```

## Roadmap

- [ ] Collaborative annotations (realtime with Supabase)
- [ ] Export to Obsidian/Notion
- [ ] Multiple documents in single graph
- [ ] Citation extraction
- [ ] Audio reading mode

## Credits

Built for studying texts like:
- **Achille Mbembe** - *La Naissance du Maquis dans le Sud-Cameroun*
- **Frantz Fanon** - *Les Damnés de la Terre*
- **Aimé Césaire** - *Discours sur le colonialisme*
- **Édouard Glissant** - *Poétique de la Relation*

## License

MIT - Use freely, modify, share.

---

**Questions?** Open an issue or PR.
