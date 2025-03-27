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

// Extract intent from query (what user is looking for)
function extractIntent(query: string): {
  action: string | null,
  target: string | null,
  industry: string | null,
  company: string | null,
  role: string | null,
  location: string | null,
  topic: string | null
} {
  const normalized = normalizeText(query);
  
  // Default intent structure
  const intent = {
    action: null as string | null,
    target: null as string | null,
    industry: null as string | null,
    company: null as string | null,
    role: null as string | null,
    location: null as string | null,
    topic: null as string | null
  };
  
  // Extract action (find, help, connect, etc.)
  let actionFound = false;
  for (const [actionType, keywordList] of Object.entries(keywords.actionKeywords)) {
    for (const keyword of keywordList) {
      if (normalized.includes(keyword)) {
        intent.action = actionType;
        actionFound = true;
        break;
      }
    }
    if (actionFound) break;
  }
  
  // Extract industry
  for (const ind of keywords.industries) {
    if (normalized.includes(ind)) {
      intent.industry = ind;
      break;
    }
  }
  
  // Extract company
  for (const company of keywords.companies) {
    if (normalized.includes(company)) {
      intent.company = company;
      break;
    }
  }
  
  // Check for multi-word companies
  for (const [first, second] of keywords.companyPairs) {
    if (normalized.includes(first) && normalized.includes(second)) {
      intent.company = `${first} ${second}`;
      break;
    }
  }
  
  // Extract role
  for (const title of keywords.jobTitles) {
    if (normalized.includes(title)) {
      intent.role = title;
      break;
    }
  }
  
  // Extract target (what they're looking for - job, internship, etc.)
  // Use targetKeywords from keywords.json
  let targetFound = false;
  for (const [targetType, keywordList] of Object.entries(keywords.targetKeywords)) {
    for (const keyword of keywordList) {
      if (normalized.includes(keyword)) {
        intent.target = targetType;
        targetFound = true;
        break;
      }
    }
    if (targetFound) break;
  }
  
  // Extract location (universities often indicate location)
  for (const uni of keywords.universities) {
    if (normalized.includes(uni)) {
      intent.location = uni;
      break;
    }
  }

  
  
  return intent;
}

// Extract profile attributes from connection description
function extractProfileAttributes(description: string): {
  roles: string[],
  skills: string[],
  companies: string[],
  universities: string[],
  status: string | null,
  industries: string[],
  topics: string[]
} {
  const normalized = normalizeText(description);
  const tokens = tokenize(normalized);
  
  // Initialize attributes
  const attributes = {
    roles: [] as string[],
    skills: [] as string[],
    companies: [] as string[],
    universities: [] as string[],
    status: null as string | null,
    industries: [] as string[],
    topics: [] as string[]
  };
  
  // Extract roles
  for (const title of keywords.jobTitles) {
    if (normalized.includes(title)) {
      attributes.roles.push(title);
    }
  }
  
  // Extract skills
  for (const skill of keywords.techSkills) {
    if (normalized.includes(skill)) {
      attributes.skills.push(skill);
    }
  }
  
  // Extract companies
  for (const company of keywords.companies) {
    if (normalized.includes(company)) {
      attributes.companies.push(company);
    }
  }
  
  // Extract universities
  for (const uni of keywords.universities) {
    if (normalized.includes(uni)) {
      attributes.universities.push(uni);
    }
  }
  
  // Extract status
  for (const status of keywords.statusKeywords) {
    if (normalized.includes(status)) {
      attributes.status = 'active';
      break;
    }
  }
  
  // Extract industries
  for (const industry of keywords.industries) {
    if (normalized.includes(industry)) {
      attributes.industries.push(industry);
    }
  }
  
  // Extract topics (specialized areas)
  // Robotics
  if (normalized.includes('robot') || 
      normalized.includes('robotics') || 
      normalized.includes('mechatronics') ||
      normalized.includes('mechanical') ||
      (normalized.includes('hardware') && normalized.includes('engineer'))) {
    attributes.topics.push('robotics');
  }
  
  // Special case for mechatronics engineers - they are highly relevant for robotics
  if (normalized.includes('mechatronics') && 
     (normalized.includes('engineer') || normalized.includes('engineering'))) {
    attributes.topics.push('robotics');
    attributes.topics.push('mechatronics');
  }
  
  // AI
  if (normalized.includes('ai') || 
      normalized.includes('artificial intelligence') || 
      normalized.includes('machine learning') ||
      normalized.includes('ml') ||
      normalized.includes('deep learning')) {
    attributes.topics.push('ai');
  }
  
  // Data
  if (normalized.includes('data') ||
      normalized.includes('analytics') ||
      normalized.includes('database') ||
      normalized.includes('sql') ||
      normalized.includes('statistics')) {
    attributes.topics.push('data');
  }
  
  return attributes;
}

