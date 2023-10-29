import express, { Request, Response } from "express";
import crypto from "crypto";
import { fetchUser } from "./user.js";

const router = express.Router();

export function createActor(name: string, domain: string, pubkey: string) {
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: `https://${domain}/u/${name}`,
    type: "Person",
    preferredUsername: `${name}`,
    inbox: `https://${domain}/api/inbox`,
    outbox: `https://${domain}/u/${name}/outbox`,
    followers: `https://${domain}/u/${name}/followers`,
    publicKey: {
      id: `https://${domain}/u/${name}#main-key`,
      owner: `https://${domain}/u/${name}`,
      publicKeyPem: pubkey,
    },
  };
}

export function createWebfinger(name: string, domain: string) {
  return {
    subject: `acct:${name}@${domain}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: `https://${domain}/u/${name}`,
      },
    ],
  };
}

router.post("/create", function (req: Request, res: Response) {
  const account = req.body.account;
  if (account === undefined) {
    return res.status(400).json({
      msg: 'Bad request. Please make sure "account" is a property in the POST body.',
    });
  }
  const db = req.app.get("db");
  const domain = req.app.get("domain");

  crypto.generateKeyPair(
    "rsa",
    {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    },
    (err, publicKey, privateKey) => {
      const actorRecord = createActor(account, domain, publicKey);
      const webfingerRecord = createWebfinger(account, domain);
      const apikey = crypto.randomBytes(16).toString("hex");
      try {
        db.prepare(
          "insert or replace into accounts(name, actor, apikey, pubkey, privkey, webfinger) values(?, ?, ?, ?, ?, ?)"
        ).run(
          `${account}@${domain}`,
          JSON.stringify(actorRecord),
          apikey,
          publicKey,
          privateKey,
          JSON.stringify(webfingerRecord)
        );
        res.status(200).json({ msg: "ok", apikey });
      } catch (e) {
        res.status(200).json({ error: e });
      }
    }
  );
});

export default router;
