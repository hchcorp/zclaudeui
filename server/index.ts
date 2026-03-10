import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { buttonsRouter } from "./routes/buttons.js";
import { runRouter } from "./routes/run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 6970;

app.use(express.json());

// API routes
app.use("/api/buttons", buttonsRouter);
app.use("/api/run", runRouter);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Zak-UI server running on http://0.0.0.0:${PORT}`);
});