// Calculate semantic relevance between query intent and profile attributes
function calculateSemanticRelevance(
  queryIntent: ReturnType<typeof extractIntent>,
  profileAttributes: ReturnType<typeof extractProfileAttributes>
): number {
  let score = 0;
  
  // Topic relevance (highest weight for specialized areas like robotics)
  if (queryIntent.topic && profileAttributes.topics.includes(queryIntent.topic)) {
    score += 15; // Very high weight for topic matches
  }
  // Company relevance (high weight)
  if (queryIntent.company && profileAttributes.companies.includes(queryIntent.company)) {
    score += 10;
  }
  // Role relevance
  if (queryIntent.role && profileAttributes.roles.includes(queryIntent.role)) {
    score += 8;
  }
  // Industry relevance
  if (queryIntent.industry && profileAttributes.industries.includes(queryIntent.industry)) {
    score += 7;
  }
  // Location/university relevance
  if (queryIntent.location && profileAttributes.universities.includes(queryIntent.location)) {
    score += 6;
  }
  // Status bonus (looking for opportunities)
  if (queryIntent.target === 'job' && profileAttributes.status === 'active') {
    score += 4;
  }
  
  // If looking for help finding a job and the person is at the target company
  if (queryIntent.action === 'help' && queryIntent.target === 'job' && 
      queryIntent.company && profileAttributes.companies.includes(queryIntent.company)) {
    score += 12; // Extra bonus for people who can actually help with job referrals
  }
  
  // If looking for help with a topic
  if (queryIntent.action === 'help' && queryIntent.topic) {
    // Boost for people with skills in that area
    const topicMatch = profileAttributes.topics.includes(queryIntent.topic);
    if (topicMatch) {
      score += 10;
    }
  }
  
  return score;
}

// Calculate the relevance score between a query and a connection description
export function calculateRelevanceScore(query: string, connectionDescription: string): number {
  // Base score calculation using token matching
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(connectionDescription);
  
  // Initialize score
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
  
  // 2. Extract intent and profile attributes for semantic matching
  const queryIntent = extractIntent(query);
  const profileAttributes = extractProfileAttributes(connectionDescription);
  
  // 3. Calculate semantic relevance
  const semanticScore = calculateSemanticRelevance(queryIntent, profileAttributes);
  
  // 4. Combine scores with higher weight on semantic matching
  const totalScore = (keywordMatchScore * 0.3) + (semanticScore * 0.7);
  
  // Always return at least a minimum score for every connection to ensure all are displayed
  // The minimum value is adjusted to ensure all connections get at least a visible rating
  return Math.max(totalScore, 0.1);
}

// Analyze connections and return ranked matches
export function analyzeConnections(
  connections: { [key: string]: { description: string, profileLink?: string } },
  query: string
): { name: string; description: string; score: number; profileLink?: string }[] {
  const results: { name: string; description: string; score: number; profileLink?: string }[] = [];
  
  Object.entries(connections).forEach(([name, data]) => {
    const score = calculateRelevanceScore(query, data.description);
    
    // Include all connections regardless of score
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