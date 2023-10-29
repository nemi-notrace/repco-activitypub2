import express, { Request, Response } from "express";
import request from "request";
import crypto from "crypto";
import { fetchUser } from "./user.js";
import axios from "axios";
import { ActivityPub } from "../lib/activitypub.js";
const router = express.Router();

router.post("/sendMessage", function (req: Request, res: Response) {
  const db = req.app.get("db");
  const domain = req.app.get("domain");
  const acct = req.body.acct;
  const apikey = req.body.apikey;
  const message = req.body.message;

  const result = db
    .prepare("select apikey from accounts where name = ?")
    .get(`${acct}@${domain}`);
  if (result.apikey === apikey) {
    sendCreateMessage(message, acct, domain, req, res);
  } else {
    res.status(403).json({ msg: "wrong api key" });
  }
});

function signAndSend(
  message: any,
  name: string,
  domain: string,
  req: Request,
  res: Response,
  targetDomain: string,
  inbox: string
) {
  const db = req.app.get("db");
  const inboxFragment = inbox.replace("https://" + targetDomain, "");
  const result = db
    .prepare("select privkey from accounts where name = ?")
    .get(`${name}@${domain}`);
  if (result === undefined) {
    console.log(`No record found for ${name}.`);
  } else {
    const privkey = result.privkey;
    const digestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(message))
      .digest("base64");
    const signer = crypto.createSign("sha256");
    const d = new Date();
    const stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;
    signer.update(stringToSign);
    signer.end();
    const signature = signer.sign(privkey);
    const signature_b64 = signature.toString("base64");
    const header = `keyId="https://${domain}/u/${name}",headers="(request-target) host date digest",signature="${signature_b64}"`;
    request(
      {
        url: inbox,
        headers: {
          Host: targetDomain,
          Date: d.toUTCString(),
          Digest: `SHA-256=${digestHash}`,
          Signature: header,
        },
        method: "POST",
        json: true,
        body: message,
      },
      function (error, response) {
        console.log(`Sent message to an inbox at ${targetDomain}!`);
        if (error) {
          console.log("Error:", error, response);
        } else {
          console.log("Response Status Code:", response.statusCode);
        }
      }
    );
  }
}

function createMessage(
  text: string,
  name: string,
  domain: string,
  req: Request,
  res: Response,
  follower: string
) {
  const guidCreate = crypto.randomBytes(16).toString("hex");
  const guidNote = crypto.randomBytes(16).toString("hex");
  const db = req.app.get("db");
  const d = new Date();

  const noteMessage = {
    id: `https://${domain}/m/${guidNote}`,
    type: "Note",
    published: d.toISOString(),
    attributedTo: `https://${domain}/u/${name}`,
    content: text,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
  };

  const createMessage = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/m/${guidCreate}`,
    type: "Create",
    actor: `https://${domain}/u/${name}`,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [follower],
    object: noteMessage,
  };

  db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(
    guidCreate,
    JSON.stringify(createMessage)
  );
  db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(
    guidNote,
    JSON.stringify(noteMessage)
  );

  return createMessage;
}

function sendCreateMessage(
  text: string,
  name: string,
  domain: string,
  req: Request,
  res: Response
) {
  const db = req.app.get("db");

  const result = db
    .prepare("select followers from accounts where name = ?")
    .get(`${name}@${domain}`);
  const followers = JSON.parse(result.followers);
  if (followers === null) {
    res.status(400).json({ msg: `No followers for account ${name}@${domain}` });
  } else {
    for (const follower of followers) {
      const inbox = follower + "/inbox";
      const myURL = new URL(follower);
      const targetDomain = myURL.host;
      const message = createMessage(text, name, domain, req, res, follower);
      signAndSend(message, name, domain, req, res, targetDomain, inbox);
    }
    res.status(200).json({ msg: "ok" });
  }
}
async function lookupActor(handle: string, db: any) {
  // Check if handle is a string and is not empty
  if (typeof handle !== "string" || !handle) {
    return { error: "Invalid handle provided" };
  }

  // Modified regex to match both @user@domain and user@domain formats
  const match = handle.match(/^@?([^@]+)@(.+)$/);
  if (!match) {
    return { error: "Invalid handle format" };
  }
  const username = match[1];
  const domain = match[2];
  // First, try to fetch the user locally
  console.log("Fetching local user...");
  let actor = await fetchUser(handle, db);
  console.log(actor);
  // If not found locally, try to fetch from remote using WebFinger
  if (!actor || actor === null) {
    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
    console.log("Fetching remote user...");
    console.log(webfingerUrl);

    const webfingerResponse = await fetch(webfingerUrl, {
      headers: {
        Accept: "application/jrd+json, application/json, application/ld+json",
      },
    });

    if (!webfingerResponse.ok) {
      throw new Error(
        `could not get webfinger ${webfingerUrl}: ${webfingerResponse.status}`
      );
    }

    const webfinger = await webfingerResponse.json();
    const actorLink = webfinger.links.find((link: any) => link.rel === "self");

    if (!actorLink || !actorLink.href) {
      throw new Error("Actor link not found in WebFinger response");
    }

    // Fetch the actor
    const actorResponse = await fetch(actorLink.href, {
      headers: {
        Accept:
          'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
      },
    });

    if (!actorResponse.ok) {
      throw new Error("Failed to fetch actor");
    }

    actor = await actorResponse.json();
  }
  return actor; // This will either return the actor object or null
}

router.post("/lookup", async (req: Request, res: Response) => {
  const handle = req.body.handle;
  const actor = await lookupActor(handle, req.app.get("db"));
  if (actor) {
    return res.status(200).json({ actor });
  } else {
    return res.status(404).json({ error: "No user found" });
  }
});

function isFollowing(actorId: string, db: any, accountName: string): boolean {
  const result = db
    .prepare("SELECT followers FROM accounts WHERE name = ?")
    .get(accountName);
  if (result && result.followers) {
    const followersList = JSON.parse(result.followers);
    return followersList.includes(actorId);
  }
  return false;
}
function writeFollowing(following: any[], db: any, accountName: string): void {
  const followersJSON = JSON.stringify(following);
  db.prepare("UPDATE accounts SET followers = ? WHERE name = ?").run(
    followersJSON,
    accountName
  );
}
router.post("/follow", async function (req: Request, res: Response) {
  const handle: string | undefined = req.body.handle;
  const db = req.app.get("db");
  const accountName: string = req.app.get("account").actor.preferredUsername;

  console.log(`Received follow request for handle: ${handle}`);

  if (handle) {
    const actor = await lookupActor(handle, db);
    if (actor) {
      console.log(`Found actor for handle: ${handle}`);
      console.log(`Sending follow request to ${handle} from default actor.`);
      ActivityPub.sendFollow(actor);

      return res.status(200).json({
        isFollowed: true,
      });
    } else {
      console.log(`Actor not found for handle: ${handle}`);
    }
  } else {
    console.log("Handle not provided in the request.");
  }
  res.status(404).send("not found");
});

export default router;
