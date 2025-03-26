// NLP utilities for analyzing LinkedIn connections

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

// Extract common job titles, skills, and other relevant entities
const jobTitles = [
  'engineer', 'developer', 'manager', 'director', 'ceo', 'founder', 
  'co-founder', 'vp', 'president', 'head', 'lead', 'senior', 'junior',
  'intern', 'student', 'professor', 'analyst', 'consultant', 'associate',
  'researcher', 'scientist', 'designer'
];

const techSkills = [
  'software', 'web', 'mobile', 'ai', 'ml', 'data', 'cloud', 'devops',
  'frontend', 'backend', 'fullstack', 'infrastructure', 'security',
  'product', 'project', 'program', 'ux', 'ui', 'design', 'research',
  'python', 'java', 'javascript', 'typescript', 'react', 'node', 'aws',
  'azure', 'gcp', 'sql', 'nosql', 'mongodb', 'database', 'analytics',
  'machine', 'learning', 'deep', 'neural', 'networks', 'nlp'
];

const industries = [
  'tech', 'finance', 'banking', 'healthcare', 'education', 'retail',
  'media', 'marketing', 'consulting', 'insurance', 'government',
  'nonprofit', 'startup', 'enterprise', 'fintech', 'edtech', 'biotech',
  'robotics', 'automation', 'manufacturing', 'automotive', 'aerospace'
];

const companies = [
  'google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta', 
  'twitter', 'linkedin', 'airbnb', 'uber', 'shopify', 'stripe',
  'netflix', 'adobe', 'salesforce', 'ibm', 'oracle', 'sap',
  'goldman', 'sachs', 'morgan', 'stanley', 'jpmorgan', 'chase',
  'deloitte', 'accenture', 'mckinsey', 'bain', 'bcg', 'kpmg',
  'pwc', 'ey', 'tesla', 'spacex', 'nasa', 'intel', 'amd', 'nvidia',
  'samsung', 'huawei', 'toyota', 'bmw', 'mercedes', 'ford'
];

const universities = [
  'waterloo', 'uwaterloo', 'university of waterloo', 'toronto', 'uoft',
  'mcmaster', 'western', 'queens', 'mcgill', 'ubc', 'alberta', 'calgary',
  'carleton', 'ryerson', 'tmu', 'york', 'concordia', 'dalhousie',
  'mit', 'stanford', 'harvard', 'princeton', 'yale', 'berkeley',
  'cambridge', 'oxford', 'imperial', 'eth', 'tsinghua', 'peking'
];

const statusKeywords = [
  'seeking', 'looking', 'open', 'available', 'searching', 'actively',
  'opportunities', 'roles', 'positions', 'jobs', 'internships', 'co-op'
];

