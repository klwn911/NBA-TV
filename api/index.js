const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.3",
    name: "Basketball Replays",
    description: "Full Game Replays",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Replays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    // Standard CORS and JSON Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();

    try {
        // 1. Handle Manifest (Match "/" or "/manifest.json")
        if (path === "/" || path.includes("manifest.json")) {
            return res.status(200).json(manifest);
        }

        // 2. Handle Catalog
        if (path.includes("/catalog/")) {
            const { data } = await axios.get("https://basketball-video.com/", {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
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

        // 3. Handle Meta (Details page)
        if (path.includes("/meta/")) {
            return res.status(200).json({ 
                meta: { 
                    id: "bv_game", 
                    type: "movie", 
                    name: "Game Replay",
                    posterShape: "landscape" 
                } 
            });
        }

        // 4. Handle Stream
        if (path.includes("/stream/")) {
            return res.status(200).json({ streams: [] });
        }

        // Fallback for everything else
        return res.status(200).json(manifest);

    } catch (error) {
        return res.status(200).json({ metas: [] }); // Return empty catalog on error to prevent greying out
    }
};
