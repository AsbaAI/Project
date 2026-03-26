// ===== CommGen AI v5.0 — Backend API Server =====
// Multi-provider: Claude Opus / GPT-4o / Gemini / Azure AI / Mistral / Custom
// Handles: streaming generation, .docx parsing, SSE transport

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Anthropic = require('@anthropic-ai/sdk');
const { default: OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3457;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors({ origin: ['http://localhost:3456', 'http://127.0.0.1:3456'] }));
app.use(express.json({ limit: '10mb' }));

// ── In-memory runtime config ──────────────────────────────────────────────────
let runtimeConfig = {
  provider: process.env.AI_PROVIDER || 'claude',
  apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
  model: process.env.AI_MODEL || 'claude-opus-4-6',
  endpoint: process.env.AI_ENDPOINT || '',
  deployment: process.env.AI_DEPLOYMENT || ''
};

// ── Provider base URLs (OpenAI-compatible) ────────────────────────────────────
const PROVIDER_ENDPOINTS = {
  gpt:     'https://api.openai.com/v1',
  gemini:  'https://generativelanguage.googleapis.com/v1beta/openai/',
  mistral: 'https://api.mistral.ai/v1',
  azure:   null, // set per-request from config
  custom:  null  // set per-request from config
};

// ── System Prompt ─────────────────────────────────────────────────────────────
const STELLANTIS_SYSTEM_PROMPT = `Tu es CommGen AI, un expert en rédaction de communications techniques officielles pour Stellantis Aftersales & Services.

Contexte Stellantis:
- Applications: Service Box (PANIER/Basket), DMS, HUB, DMBR (BrandCare/AllureCare Forms), BRR, CEM/SAGAI, CIN
- Programmes: BrandCare 8 ans, AllureCare 8 ans (marchés G10 EU: FR, DE, IT, ES, UK, NL, PT, PL, BE, AT)
- Acronymes clés: DFS = Document Fonctionnel de Spécification, CAP = numéro de capacité, PNR = numéro de pièce
- Authentification: Ping Federate IDP OAuth 2.0 token (APIC URL)
- Intégrations: JWT token entre PANIER → HUB → DMBR

Style de communication Stellantis:
- Ton professionnel et précis
- Structure claire: En-tête officiel, Contexte, Évolutions, Bug Fixes (tableau), Informations de déploiement, Plan de test, Know-How
- Les communications sont envoyées aux filiales/concessionnaires dans toute l'Europe
- Chaque bug fix doit avoir: Description, Comment détecté, Item concerné, Tickets JIRA, Commentaire technique

Tu génères des communications COMPLÈTES et PROFESSIONNELLES basées sur les spécifications fournies.
Utilise TOUJOURS les vraies informations extraites des documents — ne génère pas de contenu fictif.
Si une information manque dans les specs, indique [À COMPLÉTER] clairement.`;

// ── Prompt Builder ─────────────────────────────────────────────────────────────
function buildGenerationPrompt(specText, templateText, language, options) {
  const langLabel = { en: 'Anglais', fr: 'Français', de: 'Allemand', it: 'Italien', es: 'Espagnol', pt: 'Portugais', nl: 'Néerlandais', pl: 'Polonais' }[language] || 'Anglais';

  return `Génère une communication officielle Stellantis complète en ${langLabel} basée sur:

SPÉCIFICATION DFS/CAP/PNR:
${specText ? specText.substring(0, 8000) : '[Aucune spécification fournie — utilise les données du template]'}

TEMPLATE DE COMMUNICATION:
${templateText ? templateText.substring(0, 4000) : '[Template de bibliothèque: ${options.templateType || "basket-720"}]'}

INSTRUCTIONS DE GÉNÉRATION:
Génère une réponse JSON structurée avec exactement ce format:

{
  "communication": "<HTML complet de la communication officielle avec tous les styles inline. Inclure: bannière Stellantis, en-tête officiel, contexte, évolutions, bug fixes tableau, informations de déploiement, architecture système>",
  "qualityScore": <nombre entre 60 et 98>,
  "qualityDetails": {
    "completeness": <0-100>,
    "technical": <0-100>,
    "compliance": <0-100>,
    "clarity": <0-100>
  },
  "acronyms": [
    {"term": "PANIER", "definition": "Plateforme ANcrage Internet Et Réseau", "reference": "Section 1.2", "status": "validated"}
  ],
  "testPlan": [
    {"id": "TC-001", "category": "Functional", "description": "...", "steps": "...", "expected": "...", "priority": "Critical"}
  ],
  "knowHow": [
    {"title": "...", "content": "..."}
  ],
  "validationPassed": ["...", "..."],
  "validationIssues": ["...", "..."]
}

IMPORTANT:
- Génère au minimum 5 acronymes, 10 cas de test, 4 sections know-how
- Le champ "communication" doit être du HTML complet stylisé (pas de markdown)
- Extrait les vraies informations des documents fournis`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '5.0.0',
    aiEnabled: !!(runtimeConfig.apiKey && runtimeConfig.apiKey.length > 10),
    provider: runtimeConfig.provider,
    model: runtimeConfig.model,
    keyPreview: runtimeConfig.apiKey ? `...${runtimeConfig.apiKey.slice(-6)}` : null
  });
});

app.post('/api/config', (req, res) => {
  const { apiKey, provider, model, endpoint, deployment } = req.body;
  if (!apiKey || apiKey.length < 10) {
    return res.status(400).json({ error: 'Clé d\'accès invalide' });
  }
  runtimeConfig = {
    apiKey: apiKey.trim(),
    provider: provider || runtimeConfig.provider,
    model: model || runtimeConfig.model,
    endpoint: endpoint || runtimeConfig.endpoint,
    deployment: deployment || runtimeConfig.deployment
  };
  res.json({ success: true, provider: runtimeConfig.provider, keyPreview: `...${runtimeConfig.apiKey.slice(-6)}` });
});

