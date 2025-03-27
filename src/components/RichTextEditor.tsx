import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Paste your LinkedIn connections here...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[200px] p-2',
        ...(placeholder && !value ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  // Update placeholder when content changes
  useEffect(() => {
    if (editor) {
      if (editor.isEmpty) {
        editor.view.dom.setAttribute('data-placeholder', placeholder)
      } else {
        editor.view.dom.removeAttribute('data-placeholder')
      }
    }
  }, [editor, placeholder, value])

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <EditorContent className="w-full" editor={editor} />
    </div>
  )
} 