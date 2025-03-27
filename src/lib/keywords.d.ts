declare module './keywords.json' {
  interface Keywords {
    jobTitles: string[];
    techSkills: string[];
    nontechSkills: string[];
    industries: string[];
    companies: string[];
    universities: string[];
    statusKeywords: string[];
    actionKeywords: Record<string, string[]>;
    targetKeywords: Record<string, string[]>;
    companyPairs: string[][];
    synonymMap: Record<string, string[]>;
    tfidfVocabulary: string[];
  }
  
  const keywords: Keywords;
  export default keywords;
} 