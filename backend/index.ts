import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.send("OK"));

app.listen(4000, () => console.log("Backend running on port 4000"));