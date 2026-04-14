const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.6.0",
    name: "Basketball Replays",
    description: "NBA Replays (Multi-Proxy)",
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
        const targetUrl = "https://basketball-video.com/nba";
        
        // List of free proxy wrappers to try in order
        const proxyGateways = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
        ];

        for (let gateway of proxyGateways) {
            try {
                const response = await axios.get(gateway, { timeout: 8000 });
                // AllOrigins nests data in .contents, others might return it directly
                const html = response.data.contents || response.data;
                
                if (html && html.includes("entry-title")) {
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

                    if (metas.length > 0) {
                        return res.status(200).json({ metas: metas.slice(0, 20) });
                    }
                }
            } catch (e) {
                continue; // Move to the next proxy if this one fails
            }
        }

        // Final fallback if all proxies fail
        return res.status(200).json({ 
            metas: [{ 
                id: "bv_busy", 
                name: "All Free Proxies Busy - Please wait 1 min", 
                posterShape: "landscape", 
                type: "movie" 
            }] 
        });
    }

    // Standard responses
    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Play in Browser", externalUrl: "https://basketball-video.com/nba" }] });

    return res.status(200).json(manifest);
};
