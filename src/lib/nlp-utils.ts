// NLP utilities for analyzing LinkedIn connections

// Import keywords from JSON file
import keywords from './keywords.json';

// Function to normalize and standardize text
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s@]/g, ' ') // Replace non-alphanumeric chars (except @ symbol) with spaces
    .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
    .trim();
}

// Function to tokenize text into words
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 0);
}

// Function to expand acronyms in text
function expandAcronyms(text: string): string {
  let expanded = normalizeText(text);
  
  // Replace known acronyms with their expanded forms
  for (const [acronym, expansion] of Object.entries(keywords.acronyms)) {
    const regex = new RegExp(`\\b${acronym}\\b`, 'g');
    expanded = expanded.replace(regex, expansion);
  }
  
  return expanded;
}

// TF-IDF Calculation Functions
function computeTFIDF(descriptions: string[], vocabulary: string[]): { tfidfMatrix: number[][], idf: number[] } {
  const N = descriptions.length;
  const tokenizedDocs = descriptions.map(desc => tokenize(desc));
  
  // Calculate document frequency for each term
  const df: { [term: string]: number } = {};
  vocabulary.forEach(term => {
    df[term] = tokenizedDocs.filter(doc => doc.includes(term)).length;
  });
  
  // Calculate inverse document frequency (IDF)
  const idf = vocabulary.map(term => Math.log(N / (df[term] + 1))); // +1 avoids division by zero
  
  // Calculate TF-IDF matrix
  const tfidfMatrix = tokenizedDocs.map(doc => {
    // Term frequency in this document
    const tf: { [term: string]: number } = {};
    doc.forEach(word => {
      if (vocabulary.includes(word)) tf[word] = (tf[word] || 0) + 1 / doc.length; // Normalize by doc length
    });
    
    // Multiply term frequency by IDF for each term
    return vocabulary.map((term, i) => (tf[term] || 0) * idf[i]);
  });
  
  return { tfidfMatrix, idf };
}

// Compute TF-IDF vector for a query
function computeQueryTFIDF(query: string, vocabulary: string[], idf: number[]): number[] {
  const tokens = tokenize(query);
  
  // Calculate term frequency for query
  const tf: { [term: string]: number } = {};
  tokens.forEach(word => {
    if (vocabulary.includes(word)) tf[word] = (tf[word] || 0) + 1 / tokens.length;
  });
  
  // Multiply by IDF to get TF-IDF vector
  return vocabulary.map((term, i) => (tf[term] || 0) * idf[i]);
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
}

// Extract important terms from a query that don't match our keyword lists
// These might be important nouns, acronyms, or special terms
function extractUnknownImportantTerms(query: string): string[] {
  const normalized = normalizeText(query);
  const tokens = tokenize(normalized);
  const importantTerms: string[] = [];
  
  // Regular expression for identifying potential "important" terms
  // Typically nouns, acronyms (all caps), and compound terms
  const termPattern = /^[A-Z0-9][A-Za-z0-9]*$|^[A-Z]{2,}$|^[A-Za-z]+[A-Z][A-Za-z]+$/;
  
  for (const token of tokens) {
    // Skip common words, conjunctions, prepositions, etc.
    if (token.length <= 2) continue;
    if (['the', 'and', 'for', 'with', 'from', 'into', 'about', 'that'].includes(token)) continue;
    
    // Consider this an "important" term if:
    // 1. It's not already in our various keyword lists
    // 2. It follows patterns of nouns or specialized terms (capitalized, acronyms, etc.)
    const isInKeywordLists = 
      keywords.techSkills.includes(token) ||
      keywords.nontechSkills.includes(token) ||
      keywords.industries.includes(token) ||
      keywords.companies.includes(token) ||
      keywords.jobTitles.includes(token) ||
      Object.values(keywords.topicKeywords).some(terms => terms.includes(token));
    
    if (!isInKeywordLists) {
      importantTerms.push(token);
    }
  }
  
  return [...new Set(importantTerms)]; // Remove duplicates
}

