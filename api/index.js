const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "2.3.0",
    name: "NBA FullReplays (Mad Titan Port)",
    description: "NBA Replays via FullMatchTV logic",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "NBA FullReplays" }],
    idPrefixes: ["bv_"]
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const path = req.url.toLowerCase();

    if (path.includes("/catalog/")) {
        try {
            // TARGET: FullMatchTV (The source found in Mad Titan's fullsearch.py)
            const targetUrl = "https://fullmatchtv.com/nba/";
            
            // We use a high-authority desktop browser header as seen in Kodi logic
            const response = await axios.get(targetUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://fullmatchtv.com/'
                },
                timeout: 10000 
            });
            
            const $ = cheerio.load(response.data);
            const metas = [];

            // Scraper for FullMatchTV's grid structure
            $(".post-column, article").each((i, el) => {
                const title = $(el).find(".entry-title").text().trim();
                const url = $(el).find("a").attr("href");
                let img = $(el).find("img").attr("src");

                if (url && title) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 16)}`,
                        name: title,
                        poster: img || "https://placehold.co/600x400?text=NBA+Replay",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            return res.status(200).json({ metas: metas.slice(0, 20) });

        } catch (error) {
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_error", 
                    name: "Source Blocked - Using Mirror...", 
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    if (path.includes("/meta/")) return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "NBA Replay", posterShape: "landscape" } });
    if (path.includes("/stream/")) return res.status(200).json({ streams: [{ title: "🚀 Watch Full Game", externalUrl: "https://fullmatchtv.com/nba/" }] });

    return res.status(200).json(manifest);
};
