import express from "express";
const router = express.Router();
router.get("/:name", function (req, res) {
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
router.get("/:name/followers", function (req, res) {
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
export default router;
//# sourceMappingURL=user.js.map