// Extract intent from query (what user is looking for)
function extractIntent(query: string): {
  actions: string[],
  targets: string[],
  industries: string[],
  companies: string[],
  roles: string[],
  locations: string[],
  topics: string[],
  unknownTerms: string[] // Add unknown terms to capture important unrecognized words
} {
  // First expand any acronyms 
  const expanded = expandAcronyms(query);
  const normalized = normalizeText(expanded);
  
  // Initialize intent with arrays for multiple matches
  const intent = {
    actions: [] as string[],
    targets: [] as string[],
    industries: [] as string[],
    companies: [] as string[],
    roles: [] as string[],
    locations: [] as string[],
    topics: [] as string[],
    unknownTerms: [] as string[]
  };
  
  // Extract actions (find, help, connect, etc.)
  for (const [actionType, keywordList] of Object.entries(keywords.actionKeywords)) {
    if (keywordList.some(kw => normalized.includes(kw))) {
      intent.actions.push(actionType);
    }
  }
  
  // Extract targets with synonyms
  for (const [targetType, keywordList] of Object.entries(keywords.targetKeywords)) {
    const synonyms = keywords.synonymMap[targetType as keyof typeof keywords.synonymMap] || [];
    if ([...keywordList, ...synonyms].some(kw => normalized.includes(kw))) {
      intent.targets.push(targetType);
    }
  }
  
  // Extract industries
  for (const industry of keywords.industries) {
    if (normalized.includes(industry)) {
      intent.industries.push(industry);
    }
  }
  
  // Extract companies
  for (const company of keywords.companies) {
    if (normalized.includes(company)) {
      intent.companies.push(company);
    }
  }
  
  // Extract multi-word companies
  for (const [first, second] of keywords.companyPairs) {
    if (normalized.includes(first) && normalized.includes(second)) {
      intent.companies.push(`${first} ${second}`);
    }
  }
  
  // Extract roles with synonyms
  for (const title of keywords.jobTitles) {
    const synonyms = keywords.synonymMap[title as keyof typeof keywords.synonymMap] || [];
    if ([title, ...synonyms].some(kw => normalized.includes(kw))) {
      intent.roles.push(title);
    }
  }
  
  // Extract locations from universities and explicit locations
  for (const uni of keywords.universities) {
    if (normalized.includes(uni)) {
      intent.locations.push(uni);
    }
  }
  
  // Extract broader locations
  for (const loc of keywords.locations || []) {
    const synonyms = keywords.locationSynonyms?.[loc as keyof typeof keywords.locationSynonyms] || [];
    if ([loc, ...synonyms].some(kw => normalized.includes(kw))) {
      intent.locations.push(loc);
    }
  }
  
  // Extract topics using topicKeywords
  for (const [topic, terms] of Object.entries(keywords.topicKeywords)) {
    if (terms.some(term => normalized.includes(term))) {
      intent.topics.push(topic);
    }
  }
  
  // Extract unknown but potentially important terms for fallback matching
  intent.unknownTerms = extractUnknownImportantTerms(query);
  
  return intent;
}

// Extract profile attributes from connection description
function extractProfileAttributes(description: string): {
  roles: string[],
  skills: string[],
  companies: string[],
  locations: string[],
  status: string | null,
  industries: string[],
  topics: string[],
  isSenior: boolean,
  rawText: string  // Add raw text for direct token matching
} {
  // First expand any acronyms
  const expanded = expandAcronyms(description);
  const normalized = normalizeText(expanded);
  
  // Initialize attributes
  const attributes = {
    roles: [] as string[],
    skills: [] as string[],
    companies: [] as string[],
    locations: [] as string[],
    status: null as string | null,
    industries: [] as string[],
    topics: [] as string[],
    isSenior: false,
    rawText: normalized // Store normalized text for direct token matching
  };
  
  // Extract roles with synonyms
  for (const title of keywords.jobTitles) {
    const synonyms = keywords.synonymMap[title as keyof typeof keywords.synonymMap] || [];
    if ([title, ...synonyms].some(kw => normalized.includes(kw))) {
      attributes.roles.push(title);
    }
  }
  
  // Check if person holds a senior role
  if (keywords.seniorRoles.some(role => normalized.includes(role)) || 
      attributes.roles.some(role => keywords.seniorRoles.includes(role))) {
    attributes.isSenior = true;
  }
  
  // Extract skills (both tech and non-tech)
  for (const skill of [...keywords.techSkills, ...keywords.nontechSkills]) {
    const synonyms = keywords.synonymMap[skill as keyof typeof keywords.synonymMap] || [];
    if ([skill, ...synonyms].some(kw => normalized.includes(kw))) {
      attributes.skills.push(skill);
    }
  }
  
  // Extract companies
  for (const company of keywords.companies) {
    if (normalized.includes(company)) {
      attributes.companies.push(company);
    }
  }
  
  // Extract multi-word companies
  for (const [first, second] of keywords.companyPairs) {
    if (normalized.includes(first) && normalized.includes(second)) {
      attributes.companies.push(`${first} ${second}`);
    }
  }
  
  // Extract locations from universities
  for (const uni of keywords.universities) {
    if (normalized.includes(uni)) {
      attributes.locations.push(uni);
    }
  }
  
  // Extract broader locations
  for (const loc of keywords.locations || []) {
    const synonyms = keywords.locationSynonyms?.[loc as keyof typeof keywords.locationSynonyms] || [];
    if ([loc, ...synonyms].some(kw => normalized.includes(kw))) {
      attributes.locations.push(loc);
    }
  }
  
  // Extract status
  if (keywords.statusKeywords.some(kw => normalized.includes(kw))) {
    attributes.status = 'active';
  }
  
  // Extract industries
  for (const industry of keywords.industries) {
    if (normalized.includes(industry)) {
      attributes.industries.push(industry);
    }
  }
  
  // Extract topics using topicKeywords
  for (const [topic, terms] of Object.entries(keywords.topicKeywords)) {
    if (terms.some(term => normalized.includes(term))) {
      attributes.topics.push(topic);
    }
  }
  
  return attributes;
}