app.post('/api/test-key', async (req, res) => {
  const { apiKey, provider, model, endpoint, deployment } = req.body;
  const key = apiKey || runtimeConfig.apiKey;
  const prov = provider || runtimeConfig.provider || 'claude';
  const mod = model || runtimeConfig.model;

  if (!key) return res.status(400).json({ error: 'Aucune clé fournie' });

  try {
    if (prov === 'claude') {
      const client = new Anthropic({ apiKey: key });
      await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] });
    } else {
      const baseURL = getBaseURL(prov, endpoint, deployment, key);
      const client = new OpenAI({ apiKey: prov === 'azure' ? key : key, baseURL, defaultHeaders: prov === 'azure' ? { 'api-key': key } : undefined });
      await client.chat.completions.create({ model: mod || 'gpt-4o-mini', max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] });
    }
    res.json({ valid: true, message: `Connexion ${prov.toUpperCase()} réussie ✓` });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

function getBaseURL(provider, endpoint, deployment, apiKey) {
  if (provider === 'azure') {
    // Azure uses: https://{resource}.openai.azure.com/openai/deployments/{deployment}/
    const ep = endpoint || '';
    const dep = deployment || 'gpt-4o';
    return `${ep.replace(/\/$/, '')}/openai/deployments/${dep}`;
  }
  if (provider === 'custom') return endpoint || 'http://localhost:11434/v1';
  return PROVIDER_ENDPOINTS[provider] || 'https://api.openai.com/v1';
}

// ── MAIN: Generate communication (SSE streaming) ──────────────────────────────
app.post('/api/generate', upload.fields([
  { name: 'spec', maxCount: 1 },
  { name: 'template', maxCount: 1 }
]), async (req, res) => {

  // Resolve config: request headers > runtime > env
  const apiKey = req.headers['x-api-key'] || runtimeConfig.apiKey;
  const provider = req.headers['x-provider'] || runtimeConfig.provider || 'claude';
  const model = req.headers['x-model'] || runtimeConfig.model;
  const endpoint = req.headers['x-endpoint'] || runtimeConfig.endpoint;
  const deployment = req.headers['x-deployment'] || runtimeConfig.deployment;

  if (!apiKey) {
    return res.status(401).json({ error: 'Clé d\'accès non configurée. Allez dans Paramètres.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let specText = req.body.specText || '';
    let templateText = req.body.templateText || '';

    if (req.files?.spec?.[0]) {
      send({ type: 'status', message: '📄 Extraction du fichier DFS...' });
      const result = await mammoth.extractRawText({ buffer: req.files.spec[0].buffer });
      specText = result.value;
    }

    if (req.files?.template?.[0]) {
      send({ type: 'status', message: '📋 Extraction du template...' });
      const result = await mammoth.extractRawText({ buffer: req.files.template[0].buffer });
      templateText = result.value;
    }

    const language = req.body.language || 'en';
    const templateType = req.body.templateType || 'basket-720';
    const prompt = buildGenerationPrompt(specText, templateText, language, { templateType });

    send({ type: 'status', message: `🤖 ${provider.toUpperCase()} — génération en cours...` });

    let fullText = '';

    if (provider === 'claude') {
      // ── Claude via Anthropic SDK ──────────────────────────────────────────
      const client = new Anthropic({ apiKey });
      const claudeModel = model || 'claude-opus-4-6';

      const stream = client.messages.stream({
        model: claudeModel,
        max_tokens: 8192,
        thinking: { type: 'adaptive' },
        system: STELLANTIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          send({ type: 'delta', text: event.delta.text });
        }
      }

    } else {
      // ── OpenAI-compatible providers (GPT / Gemini / Mistral / Azure / Custom) ──
      const baseURL = getBaseURL(provider, endpoint, deployment, apiKey);
      const defaultModel = { gpt: 'gpt-4o', gemini: 'gemini-2.0-flash', mistral: 'mistral-large-latest', azure: deployment || 'gpt-4o', custom: 'llama3.2' }[provider] || 'gpt-4o';
      const resolvedModel = model || defaultModel;

      const clientOptions = { apiKey, baseURL };
      if (provider === 'azure') {
        clientOptions.defaultHeaders = { 'api-key': apiKey };
        clientOptions.defaultQuery = { 'api-version': '2024-02-01' };
      }

      const client = new OpenAI(clientOptions);

      const stream = await client.chat.completions.create({
        model: resolvedModel,
        max_tokens: 8192,
        stream: true,
        messages: [
          { role: 'system', content: STELLANTIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          send({ type: 'delta', text: delta });
        }
      }
    }

    // Parse the final JSON
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        send({ type: 'complete', data: { ...parsed, _provider: provider } });
      } else {
        send({ type: 'complete', data: { communication: fullText, qualityScore: 85, _provider: provider } });
      }
    } catch {
      send({ type: 'complete', data: { communication: fullText, qualityScore: 80, _provider: provider } });
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Generation error:', err.message);
    send({ type: 'error', message: err.message || 'Erreur lors de la génération' });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CommGen AI v5.0 — Backend démarré sur http://localhost:${PORT}`);
  console.log(`   Fournisseur: ${runtimeConfig.provider} | Modèle: ${runtimeConfig.model || 'auto'}`);
  console.log(`   Clé: ${runtimeConfig.apiKey ? `Configurée (...${runtimeConfig.apiKey.slice(-6)})` : '⚠️  Non configurée — Configurez via Paramètres'}\n`);
});
