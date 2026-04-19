const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.6.0",
    name: "NBA FullReplays",
    description: "NBA Games (Mad Titan Logic + Tunnel)",
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
            // Using a CORS proxy to bypass the Vercel IP block
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            
            const response = await axios.get(proxyUrl, { timeout: 10000 });
            const html = response.data.contents; // AllOrigins wraps the HTML in a 'contents' field
            
            if (!html) throw new Error("Empty Proxy Response");

            const $ = cheerio.load(html);
            const metas = [];

            $("article").each((i, el) => {
                const title = $(el).find(".entry-title").text().trim();
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

            if (metas.length > 0) return res.status(200).json({ metas });
            throw new Error("No Games Found");

        } catch (error) {
            // This prevents the "Empty Content" screen on your TV
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_retry", 
                    name: "⚠️ Proxy Busy - Click to Open FullMatchTV", 
                    poster: "https://placehold.co/600x400?text=Press+Back+and+Retry",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    
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
