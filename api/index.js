const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.8.0",
    name: "Basketball Replays",
    description: "NBA Replays (Stealth Bypass)",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "NBA Replays" }],
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
            // Using a high-authority desktop browser configuration
            const response = await axios.get("https://basketball-video.com/nba", {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                    'sec-ch-ua-platform': '"Linux"',
                    'Referer': 'https://www.google.com/',
                    'Origin': 'https://basketball-video.com'
                },
                timeout: 8000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            $("article, .post-column").each((i, el) => {
                const title = $(el).find(".entry-title, h2").text().trim();
                const url = $(el).find("a").attr("href");
                let img = $(el).find("img").attr("src");

                if (url && title) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 16)}`,
                        name: title,
                        poster: img ? (img.startsWith('//') ? 'https:' + img : img) : "https://placehold.co/600x400?text=NBA+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            if (metas.length > 0) return res.status(200).json({ metas: metas.slice(0, 20) });
            throw new Error("Empty Result");

        } catch (error) {
            // FALLBACK: Use a mirror site that rarely blocks cloud IPs
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_mirror", 
                    name: "Switch to Mirror (NBA-REPLAY.NET)", 
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Watch on Mirror", externalUrl: "https://nbareplay.net/" }] });

    return res.status(200).json(manifest);
};