// Calculate semantic relevance between query intent and profile attributes
// with dynamic weights based on query context
function calculateSemanticRelevance(
  queryIntent: ReturnType<typeof extractIntent>,
  profileAttributes: ReturnType<typeof extractProfileAttributes>
): number {
  // Dynamic weights based on query intent
  const weights = {
    topic: queryIntent.topics.length > 0 ? 15 : 5,
    company: queryIntent.companies.length > 0 ? 12 : 4,
    role: queryIntent.roles.length > 0 ? 10 : 3,
    industry: queryIntent.industries.length > 0 ? 8 : 2,
    location: queryIntent.locations.length > 0 ? 6 : 1,
    status: queryIntent.targets.includes('job') ? 5 : 1,
    senior: queryIntent.targets.includes('executive') ? 8 : 3,
    unknown: 4 // Weight for unknown term matches
  };
  
  let score = 0;
  
  // Topic matches (e.g., AI, robotics) - highest priority
  const topicMatches = queryIntent.topics.filter(t => profileAttributes.topics.includes(t));
  if (topicMatches.length > 0) {
    score += weights.topic * (1 + 0.3 * (topicMatches.length - 1)); // Boost for multiple matches
  }
  
  // Company matches
  const companyMatches = queryIntent.companies.filter(c => profileAttributes.companies.includes(c));
  if (companyMatches.length > 0) {
    score += weights.company * (1 + 0.3 * (companyMatches.length - 1));
  }
  
  // Role matches
  const roleMatches = queryIntent.roles.filter(r => profileAttributes.roles.includes(r));
  if (roleMatches.length > 0) {
    score += weights.role * (1 + 0.3 * (roleMatches.length - 1));
  }
  
  // Industry matches
  const industryMatches = queryIntent.industries.filter(i => profileAttributes.industries.includes(i));
  if (industryMatches.length > 0) {
    score += weights.industry * (1 + 0.3 * (industryMatches.length - 1));
  }
  
  // Location matches
  const locationMatches = queryIntent.locations.filter(l => profileAttributes.locations.includes(l));
  if (locationMatches.length > 0) {
    score += weights.location * (1 + 0.3 * (locationMatches.length - 1));
  }
  
  // Status matches
  if (queryIntent.targets.includes('job') && profileAttributes.status === 'active') {
    score += weights.status;
  }
  
  // Seniority matches
  if (queryIntent.targets.includes('executive') && profileAttributes.isSenior) {
    score += weights.senior;
  } else if (profileAttributes.isSenior) {
    // General boost for senior people
    score += 3;
  }
  
  // Specific action modifiers
  if (queryIntent.actions.includes('help')) {
    // If looking for help and the person is at the target company - extra boost
    if (companyMatches.length > 0) {
      score += 10; // Significant boost for referral potential
    }
    
    // If looking for help with a specific topic and person has that expertise
    if (topicMatches.length > 0) {
      score += 8; // Expertise boost
    }
  }
  
  // Looking specifically for senior people boost
  if (queryIntent.roles.some(r => keywords.seniorRoles.includes(r)) && profileAttributes.isSenior) {
    score += 7; // Significant boost for senior roles when looking for senior people
  }
  
  // Fallback: Match unknown but important terms directly
  // This helps with specialized terms not in our keyword lists
  if (queryIntent.unknownTerms.length > 0) {
    const profileTokens = tokenize(profileAttributes.rawText);
    const unknownTermMatches = queryIntent.unknownTerms.filter(term => 
      profileTokens.includes(term) || 
      profileAttributes.rawText.includes(term)
    );
    
    if (unknownTermMatches.length > 0) {
      score += weights.unknown * unknownTermMatches.length;
    }
  }
  
  return score;
}

