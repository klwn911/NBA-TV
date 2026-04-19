const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.4.0",
    name: "NBA FullReplays",
    description: "NBA Games via FullMatchTV Scraper",
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

    // 1. Handle Manifest
    if (path === "/" || path.includes("manifest.json")) {
        return res.status(200).json(manifest);
    }

    // 2. Handle Catalog (The NBA List)
    if (path.includes("/catalog/")) {
        try {
            // Source identified from Mad Titan's 'SEARCH_INCLUDE' logic
            const targetUrl = "https://fullmatchtv.com/nba/";
            
            const response = await axios.get(targetUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://fullmatchtv.com/'
                },
                timeout: 8000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            // Targeted scraper for FullMatchTV posts
            $("article.post-column").each((i, el) => {
                const title = $(el).find(".entry-title").text().trim();
                const url = $(el).find("a").attr("href");
                const img = $(el).find("img").attr("src");

                if (url && title) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 12)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=NBA+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            // CRITICAL: Always return a valid object even if empty to avoid 'missing id' error
            return res.status(200).json({ metas: metas.length > 0 ? metas : [] });

        } catch (error) {
            // Fallback object to prevent Stremio crash
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_fallback", 
                    name: "Click to Open FullMatchTV (Source)", 
                    poster: "https://placehold.co/600x400?text=Source+Link",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    // 3. Handle Meta & Streams
    if (path.includes("/meta/")) {
        return res.status(200).json({ 
            meta: { 
                id: "bv_game", 
                type: "movie", 
                name: "NBA Replay", 
                posterShape: "landscape",
                background: "https://placehold.co/1280x720?text=NBA+Replay+Zone"
            } 
        });
    }
    
    if (path.includes("/stream/")) {
        return res.status(200).json({ 
            streams: [{ 
                title: "🚀 Watch on FullMatchTV", 
                externalUrl: "https://fullmatchtv.com/nba/" 
            }] 
        });
    }

    return res.status(200).json(manifest);
};
