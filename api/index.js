const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.6",
    name: "Basketball Replays",
    description: "Full Game Replays (Landscape)",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "bv_latest", name: "Latest Replays" }],
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
            // Attempting to scrape the NBA category directly
            const { data } = await axios.get("https://basketball-video.com/nba", {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.google.com/',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(data);
            const metas = [];

            // Targeted scraper for game links
            $("article").each((i, el) => {
                const linkObj = $(el).find("a").first();
                const title = $(el).find(".entry-title").text().trim() || linkObj.text().trim();
                const url = linkObj.attr("href");
                let img = $(el).find("img").attr("src");

                if (url && title && title.length > 5) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 16)}`,
                        name: title,
                        poster: img ? (img.startsWith('//') ? 'https:' + img : img) : "https://placehold.co/600x400?text=NBA+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            return res.status(200).json({ metas: metas.slice(0, 25) });

        } catch (error) {
            // Fallback: If scraper is blocked, provide one manual link that always works
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_manual", 
                    name: "Site Blocked - Click to open NBA Page", 
                    poster: "https://placehold.co/600x400?text=Direct+Web+Link", 
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    // Default responses for Meta and Stream
    if (path.includes("/meta/")) {
        return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game Details", posterShape: "landscape" } });
    }
    if (path.includes("/stream/")) {
        // This makes the "Blocked" card clickable to the actual site
        return res.status(200).json({ 
            streams: [{ 
                title: "Open NBA Replays Website", 
                externalUrl: "https://basketball-video.com/nba" 
            }] 
        });
    }

    return res.status(200).json(manifest);
};
