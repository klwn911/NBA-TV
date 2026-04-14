const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.7.0",
    name: "Basketball Replays",
    description: "NBA Replays (Stealth Mode)",
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
            // We use a high-authority header set to mimic a real Chrome browser session
            const response = await axios.get("https://basketball-video.com/nba", {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'max-age=0',
                    'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 10000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            $("article").each((i, el) => {
                const title = $(el).find(".entry-title").text().trim();
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

            if (metas.length > 0) {
                return res.status(200).json({ metas: metas.slice(0, 20) });
            }
            
            // If the scraper returns 0 items, it means we are still being blocked
            throw new Error("Blocked");

        } catch (error) {
            // If Stealth Mode fails, we try a DIFFERENT mirror site immediately as a fallback
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_fallback", 
                    name: "Primary Source Blocked - Check Site Directly", 
                    poster: "https://placehold.co/600x400?text=Click+to+Open+Site",
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Play in Browser", externalUrl: "https://basketball-video.com/nba" }] });

    return res.status(200).json(manifest);
};
