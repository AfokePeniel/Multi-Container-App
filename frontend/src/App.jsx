import { useState, useEffect } from 'react'

// API base URL — in production (inside container), Nginx proxies /api to the backend
const API = '/api'

export default function App() {
  const [notes, setNotes] = useState([])
  const [input, setInput] = useState('')
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check backend + DB health on load
  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error' }))
  }, [])

  // Load all notes
  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API}/notes`)
      const data = await res.json()
      setNotes(data)
    } catch {
      setError('Could not load notes')
    }
  }

  useEffect(() => { fetchNotes() }, [])

  // Add a note
  const addNote = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      await fetch(`${API}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      })
      setInput('')
      await fetchNotes()
    } catch {
      setError('Could not add note')
    } finally {
      setLoading(false)
    }
  }

  // Delete a note
  const deleteNote = async (id) => {
    try {
      await fetch(`${API}/notes/${id}`, { method: 'DELETE' })
      await fetchNotes()
    } catch {
      setError('Could not delete note')
    }
  }

  return (
    <div className="app">
      <header>
        <h1>📦 Multi-Container Notes</h1>
        <p className="subtitle">React · Node.js · PostgreSQL</p>
        <div className={`health-badge ${health?.status === 'ok' ? 'ok' : 'error'}`}>
          {health?.status === 'ok'
            ? `✅ All systems up — DB time: ${new Date(health.db_time).toLocaleTimeString()}`
            : '❌ Backend or DB unreachable'}
        </div>
      </header>

      <main>
        <div className="input-row">
          <input
            type="text"
            placeholder="Write a note..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <button onClick={addNote} disabled={loading}>
            {loading ? 'Adding...' : 'Add Note'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <ul className="notes-list">
          {notes.length === 0 && <li className="empty">No notes yet. Add one above.</li>}
          {notes.map((note) => (
            <li key={note.id} className="note-item">
              <span>{note.content}</span>
              <div className="note-meta">
                <small>{new Date(note.created_at).toLocaleString()}</small>
                <button className="delete-btn" onClick={() => deleteNote(note.id)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
