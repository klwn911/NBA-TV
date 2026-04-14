const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.2",
    name: "Basketball Replays",
    description: "Full Game Replays",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Replays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const urlParts = req.url.split('/').filter(Boolean);
    const resource = urlParts; // e.g., "catalog" or "manifest.json"

    try {
        // 1. Handle Manifest
        if (!resource || resource === "manifest.json") {
            return res.status(200).json(manifest);
        }

        // 2. Handle Catalog (The Grid)
        if (resource === "catalog") {
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
                        id: `bv_${Buffer.from(pageUrl).toString('base64').substring(0, 15)}`,
                        name: title,
                        poster: img,
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });
            return res.status(200).json({ metas });
        }

        // 3. Handle Meta (The Details)
        if (resource === "meta") {
            return res.status(200).json({ meta: { id: urlParts, type: "movie", name: "Game Details" } });
        }

        // 4. Handle Stream
        if (resource === "stream") {
            return res.status(200).json({ streams: [] });
        }

        return res.status(404).json({ error: "Not found" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server Error" });
    }
};
