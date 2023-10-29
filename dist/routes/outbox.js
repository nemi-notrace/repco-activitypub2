import express from "express";
const router = express.Router();
router.get("/:name/outbox", function (req, res) {
    let name = req.params.name;
    if (!name) {
        return res.status(400).send("Bad request.");
    }
    else {
        let domain = req.app.get("domain");
        let messages = [];
        let outboxCollection = {
            type: "OrderedCollection",
            totalItems: messages.length,
            id: `https://${domain}/u/${name}/outbox`,
            first: {
                type: "OrderedCollectionPage",
                totalItems: messages.length,
                partOf: `https://${domain}/u/${name}/outbox`,
                orderedItems: messages,
                id: `https://${domain}/u/${name}/outbox?page=1`,
            },
            "@context": ["https://www.w3.org/ns/activitystreams"],
        };
        res.json(outboxCollection);
    }
});
export default router;
//# sourceMappingURL=outbox.js.map