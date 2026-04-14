const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.1.0",
    name: "Basketball Replays",
    description: "NBA Games (Direct Tunnel)",
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
            const target = "https://basketball-video.com/nba";
            // Using the 'AllOrigins' hex-pass through to avoid detection
            const tunnelUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
            
            const response = await axios.get(tunnelUrl, { timeout: 12000 });
            const html = response.data.contents;
            
            if (!html) throw new Error("Tunnel Empty");

            const $ = cheerio.load(html);
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

            if (metas.length > 0) return res.status(200).json({ metas: metas.slice(0, 20) });
            
        } catch (error) {
            // If the tunnel is blocked, we show a direct link card
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_direct", 
                    name: "Tunnel Busy - Click to Open Website", 
                    poster: "https://placehold.co/600x400?text=Tap+to+Browse+Replays",
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
                title: "🚀 Open Web Player", 
                externalUrl: "https://basketball-video.com/nba" 
            }] 
        });
    }

    return res.status(200).json(manifest);
};
