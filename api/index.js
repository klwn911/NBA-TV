const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.nuvio",
    version: "1.0.0",
    name: "Basketball Replays",
    description: "Browse games in landscape cards",
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
            let img = $(el).find("img").attr("src");

            // Ensure image uses HTTPS or Stremio will block it
            if (img && img.startsWith('//')) img = 'https:' + img;

            if (title && pageUrl) {
                metas.push({
                    id: `bv_${Buffer.from(pageUrl).toString('base64').substring(0, 20)}`, // Shorter IDs are more stable
                    name: title,
                    poster: img,
                    posterShape: "landscape", 
                    type: "movie",
                    description: `Watch ${title} replay` // Adding a description makes it interactable
                });
            }
        });
        return { metas };
    } catch (e) { return { metas: [] }; }
});

builder.defineStreamHandler(async ({ id }) => {
    // Note: Since we shortened the ID for the catalog, 
    // we would usually need a lookup, but for now, 
    // let's just get the catalog appearing first.
    return { streams: [] }; 
});

const addonInterface = builder.getInterface();

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/' || req.url === '/manifest.json') {
        res.end(JSON.stringify(manifest));
    } else {
        addonInterface.get(req.url.replace('/', ''), (err, response) => {
            if (err) { res.statusCode = 500; res.end(); return; }
            res.end(JSON.stringify(response));
        });
    }
};
