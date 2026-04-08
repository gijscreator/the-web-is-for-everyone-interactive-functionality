import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();
const API_BASE = 'https://fdnd-agency.directus.app/items';
const DEFAULT_USER_ID = 2; // fallback user id

// all appies use
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

function getActiveUserId(request) {
    if (request.cookies.userId) {
        return parseInt(request.cookies.userId, 10);
    }
    return DEFAULT_USER_ID;
}

async function fetchDataFromDatabase(endpoint) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Database Fetch Error:", error);
        return [];
    }
}

function getDirectusImageUrl(assetData) {
    if (!assetData) {
        return '/assets/images/placeholder.webp';
    }
    const imageId = (typeof assetData === 'object') ? assetData.id : assetData;
    return `https://fdnd-agency.directus.app/assets/${imageId}`;
}

function formatPlantDetails(plant) {
    if (!plant) return null;

    const interactionType = plant.quest_type === 'labels' ? 'button' : 'image';
    const rawOptions = plant.quest_options || [];

    return {
        ...plant,
        in_bloom: getDirectusImageUrl(plant.in_bloom),
        not_in_bloom: getDirectusImageUrl(plant.not_in_bloom),
        title: plant.quest_title || 'Opdracht',
        description: plant.quest_text, 
        type: interactionType,
        correct_answer: (rawOptions.find(option => option.correct))?.value,
        options: rawOptions.map(option => ({
            text: option.label || option.value,
            value: option.value,
            image_url: getDirectusImageUrl(option.image)
        })),
        xp: 25
    };
}

async function getPlantsCollectedByUser(userId) {
    const endpoint = `frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&fields=*,frankendael_plants_id.*.*`;
    const data = await fetchDataFromDatabase(endpoint);
    return data.map(item => item.frankendael_plants_id).filter(Boolean);
}

function getPlantIdsInZone(zone) {
    if (!zone || !zone.plants) return [];
    return zone.plants.map(reference => {
        const id = (typeof reference === 'object') ? reference.frankendael_plants_id : reference;
        return parseInt(id, 10);
    }).filter(id => !isNaN(id));
}

// routes 

app.get('/', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [allZones, allNews, collectedPlants] = await Promise.all([
            fetchDataFromDatabase('frankendael_zones'),
            fetchDataFromDatabase('frankendael_news'),
            getPlantsCollectedByUser(userId)
        ]);
        const userProfile = await fetchDataFromDatabase(`frankendael_users/${userId}`);

        const plantsWithZones = collectedPlants.map(plant => {
            const firstZone = plant.zones?.[0];
            const zoneId = (typeof firstZone === 'object') ? firstZone.frankendael_zones_id : firstZone;
            return { 
                ...formatPlantDetails(plant), 
                main_zone: allZones.find(z => z.id === parseInt(zoneId, 10)) || null
            };
        });

        response.render('index.liquid', { 
            zones: allZones, 
            plants: plantsWithZones, 
            news: allNews.map(item => ({ ...item, image: getDirectusImageUrl(item.image) })), 
            user: userProfile,
            zone_type: 'home', 
            current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/login', (request, response) => response.render('login.liquid'));

app.post('/login', async (request, response) => {
    const { username } = request.body;
    const allUsers = await fetchDataFromDatabase('frankendael_users');
    const user = allUsers.find(u => u.name?.toLowerCase() === username.toLowerCase());
    
    if (user) {
        response.cookie('userId', user.id, { maxAge: 2592000000, httpOnly: true });
        response.redirect('/');
    } else {
        response.status(401).send("Gebruiker niet gevonden");
    }
});

app.get('/logout', (request, response) => {
    response.clearCookie('userId');
    response.redirect('/login');
});

app.get('/welcome', (request, response) => response.render('welcome.liquid', { current_path: request.path }));

app.get('/veldverkenner', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [allZones, allPlants, collected] = await Promise.all([
            fetchDataFromDatabase('frankendael_zones?fields=*.*'),
            fetchDataFromDatabase('frankendael_plants?fields=*.*'),
            getPlantsCollectedByUser(userId)
        ]);

        const collectedIds = new Set(collected.map(p => parseInt(p.id, 10)));
        const statusMap = {};

        const zonesWithStatus = allZones.map(zone => {
            const plantIdsInZone = getPlantIdsInZone(zone);
            const isComplete = plantIdsInZone.length > 0 && plantIdsInZone.every(id => collectedIds.has(id));
            
            statusMap[zone.slug] = isComplete;
            const repPlant = allPlants.find(p => plantIdsInZone.includes(parseInt(p.id, 10)) && p.quest_title);
            const norm = formatPlantDetails(repPlant);

            return { 
                ...zone, 
                quest: norm ? { ...norm, plant: norm } : null, 
                zoneCompleted: isComplete 
            };
        });

        const completedZonesCount = zonesWithStatus.filter(z => z.zoneCompleted).length;

        response.render('veldverkenner.liquid', { 
            zones: zonesWithStatus, 
            status: statusMap,
            completedCount: completedZonesCount,
            progress: collectedIds.size, 
            totalZonesCount: zonesWithStatus.length, 
            zone_type: 'veldverkenner', 
            current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/veldverkenner/:zone_slug', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [zoneData, collected, allZones] = await Promise.all([
            fetchDataFromDatabase(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}&fields=*.*`),
            getPlantsCollectedByUser(userId),
            fetchDataFromDatabase('frankendael_zones')
        ]);

        const zone = zoneData[0];
        if (!zone) return response.status(404).render('404.liquid');

        const plantIds = getPlantIdsInZone(zone);
        const rawPlants = plantIds.length ? await fetchDataFromDatabase(`frankendael_plants?filter[id][_in]=${plantIds.join(',')}&fields=*.*`) : [];
        const collectedIds = new Set(collected.map(p => parseInt(p.id, 10)));

        const plants = rawPlants.map(p => {
            const firstZone = p.zones?.[0];
            const zoneId = (typeof firstZone === 'object') ? firstZone.frankendael_zones_id : firstZone;
            return {
                ...formatPlantDetails(p),
                collected: collectedIds.has(parseInt(p.id, 10)),
                main_zone: allZones.find(z => z.id === parseInt(zoneId, 10)) || null
            };
        });

        response.render('zone.liquid', { 
            zone, plants, zone_slug: request.params.zone_slug, zone_type: zone.type, current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/veldverkenner/:zone_slug/:item_slug', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [zoneData, plantData] = await Promise.all([
            fetchDataFromDatabase(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}`),
            fetchDataFromDatabase(`frankendael_plants?filter[slug][_eq]=${request.params.item_slug}&fields=*.*`)
        ]);
        const plant = formatPlantDetails(plantData[0]);
        response.render('opdracht.liquid', { 
        quest: plant, plant, zone: zoneData[0], zone_slug: request.params.zone_slug, 
            state: request.query.step || 'intro', user_id: userId, 
            zone_type: zoneData[0].type, current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/collectie', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [collected, allZones] = await Promise.all([
            getPlantsCollectedByUser(userId), 
            fetchDataFromDatabase('frankendael_zones')
        ]);
        const plants = collected.map(p => ({
            ...formatPlantDetails(p),
            main_zone: allZones.find(z => z.id === (p.zones?.[0]?.frankendael_zones_id || p.zones?.[0])) || null
        }));
        response.render('collectie.liquid', { plants, zone_type: 'collectie', current_path: request.path });
    } catch (error) { next(error); }
});

