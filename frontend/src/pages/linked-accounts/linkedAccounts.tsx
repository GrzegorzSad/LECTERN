import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "../../components/card"
import { Button } from "../../components/button"
import { linkedAccountsApi } from "../../api/client"

interface LinkedAccount {
  id: number
  provider: string
  providerId: string
}

export function LinkedAccountsPage() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadAccounts = async () => {
    try {
      const data = await linkedAccountsApi.list()
      setAccounts(data as LinkedAccount[])
    } catch {
      navigate("/login", { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleUnlink = async (id: number) => {
    await linkedAccountsApi.unlink(id)
    loadAccounts()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Linked Accounts</h1>

      <div className="flex gap-4">
        <Button onClick={() => linkedAccountsApi.redirectToMicrosoft()}>
          Link Microsoft
        </Button>
      </div>

      {accounts.length === 0 && (
        <div className="text-muted-foreground">No linked accounts.</div>
      )}

      {accounts.map((account) => (
        <Card key={account.id} className="p-4 flex justify-between items-center">
          <div>
            <div className="font-medium">{account.provider}</div>
            <div className="text-sm text-muted-foreground">
              {account.providerId}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleUnlink(account.id)}
          >
            Unlink
          </Button>
        </Card>
      ))}
    </div>
  )
}