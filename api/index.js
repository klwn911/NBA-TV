const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.5.0",
    name: "Basketball Replays",
    description: "NBA Replays (Free Proxy)",
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
            const targetUrl = "https://basketball-video.com/nba";
            
            // Using AllOrigins as a free public proxy (No API Key needed)
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            
            const response = await axios.get(proxyUrl, { timeout: 15000 });
            
            // AllOrigins returns the HTML inside a 'contents' property
            const html = response.data.contents;
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

            return res.status(200).json({ metas: metas.slice(0, 20) });

        } catch (error) {
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_free_proxy_err", 
                    name: "Free Proxy Busy - Try Refreshing", 
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    // Standard responses for Meta and Stream
    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Play in Browser", externalUrl: "https://basketball-video.com/nba" }] });

    return res.status(200).json(manifest);
};
