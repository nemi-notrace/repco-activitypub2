import express from "express";
import request from "request";
import crypto from "crypto";
const router = express.Router();
router.post("/sendMessage", function (req, res) {
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
    }
    else {
        res.status(403).json({ msg: "wrong api key" });
    }
});
function signAndSend(message, name, domain, req, res, targetDomain, inbox) {
    const db = req.app.get("db");
    const inboxFragment = inbox.replace("https://" + targetDomain, "");
    const result = db
        .prepare("select privkey from accounts where name = ?")
        .get(`${name}@${domain}`);
    if (result === undefined) {
        console.log(`No record found for ${name}.`);
    }
    else {
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
        request({
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
        }, function (error, response) {
            console.log(`Sent message to an inbox at ${targetDomain}!`);
            if (error) {
                console.log("Error:", error, response);
            }
            else {
                console.log("Response Status Code:", response.statusCode);
            }
        });
    }
}
function createMessage(text, name, domain, req, res, follower) {
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
    db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(guidCreate, JSON.stringify(createMessage));
    db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(guidNote, JSON.stringify(noteMessage));
    return createMessage;
}
function sendCreateMessage(text, name, domain, req, res) {
    const db = req.app.get("db");
    const result = db
        .prepare("select followers from accounts where name = ?")
        .get(`${name}@${domain}`);
    const followers = JSON.parse(result.followers);
    if (followers === null) {
        res.status(400).json({ msg: `No followers for account ${name}@${domain}` });
    }
    else {
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
export default router;
//# sourceMappingURL=api.js.map