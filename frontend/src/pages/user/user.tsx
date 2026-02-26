import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authApi } from "../../api/client"
import { Card } from "../../components/card"
import { Button } from "../../components/button"
import { Link } from "react-router-dom"

interface User {
  id: number
  name: string
  email: string
}

export function UserPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authApi.me() as any //HERE TODO
        setUser(data)
      } catch {
        setError(true)
        navigate("/login", { replace: true })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [navigate])

  if (loading) return <div>Loading...</div>
  if (error || !user) return <div>User not found</div>

  return (
    <div className="max-w-2xl">
      <Card className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">Email: {user.email}</p>
          <p className="text-muted-foreground">ID: {user.id}</p>
        </div>
      </Card>
      <Link to="/linked-accounts"><Button>Linked Accounts</Button></Link>
    </div>
  )
}