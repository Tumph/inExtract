"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function VideoListApp() {
  const [items, setItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState("")
  const [showPopup, setShowPopup] = useState(false)

  const addItem = () => {
    if (newItem.trim()) {
      // Split by comma, colon, or semicolon
      const itemsArray = newItem
        .split(/[,:;]+/)
        .map((item) => item.trim())
        .filter((item) => item !== "")
      setItems([...items, ...itemsArray])
      setNewItem("")
      if (itemsArray.length > 0) {
        setShowPopup(true)
      }
    }
  }

  const removeItem = (index: number) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Video List App</h1>

      {/* Video Embed */}
      <div className="aspect-video bg-muted mb-6 rounded-lg overflow-hidden">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Embedded video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-2">
          <textarea
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add items separated by commas, colons, or semicolons..."
            className="flex-1 min-h-[100px] p-2 border rounded-md"
          />
          <Button onClick={addItem} className="w-full">
            Enter
          </Button>
        </div>

        {items.length > 0 && (
          <Button onClick={() => setShowPopup(true)} className="w-full">
            View List
          </Button>
        )}
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="fixed inset-0" onClick={() => setShowPopup(false)}></div>
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-2xl z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Items</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPopup(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

