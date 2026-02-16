import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { oneDriveApi, documentsApi } from "../../api/client"

interface OneDriveItem {
  id: string
  name: string
  webUrl: string
  size: number
  folder?: { childCount: number }
  file?: { mimeType: string }
}

export function OneDriveListPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const [items, setItems] = useState<OneDriveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    oneDriveApi
      .listFiles()
      .then(setItems as any) //HERE TODO
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const addToGroup = async (item: OneDriveItem) => {
    console.log('groupId', groupId)
    if (!groupId) return
    try {
      await documentsApi.link({
        groupId: Number(groupId),
        link: item.id,
      })
      alert(`Added "${item.name}" to group ${groupId}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return <div>Loading OneDrive items...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">OneDrive Items</h1>
      {items.length === 0 ? (
        <div>No items found</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border rounded p-2 flex justify-between items-center">
              <div>
                <a href={item.webUrl} target="_blank" rel="noopener noreferrer">
                  <strong>{item.name}</strong>
                </a>
                <div className="text-sm text-gray-500">
                  {item.folder ? `${item.folder.childCount} items` : item.file?.mimeType} • {item.size} bytes
                </div>
              </div>
              <button
                onClick={() => addToGroup(item)}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add to Group
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}