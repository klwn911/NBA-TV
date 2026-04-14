const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.9.0",
    name: "Basketball Replays",
    description: "NBA Full Games - Multi-Source",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Games" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();

    if (path === "/" || path.includes("manifest.json")) {
        return res.status(200).json(manifest);
    }

    if (path.includes("/catalog/")) {
        try {
            // TARGET: nbareplay.net (This mirror is currently more stable for cloud requests)
            const response = await axios.get("https://nbareplay.net/nba-replays/", {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            // Targeted scraper for nbareplay.net's grid
            $(".post-item, article").each((i, el) => {
                const title = $(el).find(".entry-title, h2, h3").text().trim();
                const url = $(el).find("a").attr("href");
                let img = $(el).find("img").attr("src");

                if (url && title && title.toLowerCase().includes("vs")) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 16)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=NBA+Replay",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            if (metas.length > 0) return res.status(200).json({ metas: metas.slice(0, 20) });
            throw new Error("Source Blocked");

        } catch (error) {
            // EMERGENCY FALLBACK: Manual items for today's most popular replays
            return res.status(200).json({ 
                metas: [
                    { 
                        id: "bv_manual_1", 
                        name: "Full Game Replay - NBA Latest", 
                        poster: "https://placehold.co/600x400?text=Open+NBA-Replay.net",
                        posterShape: "landscape", 
                        type: "movie" 
                    }
                ] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    
    if (path.includes("/stream/")) {
        // If they click the fallback, it opens the direct search link in their browser
        return res.status(200).json({ 
            streams: [{ 
                title: "🚀 Open Replay Site", 
                externalUrl: "https://nbareplay.net/" 
            }] 
        });
    }

    return res.status(200).json(manifest);
};
