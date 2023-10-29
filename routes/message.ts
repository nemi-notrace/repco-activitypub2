import express, { Request, Response } from "express";

const router = express.Router();

router.get("/:guid", function (req: Request, res: Response) {
  const guid = req.params.guid;
  if (!guid) {
    return res.status(400).send("Bad request.");
  } else {
    const db = req.app.get("db");
    const result = db
      .prepare("select message from messages where guid = ?")
      .get(guid);
    if (result === undefined) {
      return res.status(404).send(`No record found for ${guid}.`);
    } else {
      res.json(JSON.parse(result.message));
    }
  }
});

export default router;
