const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.1",
    name: "Basketball Replays",
    description: "Full Game Replays",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs: [{
        type: "movie",
        id: "bv_latest",
        name: "Latest Replays"
    }],
    idPrefixes: ["bv_"]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    try {
        const { data } = await axios.get("https://basketball-video.com/", {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });
        const $ = cheerio.load(data);
        const metas = [];

        $("article").each((i, el) => {
            const title = $(el).find(".entry-title").text().trim();
            const pageUrl = $(el).find("a").attr("href");
            let img = $(el).find("img").attr("src");

            if (img && img.startsWith('//')) img = 'https:' + img;

            if (title && pageUrl) {
                metas.push({
                    // Simplify ID: use index to avoid encoding issues for now
                    id: `bv_game_${i}`, 
                    name: title,
                    poster: img || "https://placehold.co/600x400?text=No+Image",
                    posterShape: "landscape",
                    type: "movie",
                    description: title
                });
            }
        });
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

// Stremio REQUIRES a meta handler to make items clickable
builder.defineMetaHandler(async (args) => {
    return { meta: { id: args.id, type: "movie", name: "Game Details" } };
});

builder.defineStreamHandler(async (args) => {
    return { streams: [] };
});

const addonInterface = builder.getInterface();

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const url = req.url === '/' ? '/manifest.json' : req.url;
    
    addonInterface.get(url.replace('/', ''), (err, response) => {
        if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Internal Server Error" }));
            return;
        }
        res.end(JSON.stringify(response));
    });
};
