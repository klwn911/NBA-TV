const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.5.0",
    name: "NBA FullReplays",
    description: "NBA Games (Mad Titan Logic)",
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
            // TARGET: FullMatchTV (Identified as high-priority in fullsearch.py)
            const targetUrl = "https://fullmatchtv.com/nba/";
            
            const response = await axios.get(targetUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://fullmatchtv.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 9000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            $("article.post-column, article").each((i, el) => {
                const title = $(el).find(".entry-title, h2, h3").text().trim();
                const url = $(el).find("a").attr("href");
                const img = $(el).find("img").attr("src");

                if (url && title && title.toLowerCase().includes("vs")) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 14)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=NBA+Replay",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            // If scraping worked, return the list. 
            if (metas.length > 0) return res.status(200).json({ metas });

            // If scraping failed (Empty Content), return a clear Error Card
            throw new Error("Blocked");

        } catch (error) {
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_blocked", 
                    name: "Cloudflare Blocked Vercel - Click to Open Website", 
                    poster: "https://placehold.co/600x400?text=Try+Again+in+1+Min",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Watch on FullMatchTV", externalUrl: "https://fullmatchtv.com/nba/" }] });

    return res.status(200).json(manifest);
};
