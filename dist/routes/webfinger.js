import express from "express";
const router = express.Router();
router.get("/", function (req, res) {
    const resource = req.query.resource;
    if (!resource || !resource.includes("acct:")) {
        return res
            .status(400)
            .send('Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.');
    }
    else {
        const name = resource.replace("acct:", "");
        const db = req.app.get("db");
        const result = db
            .prepare("select webfinger from accounts where name = ?")
            .get(name);
        if (result === undefined) {
            return res.status(404).send(`No record found for ${name}.`);
        }
        else {
            res.json(JSON.parse(result.webfinger));
        }
    }
});
export default router;
//# sourceMappingURL=webfinger.js.map