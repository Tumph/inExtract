// Test script to validate the improved ranking for hardware queries
const fs = require('fs');
const path = require('path');

// Simple mocks of the frontend functions
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 0);
}

// Create hardcoded keywords for testing
const keywords = {
  jobTitles: [
    "engineer", "developer", "manager", "student", "computer", "electrical", 
    "hardware", "software", "researcher", "scientist"
  ],
  techSkills: [
    "software", "hardware", "chips", "computer", "electronics", "electrical",
    "microprocessor", "semiconductor", "circuit", "processor"
  ],
  industries: [
    "tech", "semiconductor", "electronics", "hardware"
  ],
  companies: [
    "intel", "amd", "nvidia", "qualcomm", "apple", "microsoft", "google"
  ],
  universities: [
    "waterloo", "uwaterloo", "university of waterloo", "toronto", "uoft"
  ],
  statusKeywords: [
    "seeking", "looking", "open", "available", "searching"
  ],
  synonymMap: {
    "help": ["assist", "support", "aid", "guidance", "advice"],
    "chips": ["semiconductors", "microprocessors", "integrated circuits", "processor"],
    "hardware": ["electronic", "electronics", "chip", "chips", "circuit", "component", "device"]
  }
};

// Extract keywords
const jobTitles = keywords.jobTitles;
const techSkills = keywords.techSkills;
const industries = keywords.industries;
const companies = keywords.companies;
const universities = keywords.universities;
const statusKeywords = keywords.statusKeywords;
const synonymMap = keywords.synonymMap;

// Extract intent from query
function extractIntent(query) {
  const tokens = tokenize(query);
  const normalized = normalizeText(query);
  
  const intent = {
    action: null,
    target: null,
    industry: null,
    company: null,
    role: null,
    location: null,
    topic: null
  };
  
  // Extract action
  if (normalized.includes('help') || normalized.includes('assist') || normalized.includes('support')) {
    intent.action = 'help';
  } else if (normalized.includes('find') || normalized.includes('search') || normalized.includes('looking')) {
    intent.action = 'find';
  } else if (normalized.includes('connect') || normalized.includes('introduction') || normalized.includes('introduce')) {
    intent.action = 'connect';
  } else if (normalized.includes('who') || normalized.includes('which')) {
    intent.action = 'identify';
  }
  
  // Extract topic
  if (normalized.includes('robotics') || normalized.includes('robot')) {
    intent.topic = 'robotics';
  } else if (normalized.includes('ai') || normalized.includes('machine learning')) {
    intent.topic = 'ai';
  } else if (normalized.includes('data') || normalized.includes('analytics')) {
    intent.topic = 'data';
  } else if (normalized.includes('chip') || normalized.includes('chips') || 
             normalized.includes('semiconductor') || normalized.includes('hardware') ||
             normalized.includes('computer hardware') || normalized.includes('processor') ||
             normalized.includes('circuit') || normalized.includes('vlsi')) {
    intent.topic = 'hardware';
  }
  
  return intent;
}

