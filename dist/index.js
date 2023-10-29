import dotenv from "dotenv";
import express from "express";
import Database from "better-sqlite3";
import fs from "fs";
import routes from "./routes/index.js";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import basicAuth from "express-basic-auth";
import { ActivityPub } from "./lib/activitypub.js";
import crypto from "crypto";
import { generateKeyPairSync } from "crypto";
import { createActor, createWebfinger } from "./routes/admin.js";
const app = express();
const db = new Database("bot-node.db");
let sslOptions;
dotenv.config();
const { USERNAME, PASS, DOMAIN, PORT, PRIVKEY_PATH, CERT_PATH, DEFAULT_ACCOUNT, } = process.env;
["USERNAME", "PASS", "DOMAIN"].forEach((required) => {
    if (!process.env[required]) {
        console.error(`Missing required environment variable: \`${required}\`. Exiting.`);
        process.exit(1);
    }
});
if (PRIVKEY_PATH && CERT_PATH) {
    try {
        sslOptions = {
            key: fs.readFileSync(PRIVKEY_PATH),
            cert: fs.readFileSync(CERT_PATH),
        };
    }
    catch (err) {
        if (err.code === "ENOENT") {
            console.log("No SSL key and/or cert found, not enabling https server");
        }
        else {
            console.log(err);
        }
    }
}
db.prepare("CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, privkey TEXT, pubkey TEXT, webfinger TEXT, actor TEXT, apikey TEXT, followers TEXT, messages TEXT)").run();
db.prepare("CREATE TABLE IF NOT EXISTS messages (guid TEXT PRIMARY KEY, message TEXT)").run();
app.set("db", db);
app.set("domain", DOMAIN);
app.set("port", process.env.PORT || PORT || 3000);
app.set("port-https", process.env.PORT_HTTPS || 8443);
app.use(bodyParser.json({
    type: "application/activity+json",
}));
app.use(bodyParser.json({
    type: "application/json",
}));
app.use(bodyParser.json({
    type: "application/ld+json",
}));
app.use(bodyParser.urlencoded({
    extended: true,
}));
function asyncAuthorizer(username, password, cb) {
    const isPasswordAuthorized = username === USERNAME;
    const isUsernameAuthorized = password === PASS;
    const isAuthorized = isPasswordAuthorized && isUsernameAuthorized;
    cb(null, isAuthorized);
}
const basicUserAuth = basicAuth({
    authorizer: asyncAuthorizer,
    authorizeAsync: true,
    challenge: true,
});
function getAccountFromDB(db, accountName) {
    const stmt = db.prepare("SELECT * FROM accounts WHERE name = ?");
    return stmt.get(accountName);
}
let myaccount = getAccountFromDB(db, `${DEFAULT_ACCOUNT}@${DOMAIN}`);

function createNewAccount(db, domain, accountName) {
    return new Promise((resolve, reject) => {
        const { publicKey, privateKey } = generateKeyPairSync("rsa", {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: "spki",
                format: "pem",
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem",
            },
        });
        const actorRecord = createActor(accountName, domain, publicKey);
        const webfingerRecord = createWebfinger(accountName, domain);
        const apikey = crypto.randomBytes(16).toString("hex");
        try {
            db.prepare("INSERT INTO accounts(name, actor, apikey, pubkey, privkey, webfinger) VALUES(?, ?, ?, ?, ?, ?)").run(`${accountName}@${domain}`, JSON.stringify(actorRecord), apikey, publicKey, privateKey, JSON.stringify(webfingerRecord));
            resolve({
                name: `${accountName}@${domain}`,
                actor: actorRecord,
                apikey,
                pubkey: publicKey,
                privkey: privateKey,
                webfinger: webfingerRecord,
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
if (!myaccount) {
    if (!DOMAIN || !DEFAULT_ACCOUNT) {
        console.error("No domain or account set. Exiting.");
        process.exit(1);
    }
    createNewAccount(db, DOMAIN, DEFAULT_ACCOUNT)
        .then((account) => {
        myaccount = account;
        console.log(`Created new account: ${myaccount.actor.preferredUsername}`);
    })
        .catch((err) => {
        console.error("Failed to create new account:", err);
        process.exit(1);
    });
}
else {
    console.log(`Using existing account: ${myaccount.actor.preferredUsername}`);
}
// set the server to use the main account as its primary actor
ActivityPub.account = myaccount;
console.log(`BOOTING SERVER FOR ACCOUNT: ${myaccount.actor}`);
// set up globals
app.set("domain", DOMAIN);
app.set("account", myaccount);
app.get("/", (req, res) => res.send("Hello World!"));
app.get("/test", (req, res) => res.send("Hello World!"));
app.options("/api", cors());
app.use("/api", cors(), routes.api);
app.use("/api/admin", cors({ credentials: true, origin: true }), basicUserAuth, routes.admin);
app.use("/admin", express.static("public/admin"));
app.use("/.well-known/webfinger", cors(), routes.webfinger);
app.use("/u", cors(), routes.user);
app.use("/m", cors(), routes.message);
app.use("/api/inbox", cors(), routes.inbox);
app.use("/api/outbox", cors(), routes.outbox);
http.createServer(app).listen(app.get("port"), function () {
    console.log("Express server listening on port " + app.get("port"));
});
//# sourceMappingURL=index.js.map