const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.7.0",
    name: "NBA FullReplays",
    description: "NBA Games (Mad Titan Raw Logic)",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "NBA FullReplays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();

    if (path === "/" || path.includes("manifest.json")) return res.status(200).json(manifest);

    if (path.includes("/catalog/")) {
        try {
            const targetUrl = "https://fullmatchtv.com/nba/";
            // Using AllOrigins 'raw' endpoint for maximum bypass potential
            const tunnelUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            
            const response = await axios.get(tunnelUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 12000 
            });
            
            const html = response.data;
            if (!html || typeof html !== 'string') throw new Error("Invalid HTML");

            const $ = cheerio.load(html);
            const metas = [];

            // Targeted scraper for FullMatchTV's posts
            $("article.post-column").each((i, el) => {
                const title = $(el).find(".entry-title").text().trim();
                const url = $(el).find("a").attr("href");
                const img = $(el).find("img").attr("src");

                if (url && title) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 14)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=NBA+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            if (metas.length > 0) return res.status(200).json({ metas });
            throw new Error("No items found");

        } catch (error) {
            // This prevents "Empty Content" by showing a fallback card
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_retry", 
                    name: "⚠️ Source Busy - Click to View Website", 
                    poster: "https://placehold.co/600x400?text=Open+FullMatchTV",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    // Default responses for Meta and Stream
    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Watch on FullMatchTV", externalUrl: "https://fullmatchtv.com/nba/" }] });

    return res.status(200).json(manifest);
};
