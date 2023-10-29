import express, { Request, Response } from "express";
const router = express.Router();

router.get("/:name", function (req: Request, res: Response) {
  const nameParam = req.params.name;
  const db = req.app.get("db");
  const domain = req.app.get("domain");

  if (!nameParam) {
    return res.status(400).send("Bad request.");
  }

  const name = `${nameParam}@${domain}`;
  const result = db
    .prepare("select actor from accounts where name = ?")
    .get(name);

  if (result === undefined) {
    return res.status(404).send(`No record found for ${name}.`);
  }

  const tempActor = JSON.parse(result.actor);
  if (tempActor.followers === undefined) {
    tempActor.followers = `https://${domain}/u/${nameParam}/followers`;
  }
  res.json(tempActor);
});

router.get("/:name/followers", function (req: Request, res: Response) {
  const name = req.params.name;
  const db = req.app.get("db");
  const domain = req.app.get("domain");

  if (!name) {
    return res.status(400).send("Bad request.");
  }

  const result = db
    .prepare("select followers from accounts where name = ?")
    .get(`${name}@${domain}`);
  const followers = JSON.parse(result.followers || "[]");

  const followersCollection = {
    type: "OrderedCollection",
    totalItems: followers.length,
    id: `https://${domain}/u/${name}/followers`,
    first: {
      type: "OrderedCollectionPage",
      totalItems: followers.length,
      partOf: `https://${domain}/u/${name}/followers`,
      orderedItems: followers,
      id: `https://${domain}/u/${name}/followers?page=1`,
    },
    "@context": ["https://www.w3.org/ns/activitystreams"],
  };
  res.json(followersCollection);
});

export async function fetchUser(handle: string, db: any) {
  // Extract username and domain from the handle
  const match = handle.match(/^@?([^@]+)@(.+)$/);
  if (!match) {
    throw new Error(`Invalid handle format: ${handle}`);
  }

  const [_, name, domain] = match;
  const fullName = `${name}@${domain}`; // This is the format stored in the 'name' column

  try {
    const result = db
      .prepare("select actor from accounts where name = ?")
      .get(fullName);

    if (!result) {
      console.log(`No record found for ${fullName}.`);
      return null;
    }

    const tempActor = JSON.parse(result.actor);
    // if (!tempActor.followers) {
    //   tempActor.followers = `https://${domain}/u/${name}/followers`;
    // }
    return tempActor;
  } catch (error: any) {
    console.error("Error fetching user:", error.message);
    return null; // or you can return a default value or handle the error as needed
  }
}

export default router;
