const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "org.basketballvideo.fixed",
    version: "1.0.5",
    name: "Basketball Replays",
    description: "Full Game Replays",
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
            // We use a high-quality browser User-Agent
            const { data } = await axios.get("https://basketball-video.com/nba", {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.google.com/'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(data);
            const metas = [];

            // We look for every link that contains "full-game-replay"
            $("a").each((i, el) => {
                const url = $(el).attr("href");
                const title = $(el).text().trim();
                const img = $(el).find("img").attr("src") || $(el).closest('article').find('img').attr('src');

                if (url && url.includes("full-game-replay") && title.length > 10) {
                    metas.push({
                        id: `bv_${Buffer.from(url).toString('base64').substring(0, 15)}`,
                        name: title,
                        poster: img ? (img.startsWith('//') ? 'https:' + img : img) : "https://placehold.co/600x400?text=NBA+Game",
                        posterShape: "landscape",
                        type: "movie"
                    });
                }
            });

            // Remove duplicates
            const uniqueMetas = Array.from(new Set(metas.map(a => a.name)))
                .map(name => metas.find(a => a.name === name));

            return res.status(200).json({ metas: uniqueMetas.slice(0, 20) });

        } catch (error) {
            // If the site blocks us, we provide a direct link button as a fallback
            return res.status(200).json({ 
                metas: [{ 
                    id: "bv_direct", 
                    name: "Click here to open Site (Blocked)", 
                    poster: "https://placehold.co/600x400?text=Site+Blocked+Access", 
                    posterShape: "landscape", 
                    type: "movie" 
                }] 
            });
        }
    }

    // Standard responses for meta and stream to keep the app from crashing
    if (path.includes("/meta/")) {
        return res.status(200).json({ meta: { id: "bv_game", type: "movie", name: "Game Details", posterShape: "landscape" } });
    }
    if (path.includes("/stream/")) {
        // Here we can try to pass the site URL back if it's the "Direct Link" fallback
        return res.status(200).json({ streams: [{ title: "Open Website", externalUrl: "https://basketball-video.com/nba" }] });
    }

    return res.status(200).json(manifest);
};