// Extract profile attributes
function extractProfileAttributes(description) {
  const normalized = normalizeText(description);
  const tokens = tokenize(normalized);
  
  const attributes = {
    roles: [],
    skills: [],
    companies: [],
    universities: [],
    status: null,
    industries: [],
    topics: []
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
  
  // Hardware/Chips
  if (normalized.includes('chip') || normalized.includes('chips') ||
      normalized.includes('hardware') || normalized.includes('semiconductor') ||
      normalized.includes('circuit') || normalized.includes('processor') ||
      normalized.includes('microprocessor') || normalized.includes('microcontroller') ||
      normalized.includes('fpga') || normalized.includes('asic') ||
      normalized.includes('vlsi') || normalized.includes('embedded systems') ||
      normalized.includes('electrical') || normalized.includes('electronics') ||
      (normalized.includes('computer') && normalized.includes('engineering')) ||
      (normalized.includes('electrical') && normalized.includes('engineering'))) {
    attributes.topics.push('hardware');
  }
  
  // Computer-related
  if (normalized.includes('computer') || normalized.includes('cs') || 
      normalized.includes('software') || normalized.includes('programming')) {
    attributes.topics.push('computer');
  }
  
  return attributes;
}

// Calculate semantic relevance
function calculateSemanticRelevance(queryIntent, profileAttributes) {
  let score = 0;
  
  // Topic relevance
  if (queryIntent.topic && profileAttributes.topics.includes(queryIntent.topic)) {
    score += 15; // Very high weight for topic matches
  } else if (queryIntent.topic === 'hardware') {
    // Partial matches for hardware-related skills
    const hardwareRelatedSkills = ['engineer', 'electrical', 'electronics', 'computer'];
    let hardwareSkillCount = 0;
    
    for (const skill of hardwareRelatedSkills) {
      if (profileAttributes.skills.includes(skill) || profileAttributes.roles.includes(skill)) {
        hardwareSkillCount++;
      }
    }
    
    if (hardwareSkillCount > 0) {
      score += Math.min(hardwareSkillCount * 3, 9); // Up to 9 points for related skills
    }
    
    // Computer science/engineering is relevant for computer chips
    if (profileAttributes.topics.includes('computer')) {
      score += 6;
    }
  }
  
  return score;
}

// Calculate relevance score
function calculateRelevanceScore(query, connectionDescription) {
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(connectionDescription);
  
  let keywordMatchScore = 0;
  
  // Exact keyword matches
  queryTokens.forEach(queryToken => {
    if (descriptionTokens.includes(queryToken)) {
      keywordMatchScore += 2;
    } else {
      // Check for synonyms
      for (const [key, synonyms] of Object.entries(synonymMap)) {
        if (queryToken === key || synonyms.includes(queryToken)) {
          if (descriptionTokens.includes(key) || 
              synonyms.some(syn => descriptionTokens.includes(syn))) {
            keywordMatchScore += 1.5;
            break;
          }
        }
      }
    }
  });
  
  // Extract intent and profile attributes
  const queryIntent = extractIntent(query);
  const profileAttributes = extractProfileAttributes(connectionDescription);
  
  // Calculate semantic relevance
  const semanticScore = calculateSemanticRelevance(queryIntent, profileAttributes);
  
  // Combine scores
  const totalScore = (keywordMatchScore * 0.4) + (semanticScore * 0.6);
  
  // Boost computer references in a hardware query
  if (queryIntent.topic === 'hardware' && connectionDescription.toLowerCase().includes('computer')) {
    totalScore += 2;
  }
  
  return Math.max(totalScore, 0.5);
}

// Parse connections from the rtf file
function parseConnections(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const people = {};
    let currentName = null;
    let currentOccupation = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'Member\'s name') {
        // The next line contains the name
        if (i + 1 < lines.length) {
          currentName = lines[i + 1].trim();
          i++; // Skip the next line since we've read it
        }
      } else if (line === 'Member\'s occupation') {
        // The next line contains the occupation
        if (i + 1 < lines.length) {
          currentOccupation = lines[i + 1].trim();
          i++; // Skip the next line since we've read it
          
          // We have both name and occupation, add to people
          if (currentName && currentOccupation) {
            people[currentName] = currentOccupation;
            
            // Debug output
            console.log(`Parsed: ${currentName} - ${currentOccupation}`);
            
            currentName = null;
            currentOccupation = null;
          }
        }
      }
    }
    
    console.log(`Total connections parsed: ${Object.keys(people).length}\n`);
    return people;
  } catch (error) {
    console.error('Error parsing connections:', error);
    return {};
  }
}

// Test the ranking with the "computer chips" query
function testRanking() {
  const query = "who can help me learn about computer chips";
  console.log(`Query: "${query}"\n`);
  
  const connections = parseConnections('connections.rtf');
  if (Object.keys(connections).length === 0) {
    console.log('No connections were parsed from the file.');
    return;
  }
  
  // Analyze connections and rank them
  const results = [];
  
  Object.entries(connections).forEach(([name, description]) => {
    const score = calculateRelevanceScore(query, description);
    results.push({ name, description, score });
  });
  
  // Sort by score, highest first
  const sortedResults = results.sort((a, b) => b.score - a.score);
  
  console.log(`\nConnections Matching: "${query}"\n`);
  console.log("Name\tDescription\tRelevance");
  
  // Display top 10 results
  sortedResults.slice(0, 10).forEach(match => {
    console.log(`${match.name}\t${match.description}\t${match.score.toFixed(1)}`);
  });
}

// Run the test
testRanking(); 