import express, { Request, Response } from "express";

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("HELLO FROM THE SHWEPS");
});
app.listen(4000, () => {
  console.log("SERVER RUNNING !");
});
