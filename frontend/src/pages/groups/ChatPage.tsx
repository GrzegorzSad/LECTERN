import { useState } from "react";
import { useParams } from "react-router-dom";
import { gptApi } from "../../api/client";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useGroup } from "./GroupLayout";

export function ChatPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || !id) return;
    try {
      setAsking(true);
      setAnswer(null);
      const res = await gptApi.ask({ query: question, groupId: Number(id) });
      setAnswer(res.answer);
    } catch {
      setAnswer("Error getting response.");
    } finally {
      setAsking(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <Card className="p-6 space-y-4 max-w-2xl">
      <h2 className="text-xl font-semibold">Ask GPT</h2>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about these files..."
          className="flex-1 border rounded px-3 py-2"
        />
        <Button onClick={handleAsk} disabled={asking}>
          {asking ? "Asking..." : "Ask"}
        </Button>
      </div>
      {answer && (
        <div className="whitespace-pre-wrap border rounded p-3 bg-muted">
          {answer}
        </div>
      )}
    </Card>
  );
}