const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.nuvio",
    version: "1.0.0",
    name: "Basketball Replays",
    description: "Browse games in landscape cards; Play in browser",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Replays" }],
    idPrefixes: ["bv_"]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async () => {
    try {
        const { data } = await axios.get("https://basketball-video.com/", {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const metas = [];

        $("article").each((i, el) => {
            const title = $(el).find(".entry-title").text().trim();
            const pageUrl = $(el).find("a").attr("href");
            const img = $(el).find("img").attr("src");

            if (title && pageUrl) {
                metas.push({
                    id: `bv_${Buffer.from(pageUrl).toString('base64')}`,
                    name: title,
                    poster: img,
                    posterShape: "landscape", 
                    type: "movie"
                });
            }
        });
        return { metas };
    } catch (e) { return { metas: [] }; }
});

builder.defineStreamHandler(async ({ id }) => {
    const targetUrl = Buffer.from(id.replace("bv_", ""), 'base64').toString();
    return {
        streams: [{
            title: "🚀 Watch Game on Web",
            externalUrl: targetUrl 
        }]
    };
});

// For Vercel Serverless compatibility
const addonInterface = builder.getInterface();
module.exports = (req, res) => {
    if (req.url === '/') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(manifest));
    } else {
        addonInterface.get(req.url.replace('/', ''), (err, response) => {
            if (err) return res.status(500).end();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
        });
    }
};