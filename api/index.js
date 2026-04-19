const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.8.0",
    name: "NBA FullReplays",
    description: "NBA Games (Stealth Fingerprint)",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "NBA FullReplays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();
    if (path === "/" || path.includes("manifest.json")) return res.status(200).json(manifest);

    if (path.includes("/catalog/")) {
        try {
            // We use a high-authority mirror that Cloudflare doesn't guard as heavily
            const targetUrl = "https://fullmatchtv.com/nba/";
            
            // Mimicking the exact header order from Mad Titan's JetExtractors
            const response = await axios.get(targetUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Sec-CH-UA': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                    'Sec-CH-UA-Mobile': '?0',
                    'Sec-CH-UA-Platform': '"Windows"',
                    'Referer': 'https://google.com/',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 8000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

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
            throw new Error("Empty Result");

        } catch (error) {
            // FALLBACK: Instead of "Empty Content", show a direct link
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_fallback", 
                    name: "⚠️ Server Blocked - Click to Open Web Link", 
                    poster: "https://placehold.co/600x400?text=Open+FullMatchTV+Direct",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Open Web Player", externalUrl: "https://fullmatchtv.com/nba/" }] });

    return res.status(200).json(manifest);
};
