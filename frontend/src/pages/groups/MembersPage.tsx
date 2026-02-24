import { useGroup } from "./GroupLayout";
import { Card } from "../../components/ui/card";

export function MembersPage() {
  const { group, loading, error } = useGroup();

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <Card className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Members</h2>
      <p className="text-muted-foreground">Members list coming soon.</p>
    </Card>
  );
}