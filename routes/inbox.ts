import express, { Request, Response } from "express";
import crypto from "crypto";
import request from "request";
import debug from "debug";
import { ActivityPub } from "../lib/activitypub.js";
import dotenv from "dotenv";

const logger = debug("inbox");
dotenv.config();
const { DEFAULT_ACCOUNT } = process.env;
const router = express.Router();

function signAndSend(
  message: any,
  name: string,
  domain: string,
  req: Request,
  res: Response,
  targetDomain: string
): void {
  const inbox = `${message.object.actor}/inbox`;
  const inboxFragment = inbox.replace(`https://${targetDomain}`, "");
  const db = req.app.get("db");
  const result = db
    .prepare("select privkey from accounts where name = ?")
    .get(`${name}@${domain}`);

  if (!result) {
    res.status(404).send(`No record found for ${name}.`);
    return;
  }

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
    (error, response) => {
      if (error) {
        console.log("Error:", error, response?.body);
      } else {
        console.log("Response:", response.body);
      }
    }
  );

  res.status(200).end();
}

function sendAcceptMessage(
  thebody: any,
  name: string,
  domain: string,
  req: Request,
  res: Response,
  targetDomain: string
): void {
  const guid = crypto.randomBytes(16).toString("hex");
  const message = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/${guid}`,
    type: "Accept",
    actor: `https://${domain}/u/${name}`,
    object: thebody,
  };
  signAndSend(message, name, domain, req, res, targetDomain);
}

function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// router.post("/", (req: Request, res: Response) => {
//   const domain = req.app.get("domain") as string;
//   const myURL = new URL(req.body.actor);
//   const targetDomain = myURL.hostname;

//   if (typeof req.body.object === "string" && req.body.type === "Follow") {
//     const name = req.body.object.replace(`https://${domain}/u/`, "");
//     sendAcceptMessage(req.body, name, domain, req, res, targetDomain);

//     const db = req.app.get("db");
//     const result = db
//       .prepare("select followers from accounts where name = ?")
//       .get(`${name}@${domain}`);

//     if (!result) {
//       console.log(`No record found for ${name}.`);
//       return;
//     }

//     let followers = parseJSON(result.followers) || [];
//     followers.push(req.body.actor);
//     followers = [...new Set(followers)]; // unique items

//     const followersText = JSON.stringify(followers);
//     try {
//       const newFollowers = db
//         .prepare("update accounts set followers=? where name = ?")
//         .run(followersText, `${name}@${domain}`);
//       console.log("updated followers!", newFollowers);
//     } catch (e) {
//       console.log("error", e);
//     }
//   }
// });

function getDefaultUserFromDB(db: any): any {
  const stmt = db.prepare("SELECT * FROM accounts WHERE name = ?");
  const user = stmt.get(DEFAULT_ACCOUNT); // Assuming "admin" is the default user's name.
  return user;
}

// router.post("/", async (req:any, res:any) => {
//   const incomingRequest = req.body;
//   const actor = incomingRequest.actor;
//   if (incomingRequest) {
//     logger("New message", JSON.stringify(incomingRequest, null, 2));
//     logger("Looking up actor", incomingRequest.actor);
//     const defaultUser = getDefaultUserFromDB(req.app.get("db"));

//     // Check if the incoming request's actor matches the default user
//     if (actor !== defaultUser.actor.id) {
//       logger("Request actor does not match default user:", actor.id);
//       return res.status(403).send("Unauthorized actor");
//     }
//     // FIRST, validate the actor
//     if (ActivityPub.validateSignature(actor, req)) {
//       switch (incomingRequest.type) {

//         // case "Follow":
//         //   logger("Incoming follow request");
//         //   addFollower(incomingRequest);

//         //   // TODO: should wait to confirm follow acceptance?
//         //   ActivityPub.sendAccept(actor, incomingRequest);
//         //   break;

//         // case "Accept":
//         //   switch (incomingRequest.object.type) {
//         //     case "Follow":
//         //       logger("Incoming follow request");
//         //       follow(incomingRequest);
//         //       break;
//         //     default:
//         //       logger("Unknown undo type");
//         //   }
//         //   break;

//         // case "Create":
//         //   logger("incoming create");

//         //     await createActivity(incomingRequest.object);
//         //   }

//         //   break;

//       case "" : console.log("incomingRequest", incomingRequest); break;
//       default: logger("Unknown request type:", incomingRequest);
//     } else {
//       logger("Signature failed:", incomingRequest);
//       return res.status(403).send("Invalid signature");
//     }
//   } else {
//     logger("Unknown request format:", incomingRequest);
//   }
//   return res.status(200).send();
// });

// export default router;
router.post("/", async (req: Request, res: Response) => {
  const incomingRequest = req.body;

  if (incomingRequest) {
    logger("New message", JSON.stringify(incomingRequest, null, 2));
    logger("Looking up actor", incomingRequest.actor);

    const defaultUser = getDefaultUserFromDB(req.app.get("db"));

    if (incomingRequest.actor !== defaultUser.actor.id) {
      logger(
        "Request actor does not match default user:",
        incomingRequest.actor
      );
      return res.status(403).send("Unauthorized actor");
    }

    if (ActivityPub.validateSignature(incomingRequest.actor, req)) {
      switch (incomingRequest.type) {
        case "":
          console.log("incomingRequest", incomingRequest);
          break;
        default:
          logger("Unknown request type:", incomingRequest.type);
      }
    } else {
      logger("Signature failed:", incomingRequest);
      return res.status(403).send("Invalid signature");
    }
  } else {
    logger("Unknown request format:", incomingRequest);
  }

  return res.status(200).send();
});

export default router;
