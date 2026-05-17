import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

const port = Number(process.env.PORT) || 4010;

app.listen(port, "0.0.0.0", () => {
    console.log(`API running on port ${port}`);
});
