// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { groupsApi, documentsApi, gptApi } from "../../api/client";
// import type { Group, Document } from "../../types/types";
// import { Card } from "../../components/ui/card";
// import { Button } from "../../components/ui/button";

// export function GroupPage() {
//   const { id } = useParams();
//   const [group, setGroup] = useState<Group | null>(null);
//   const [files, setFiles] = useState<Document[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);

//   const [question, setQuestion] = useState("");
//   const [answer, setAnswer] = useState<string | null>(null);
//   const [asking, setAsking] = useState(false);

//   useEffect(() => {
//     if (!id) return;

//     const fetchData = async () => {
//       try {
//         const groupData = await groupsApi.get(Number(id));
//         setGroup(groupData);

//         const filesData = await documentsApi.get(Number(id));
//         setFiles(filesData as Document[]);
//       } catch {
//         setError(true);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [id]);

//   const handleAsk = async () => {
//     if (!question.trim() || !id) return;
//     try {
//       setAsking(true);
//       setAnswer(null);
//       const res = await gptApi.ask({
//         query: question,
//         groupId: Number(id),
//       });
//       setAnswer(res.answer);
//     } catch {
//       setAnswer("Error getting response.");
//     } finally {
//       setAsking(false);
//     }
//   };

//   if (loading) return <div>Loading...</div>;
//   if (error || !group) return <div>Group not found</div>;

//   return (
//     <div className="max-w-2xl space-y-6">
//       <Card className="p-6 space-y-4">
//         {group.img && (
//           <img
//             src={group.img}
//             alt={group.name}
//             className="w-full h-64 object-cover rounded-md"
//           />
//         )}
//         <div>
//           <h1 className="text-2xl font-bold">{group.name}</h1>
//           <p className="text-muted-foreground">ID: {group.id}</p>
//         </div>
//         <Link to={`/group/${group.id}/onedrive`}>
//           <Button>Add file from OneDrive</Button>
//         </Link>
//       </Card>

//       <div>
//         <h2 className="text-xl font-semibold mb-2">Files</h2>
//         {files.length === 0 ? (
//           <p>No files uploaded yet.</p>
//         ) : (
//           <ul className="space-y-2">
//             {files.map((file) => (
//               <li key={file.id}>
//                 <a
//                   href={file.path}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-600 underline"
//                 >
//                   {file.name}
//                 </a>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       <Card className="p-6 space-y-4">
//         <h2 className="text-xl font-semibold">Ask GPT</h2>

//         <div className="flex gap-2">
//           <input
//             value={question}
//             onChange={(e) => setQuestion(e.target.value)}
//             placeholder="Ask something about these files..."
//             className="flex-1 border rounded px-3 py-2"
//           />
//           <Button onClick={handleAsk} disabled={asking}>
//             {asking ? "Asking..." : "Ask"}
//           </Button>
//         </div>

//         {answer && (
//           <div className="whitespace-pre-wrap border rounded p-3 bg-muted">
//             {answer}
//           </div>
//         )}
//       </Card>
//     </div>
//   );
// }
