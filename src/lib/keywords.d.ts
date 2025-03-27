declare module './keywords.json' {
  interface Keywords {
    jobTitles: string[];
    techSkills: string[];
    nontechSkills: string[];
    industries: string[];
    companies: string[];
    universities: string[];
    locations: string[];
    locationSynonyms: Record<string, string[]>;
    statusKeywords: string[];
    actionKeywords: Record<string, string[]>;
    targetKeywords: Record<string, string[]>;
    topicKeywords: Record<string, string[]>;
    seniorRoles: string[];
    companyPairs: string[][];
    synonymMap: Record<string, string[]>;
    acronyms: Record<string, string>;
    tfidfVocabulary: string[];
  }
  
  const keywords: Keywords;
  export default keywords;
} 