import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/button";
import { Separator } from "../components/separator";

const features = [
  {
    number: "01",
    title: "Upload & Organise",
    description: "Bring your documents, PDFs, and files into shared group workspaces.",
  },
  {
    number: "02",
    title: "Ask Anything",
    description: "Query your files with AI — get precise answers grounded in your actual content.",
  },
  {
    number: "03",
    title: "Collaborate",
    description: "Channels keep conversations focused. Private chats let you think alone.",
  },
];

export default function Home() {
  const { loggedIn } = useAuth();

  return (
    <div className="flex flex-col items-center min-h-full">
      {/* Hero */}
      <div className="flex flex-col items-center text-center px-4 pt-24 pb-16 max-w-2xl mx-auto gap-6">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Knowledge, shared
        </p>
        <h1 className="text-6xl font-bold tracking-tight">
          Lectern
        </h1>
        <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-md">
          Upload your documents, gather your team, and let AI answer questions
          directly from your files — no hallucinations, no guessing.
        </p>
        <div className="flex gap-3 pt-2">
          {loggedIn ? (
            <h3>Create or join a group to get started</h3>
          ) : (
            <>
              <Button size="lg">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline">
                <Link to="/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator className="max-w-2xl w-full" />

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 px-4 py-16 max-w-2xl w-full">
        {features.map((f) => (
          <div key={f.number} className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground/50 font-medium">{f.number}</p>
            <p className="text-sm font-medium">{f.title}</p>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>

      <Separator className="max-w-2xl w-full" />

      <p className="text-xs text-muted-foreground/40 tracking-widest uppercase py-8">
        Lectern — Ask your documents anything
      </p>
    </div>
  );
}