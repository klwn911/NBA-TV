const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.4",
    name: "Basketball Replays",
    description: "Full Game Replays",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Replays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();

    try {
        if (path === "/" || path.includes("manifest.json")) {
            return res.status(200).json(manifest);
        }

        if (path.includes("/catalog/")) {
            const { data } = await axios.get("https://basketball-video.com/", {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' },
                timeout: 8000
            });
            const $ = cheerio.load(data);
            const metas = [];

            // Targeted Scraper
            $("article, .post-block, .entry-header").each((i, el) => {
                const titleElement = $(el).find(".entry-title a, h2 a, h3 a").first();
                const title = titleElement.text().trim();
                const pageUrl = titleElement.attr("href");
                let img = $(el).find("img").attr("src");

                if (title && pageUrl) {
                    if (img && img.startsWith('//')) img = 'https:' + img;
                    
                    metas.push({
                        id: `bv_${Buffer.from(pageUrl).toString('base64').substring(0, 15)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=Basketball+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            // Fallback: If scraper finds nothing, show a manual entry to verify it works
            if (metas.length === 0) {
                metas.push({
                    id: "bv_fallback",
                    name: "Check Website for Latest Games",
                    poster: "https://placehold.co/600x400?text=No+Games+Found",
                    posterShape: "landscape",
                    type: "movie"
                });
            }

            return res.status(200).json({ metas });
        }

        if (path.includes("/meta/")) {
            return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game Details", posterShape: "landscape" } });
        }

        if (path.includes("/stream/")) {
            return res.status(200).json({ streams: [] });
        }

        return res.status(200).json(manifest);

    } catch (error) {
        return res.status(200).json({ metas: [{ id: "bv_err", name: "Error Loading Games", type: "movie", posterShape: "landscape" }] });
    }
};
