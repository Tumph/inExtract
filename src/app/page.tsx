"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { analyzeConnections } from "@/lib/nlp-utils"
import { RichTextEditor } from "@/components/RichTextEditor"

export default function LinkedInConnectionsAnalyzer() {
  const [connections, setConnections] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [matches, setMatches] = useState<{name: string, description: string, score: number, profileLink?: string}[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Function to validate LinkedIn connections format
  const validateFormat = (text: string): boolean => {
    // If empty text, return false
    if (!text.trim()) return false;
    
    // Strip HTML tags for validation
    const plainText = text.replace(/<[^>]*>/g, '')
    
    // Check for ANY of these common patterns that suggest LinkedIn connections
    const hasConnectedOn = plainText.includes("connected on") || plainText.includes("Connected")
    const hasMessage = plainText.includes("Message")
    const hasMemberName = plainText.includes("Member’s name") || plainText.includes("name") || plainText.includes("Member's name")
    const hasMemberOccupation = plainText.includes("Member’s occupation") || plainText.includes("occupation") || plainText.includes("Member's occupation")
    const hasAgo = plainText.includes(" ago") || plainText.includes("day") || plainText.includes("week") || plainText.includes("month")
    const hasStatus = plainText.includes("Status is") || plainText.includes("open to work") || plainText.includes("is hiring")
    const hasProfilePicture = plainText.includes("profile picture")
    
    // Look for @ patterns that suggest university/company affiliations
    const hasAffiliation = plainText.includes(" @ ") || plainText.includes("@")
    
    // Split by "Message" to see if we can find sections
    const sections = plainText.split("Message").filter(s => s.trim() !== "");
    
    // If text contains "Connections" or multiple of these patterns, it's likely a LinkedIn export
    const hasConnectionsHeader = plainText.includes("Connections");

    // Count how many LinkedIn-specific patterns we find
    let patternCount = 0;
    if (hasConnectedOn) patternCount++;
    if (hasMessage) patternCount++;
    if (hasMemberName && hasMemberOccupation) patternCount++;
    if (hasAgo && hasMessage) patternCount++;
    if (hasStatus) patternCount++;
    if (hasProfilePicture) patternCount++;
    if (hasAffiliation) patternCount++;
    if (hasConnectionsHeader) patternCount++;
    
    // Return true if we have sections or at least 2 LinkedIn patterns
    return sections.length >= 1 || patternCount >= 2;
  }

  // Parse LinkedIn connections from text
  const parseConnections = (text: string) => {
    // Split HTML into sections first to maintain context as requested
    const messageSections = text.split(/Message/).filter(s => s.trim());
    const fullText = messageSections.join("");
    
    // Each person's profile is between <hr> tags
    const profileSections = fullText.split(/<hr>/).filter(s => s.trim());
    console.log('Profile sections:', profileSections.length, 'sections found');
    
    const people: {[key: string]: {description: string, profileLink: string}} = {};
    
    // Process each section to extract data
    profileSections.forEach((section, index) => {
      // Only process sections that contain "connected on" as a validation check
      if (section.includes("connected on")) {
        try {
          // Extract LinkedIn profile URL and name from the same <a> tag
          // The name is the content within the <a> tag that contains the LinkedIn URL
          const linkedinLinkMatch = /<a[^>]*?href="(https?:\/\/www\.linkedin\.com\/in\/[^"]+)"[^>]*?>([^<]+)<\/a>/i.exec(section);
          
          if (linkedinLinkMatch) {
            const profileLink = linkedinLinkMatch[1];
            const name = linkedinLinkMatch[2].trim();
            
            // Extract all paragraph contents (everything between <p> and </p>)
            const paragraphs = [];
            const paragraphRegex = /<p>(.*?)<\/p>/g;
            let match;
            
            while ((match = paragraphRegex.exec(section)) !== null) {
              // Skip paragraphs with <a> tags (they're not the description)
              if (!match[1].includes('<a')) {
                paragraphs.push(match[1]);
              }
            }
            
            // The description is usually the first paragraph without an <a> tag
            if (paragraphs.length > 0) {
              const description = paragraphs[0].trim();
              
              if (description) {
                console.log(`Found connection ${index}:`, { name, description, profileLink });
                
                // Add to our people object
                people[name] = {
                  description,
                  profileLink
                };
              }
            }
          }
        } catch (error) {
          console.error('Error parsing section:', error, section);
        }
      }
    });
    
    console.log('Final people object:', Object.keys(people).length, 'connections processed');
    return people;
  }

  const handleAnalyze = () => {
    if (!connections.trim()) {
      setIsError(true)
      setErrorMessage("Please paste your LinkedIn connections first.")
      setShowPopup(true)
      return
    }
    
    if (!searchQuery.trim()) {
      setIsError(true)
      setErrorMessage("Please enter a search query.")
      setShowPopup(true)
      return
    }
    
    // Validate the format
    if (!validateFormat(connections)) {
      setIsError(true)
      setErrorMessage("This is the wrong format. Please try again. The format should match LinkedIn connections export.")
      setShowPopup(true)
      return
    }
    
    // Parse the connections
    const parsedConnections = parseConnections(connections)
    
    if (Object.keys(parsedConnections).length === 0) {
      setIsError(true)
      setErrorMessage("No connections were found in the pasted text. Please check the format.")
      setShowPopup(true)
      return
    }
    
    // Analyze connections based on search query using our NLP utilities
    const results = analyzeConnections(parsedConnections, searchQuery)
    
    // Always show results, even if low relevance scores
    // Set the matches and show the popup
    setIsError(false)
    setMatches(results.map(result => ({
      ...result,
      profileLink: parsedConnections[result.name]?.profileLink
    })))
    setShowPopup(true)
  }

  // Handle key press events for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">inExtract</h1>
      {/* Logo SVG - small and in corner */}
      <div className="absolute top-2 right-2">
        <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none">
          {/* The stylized "in" */}
          <text x="35" y="115" fontFamily="Arial, sans-serif" fontSize="80" fill="black" fontWeight="bold">in</text>

          {/* The abstract "X" */}
          <path d="M115 65 L165 135 M165 65 L115 135" stroke="black" strokeWidth="12" strokeLinecap="round"/>

          {/* Subtle gradient highlight */}
          <defs>
            <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <circle cx="160" cy="40" r="10" fill="url(#glow)" />
        </svg>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="connections" className="font-medium">
            Paste your LinkedIn connections
          </label>
          <RichTextEditor
            value={connections}
            onChange={setConnections}
            placeholder="Paste your LinkedIn connections here (format should match the extract.txt example)"
            className="min-h-[200px]"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="query" className="font-medium">
            Search Query
          </label>
          <div className="flex gap-2">
            <input
              id="query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'who can help me find a job at Shopify?'"
              className="flex-1 p-2 border rounded-md"
            />
            <Button onClick={handleAnalyze} className="flex gap-2 items-center">
              <Search className="h-4 w-4" />
              Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="fixed inset-0" onClick={() => setShowPopup(false)}></div>
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-4xl z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isError ? "Error" : `Connections Matching: "${searchQuery}"`}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPopup(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {isError ? (
                <div className="p-4 text-red-500">{errorMessage}</div>
              ) : (
                <>
                  {matches.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Relevance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches.map((match, index) => (
                          <TableRow key={index} className={index === 0 ? "bg-green-50" : ""}>
                            <TableCell className="font-medium">
                              {match.profileLink ? (
                                <a 
                                  href={match.profileLink} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {match.name}
                                </a>
                              ) : (
                                match.name
                              )}
                            </TableCell>
                            <TableCell>{match.description.length > 75 ? `${match.description.slice(0, 75)}...` : match.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(Math.ceil(match.score / 2), 5) }).map((_, i) => (
                                  <span 
                                    key={i} 
                                    className={`w-2 h-2 rounded-full ${
                                      index === 0 ? "bg-green-600" : "bg-green-500"
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {(
                                  match.score <= 0.2 ? match.score * 1 : 
                                  match.score <= 0.3 ? match.score * 2 : 
                                  match.score <= 0.4 ? match.score * 3 : 
                                  match.score <= 0.5 ? match.score * 4 : 
                                  match.score * 5).toFixed(1)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No connections found. Try a different query.
                    </div>
                  )}
                  <div className="mt-4 text-sm text-gray-500">
                    <p>All connections are shown, ranked by relevance to your query. The top result is highlighted.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