// Map common terms to broader categories (synonyms and related terms)
const synonymMap: Record<string, string[]> = {
  'job': ['position', 'role', 'opportunity', 'opening', 'career', 'work', 'employment'],
  'help': ['assist', 'support', 'aid', 'guidance', 'advice', 'mentor', 'connect', 'introduction'],
  'find': ['locate', 'discover', 'identify', 'search', 'seek', 'looking', 'hunting'],
  'software': ['swe', 'programming', 'coding', 'development', 'tech', 'application'],
  'finance': ['financial', 'banking', 'investment', 'trading', 'wealth', 'capital', 'fintech'],
  'marketing': ['brand', 'growth', 'advertising', 'content', 'social media', 'digital'],
  'internship': ['intern', 'co-op', 'summer position', 'temporary'],
  'startup': ['early-stage', 'seed', 'venture', 'founder', 'entrepreneur', 'small company'],
  'enterprise': ['corporation', 'large company', 'established company', 'big tech'],
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural networks'],
  'data': ['analytics', 'big data', 'database', 'statistics', 'insights', 'bi', 'business intelligence'],
  'product': ['pm', 'product management', 'product design', 'product development'],
  'fulltime': ['full-time', 'permanent', 'career', 'long-term'],
  'robotics': ['robot', 'automation', 'mechatronics', 'mechanical engineering', 'hardware', 'electronics', 'embedded systems'],
  'mechanical': ['mechanic', 'mechanics', 'mechanical engineer', 'mechatronics', 'hardware'],
  'engineering': ['engineer', 'technology', 'technical', 'development', 'design', 'systems']
};

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
  const tokens = tokenize(query);
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
  if (normalized.includes('help') || normalized.includes('assist') || normalized.includes('support')) {
    intent.action = 'help';
  } else if (normalized.includes('find') || normalized.includes('search') || normalized.includes('looking')) {
    intent.action = 'find';
  } else if (normalized.includes('connect') || normalized.includes('introduction') || normalized.includes('introduce')) {
    intent.action = 'connect';
  } else if (normalized.includes('who') || normalized.includes('which')) {
    intent.action = 'identify';
  }
  
  // Extract topic (special domain areas)
  if (normalized.includes('robotics') || normalized.includes('robot')) {
    intent.topic = 'robotics';
  } else if (normalized.includes('ai') || normalized.includes('machine learning')) {
    intent.topic = 'ai';
  } else if (normalized.includes('data') || normalized.includes('analytics')) {
    intent.topic = 'data';
  }
  
  // Extract industry
  for (const ind of industries) {
    if (normalized.includes(ind)) {
      intent.industry = ind;
      break;
    }
  }
  
  // Extract company
  for (const company of companies) {
    if (normalized.includes(company)) {
      intent.company = company;
      break;
    }
  }
  
  // Check for multi-word companies
  const companyPairs = [
    ['goldman', 'sachs'],
    ['morgan', 'stanley'],
    ['jpmorgan', 'chase']
  ];
  
  for (const [first, second] of companyPairs) {
    if (normalized.includes(first) && normalized.includes(second)) {
      intent.company = `${first} ${second}`;
      break;
    }
  }
  
  // Extract role
  for (const title of jobTitles) {
    if (normalized.includes(title)) {
      intent.role = title;
      break;
    }
  }
  
  // Extract target (what they're looking for - job, internship, etc.)
  if (normalized.includes('job') || normalized.includes('position') || normalized.includes('role')) {
    intent.target = 'job';
  } else if (normalized.includes('internship') || normalized.includes('intern') || normalized.includes('co-op')) {
    intent.target = 'internship';
  } else if (normalized.includes('vp') || normalized.includes('executive') || normalized.includes('leadership')) {
    intent.target = 'executive';
  }
  
  // Extract location (universities often indicate location)
  for (const uni of universities) {
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
  for (const title of jobTitles) {
    if (normalized.includes(title)) {
      attributes.roles.push(title);
    }
  }
  
  // Extract skills
  for (const skill of techSkills) {
    if (normalized.includes(skill)) {
      attributes.skills.push(skill);
    }
  }
  
  // Extract companies
  for (const company of companies) {
    if (normalized.includes(company)) {
      attributes.companies.push(company);
    }
  }
  
  // Extract universities
  for (const uni of universities) {
    if (normalized.includes(uni)) {
      attributes.universities.push(uni);
    }
  }
  
  // Extract status
  for (const status of statusKeywords) {
    if (normalized.includes(status)) {
      attributes.status = 'active';
      break;
    }
  }
  
  // Extract industries
  for (const industry of industries) {
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
    
    // Special case for mechatronics with robotics query
    if (queryIntent.topic === 'robotics' && profileAttributes.topics.includes('mechatronics')) {
      score += 10; // Additional bonus for mechatronics engineers when looking for robotics
    }
  } else if (queryIntent.topic === 'robotics') {
    // Special case for robotics - check for engineering roles that might be relevant
    if (profileAttributes.roles.includes('engineer') || 
        profileAttributes.topics.includes('mechanical')) {
      score += 8; // Partial match for engineering roles when looking for robotics
      
      // Give higher score if description explicitly mentions "mechatronics"
      if (profileAttributes.topics.includes('mechatronics')) {
        score += 15; // Mechatronics is highly relevant for robotics
      }
    }
  }
  
  // Company relevance (high weight)
  if (queryIntent.company && profileAttributes.companies.includes(queryIntent.company)) {
    score += 10;
  } else if (queryIntent.company) {
    // Check for related companies (e.g., financial institutions)
    const financialCompanies = ['goldman', 'morgan', 'jpmorgan', 'sachs', 'stanley', 'chase'];
    const techCompanies = ['google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta'];
    
    if (financialCompanies.includes(queryIntent.company)) {
      for (const company of profileAttributes.companies) {
        if (financialCompanies.includes(company)) {
          score += 5; // Related company in same industry
        }
      }
    } else if (techCompanies.includes(queryIntent.company)) {
      for (const company of profileAttributes.companies) {
        if (techCompanies.includes(company)) {
          score += 5; // Related company in same industry
        }
      }
    }
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
  
  // Skill relevance (for technical roles)
  if (queryIntent.role === 'engineer' || queryIntent.role === 'developer') {
    const techCount = profileAttributes.skills.length;
    score += Math.min(techCount * 2, 6); // Cap at 6 points
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
      for (const [key, synonyms] of Object.entries(synonymMap)) {
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
  connections: { [key: string]: string },
  query: string
): { name: string; description: string; score: number }[] {
  const results: { name: string; description: string; score: number }[] = [];
  
  Object.entries(connections).forEach(([name, description]) => {
    const score = calculateRelevanceScore(query, description);
    
    // Include all connections regardless of score
    results.push({
      name,
      description,
      score
    });
  });
  
  // Sort by score, highest first
  return results.sort((a, b) => b.score - a.score);
} 