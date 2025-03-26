"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { analyzeConnections } from "@/lib/nlp-utils"

export default function LinkedInConnectionsAnalyzer() {
  const [connections, setConnections] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [matches, setMatches] = useState<{name: string, description: string, score: number}[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const validateFormat2 = (text: string): boolean => {
    const hasConnectedOn = text.includes("Connected") && text.includes("ago");
    const hasMessage = text.includes("Message");
    const sections = text.split("Message").filter(s=>s.trim()!=="");
    if(sections.length === 0){
      return false;
    }
    const sampleSection = sections[0];
    const lines = sampleSection.split('\n').map(line => line.trim()).filter(line => line !== "");
    //alert(lines.length)
    const hasEnoughLines = lines.length >= 5;
    const hasSectionWithConnectedOn = sampleSection.includes("Connected")&&sampleSection.includes("ago");
    return (hasConnectedOn && hasMessage && hasEnoughLines && hasSectionWithConnectedOn)||(validateFormat2(text));
  }
  // Function to validate LinkedIn connections format
  const validateFormat = (text: string): boolean => {
    // Check for essential patterns that should be in LinkedIn connections export
    const hasConnectedOn = text.includes("connected on")
    const hasMessage = text.includes("Message")
    
    // Check if we can identify at least one complete connection section
    const sections = text.split("Message").filter(s => s.trim() !== "");
    
    if (sections.length === 0) {
      return false;
    }
    
    // Sample a section to verify it contains the expected pattern
    const sampleSection = sections[0];
    const lines = sampleSection.split('\n').map(line => line.trim()).filter(line => line !== "");
    
    // A valid section should have:
    // 1. At least 3 non-empty lines (name, description, connected date)
    // 2. At least one line with "connected on"
    const hasEnoughLines = lines.length >= 3;
    const hasSectionWithConnectedOn = sampleSection.includes("connected on");
    
    return (hasConnectedOn && hasMessage && hasEnoughLines && hasSectionWithConnectedOn)||(validateFormat2(text));
  }

  // Parse LinkedIn connections from text
  const parseConnections = (text: string) => {
    // Split the text into sections based on "Message" as the separator
    // Each section represents one complete connection profile
    const sections = text.split("Message").filter(s => s.trim() !== "");
    
    const people: {[key: string]: string} = {};
    
    sections.forEach(section => {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line !== "");
      
      // Look for the pattern:
      // 1. Skip any lines with "profile picture"
      // 2. Find the first line that isn't "connected on..." - this is the name
      // 3. The next non-empty line is the description
      // 4. Ignore lines with "connected on..."
      
      let nameFound = false;
      let name = "";
      let description = "";
      if(lines.length !== 6){
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip profile picture lines
          if (line.includes("profile picture")) {
            continue;
          }
          
          // Skip "connected on" lines
          if (line.includes("connected on")) {
            continue;
          }
          
          // If we haven't found the name yet, this line is the name
          if (!nameFound) {
            // Clean up names with possessive 's (e.g., "Samuel Zhang's")
            name = line.replace(/'s$/, '');
            nameFound = true;
            continue;
          }
          
          // If we have the name, this is the description
          if (nameFound && !description) {
            description = line;
            break; // We have both name and description, no need to continue
          }
        }
      }else{
        name = lines[0];
        description = lines[4];
      }
      
      
      // Add to the people object if we have both name and description
      if (name && description) {
        people[name] = description;
      }
    });
    
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
    setMatches(results)
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
      <h1 className="text-2xl font-bold mb-6">LinkedIn Connections Analyzer</h1>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="connections" className="font-medium">
            Paste your LinkedIn connections
          </label>
          <textarea
            id="connections"
            value={connections}
            onChange={(e) => setConnections(e.target.value)}
            placeholder="Paste your LinkedIn connections here (format should match the extract.txt example)"
            className="flex-1 min-h-[200px] p-2 border rounded-md"
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
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-2xl z-10">
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
                            <TableCell className="font-medium">{match.name}</TableCell>
                            <TableCell>{match.description}</TableCell>
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
                                {match.score.toFixed(1)}
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