// Calculate the relevance score between a query and a connection description
export function calculateRelevanceScore(
  query: string, 
  connectionDescription: string,
  tfidfQueryVector?: number[],
  tfidfConnectionVector?: number[]
): number {
  // Extract intent and profile attributes for semantic matching
  const queryIntent = extractIntent(query);
  const profileAttributes = extractProfileAttributes(connectionDescription);
  
  // Calculate semantic relevance with dynamic weights
  const semanticScore = calculateSemanticRelevance(queryIntent, profileAttributes);
  
  // Base keyword matching score
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(connectionDescription);
  
  let keywordMatchScore = 0;
  
  // 1. Exact keyword matches
  queryTokens.forEach(queryToken => {
    if (descriptionTokens.includes(queryToken)) {
      keywordMatchScore += 2;
    } else {
      // Check for synonyms
      for (const [key, synonyms] of Object.entries(keywords.synonymMap)) {
        if (queryToken === key || synonyms.includes(queryToken)) {
          // Check if the description has the base term or any synonym
          if (descriptionTokens.includes(key) || 
              synonyms.some(syn => descriptionTokens.includes(syn))) {
            keywordMatchScore += 1.5;
            break;
          }
        }
      }
    }
  });
  
  // 2. TF-IDF similarity if vectors are provided
  let tfidfScore = 0;
  if (tfidfQueryVector && tfidfConnectionVector) {
    tfidfScore = cosineSimilarity(tfidfQueryVector, tfidfConnectionVector);
  }
  
  // 3. Combine scores with context-dependent weighting
  // Adjust weights based on query intent
  let keywordWeight = 0.25; // Increased from 0.2
  let semanticWeight = 0.35; // Reduced from 0.4
  let tfidfWeight = 0.4;
  
  // If query is very specific (many explicit entities), boost semantic score
  const specificityCount = queryIntent.companies.length + 
                          queryIntent.roles.length + 
                          queryIntent.topics.length;
  if (specificityCount > 3) {
    semanticWeight = 0.5;
    keywordWeight = 0.15;
    tfidfWeight = 0.35;
  }
  
  // If there are unknown terms, boost keyword matching
  if (queryIntent.unknownTerms.length > 0) {
    keywordWeight = 0.3;
    semanticWeight = 0.35;
    tfidfWeight = 0.35;
  }
  
  // If using TF-IDF, normalize keyword score
  const maxPossibleKeywordScore = queryTokens.length * 2; // Maximum possible score
  const normalizedKeywordScore = maxPossibleKeywordScore > 0 
    ? keywordMatchScore / maxPossibleKeywordScore 
    : 0;
  
  // Normalize semantic score (typical max is around 50-60)
  const normalizedSemanticScore = semanticScore / 60;
  
  // Combine scores
  let totalScore;
  if (tfidfQueryVector && tfidfConnectionVector) {
    totalScore = (normalizedKeywordScore * keywordWeight) + 
                (normalizedSemanticScore * semanticWeight) + 
                (tfidfScore * tfidfWeight);
  } else {
    // If no TF-IDF, rebalance weights
    totalScore = (normalizedKeywordScore * 0.35) + (normalizedSemanticScore * 0.65);
  }
  
  // Always return at least a minimum score for every connection to ensure all are displayed
  return Math.max(totalScore, 0.1);
}

// Analyze connections and return ranked matches
export function analyzeConnections(
  connections: { [key: string]: { description: string, profileLink?: string } },
  query: string
): { name: string; description: string; score: number; profileLink?: string }[] {
  // Log the query to debug
  console.log(`Processing query: "${query}"`);
  
  // First, expand any acronyms in the query
  const expandedQuery = expandAcronyms(query);
  console.log(`Expanded query: "${expandedQuery}"`);
  
  // Setup TF-IDF calculation
  const descriptions = Object.values(connections).map(c => c.description);
  const { tfidfMatrix, idf } = computeTFIDF(descriptions, keywords.tfidfVocabulary);
  const queryVector = computeQueryTFIDF(expandedQuery, keywords.tfidfVocabulary, idf);
  
  // Log intent extraction for debugging
  const queryIntent = extractIntent(expandedQuery);
  console.log('Extracted intent:', {
    actions: queryIntent.actions,
    targets: queryIntent.targets,
    industries: queryIntent.industries,
    companies: queryIntent.companies,
    roles: queryIntent.roles,
    locations: queryIntent.locations,
    topics: queryIntent.topics,
    unknownTerms: queryIntent.unknownTerms
  });
  
  // Calculate scores for each connection
  const results: { name: string; description: string; score: number; profileLink?: string }[] = [];
  
  Object.entries(connections).forEach(([name, data], index) => {
    const score = calculateRelevanceScore(
      expandedQuery, 
      data.description,
      queryVector,
      tfidfMatrix[index]
    );
    
    results.push({
      name,
      description: data.description,
      score,
      profileLink: data.profileLink
    });
  });
  
  // Sort by score, highest first
  return results.sort((a, b) => b.score - a.score);
} 