app.get('/collectie/in_bloom', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const [collected, allZones] = await Promise.all([getPlantsCollectedByUser(userId), fetchDataFromDatabase('frankendael_zones')]);
        const filtered = collected.filter(p => p.zones && p.zones.length > 0).map(p => ({
            ...formatPlantDetails(p),
            main_zone: allZones.find(z => z.id === (p.zones?.[0]?.frankendael_zones_id || p.zones?.[0])) || null
        }));
        response.render('collectie.liquid', { plants: filtered, title: 'In Bloei', zone_type: 'collectie', current_path: request.path });
    } catch (error) { next(error); }
});

app.get('/collectie/not_in_bloom', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const collected = await getPlantsCollectedByUser(userId);
        const filtered = collected.filter(p => !p.zones || p.zones.length === 0).map(p => formatPlantDetails(p));
        response.render('collectie.liquid', { plants: filtered, title: 'Niet in Bloei', zone_type: 'collectie', current_path: request.path });
    } catch (error) { next(error); }
});

app.get('/collectie/:plant_slug', async (request, response, next) => {
    try {
        const data = await fetchDataFromDatabase(`frankendael_plants?filter[slug][_eq]=${request.params.plant_slug}&fields=*.*`);
        if (!data.length) return response.status(404).render('404.liquid');
        response.render('plant-detail.liquid', { plant: formatPlantDetails(data[0]), zone_type: 'collectie', current_path: request.path });
    } catch (error) { next(error); }
});

app.get('/nieuws', async (request, response, next) => {
    try {
        const news = await fetchDataFromDatabase('frankendael_news');
        response.render('nieuws.liquid', { 
            news: news.map(n => ({ ...n, image: getDirectusImageUrl(n.image) })), 
            zone_type: 'news', current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/nieuws/:slug', async (request, response, next) => {
    try {
        const data = await fetchDataFromDatabase(`frankendael_news?filter[slug][_eq]=${request.params.slug}`);
        if (!data.length) return response.status(404).render('404.liquid');
        response.render('news-detail.liquid', { 
            newsItem: { ...data[0], image: getDirectusImageUrl(data[0].image) }, 
            zone_type: 'news', current_path: request.path 
        });
    } catch (error) { next(error); }
});

app.get('/account', async (request, response, next) => {
    const userId = getActiveUserId(request);
    try {
        const user = await fetchDataFromDatabase(`frankendael_users/${userId}`);
        response.render('account.liquid', { user, current_path: request.path });
    } catch (error) { next(error); }
});

app.post('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const userId = getActiveUserId(request);
    const { plant_id } = request.body;
    try {
        await fetch(`${API_BASE}/frankendael_users_plants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frankendael_users_id: userId, frankendael_plants_id: plant_id })
        });
        response.redirect(`/veldverkenner/${request.params.zone_slug}`);
    } catch (error) { response.status(500).send("Fout bij opslaan"); }
});

// --- SYSTEM ---
app.use('/gsap', express.static(path.join(__dirname, 'node_modules/gsap/dist/')));
app.use((request, response) => response.status(404).render('404.liquid'));

app.listen(8000, () => console.log('🚀 Server started: http://localhost:8000'));