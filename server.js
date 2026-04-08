import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();
const API_BASE = 'https://fdnd-agency.directus.app/items';

// --- APP SETUP ---
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

// --- HELPERS ---

/**
 * Gets the ID from the cookie, or defaults to 4 if not logged in
 */
const getActiveUserId = (request) => {
    return request.cookies.userId ? parseInt(request.cookies.userId, 10) : 4;
};

const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE}/${endpoint}`);
    const result = await response.json();
    return result.data;
};

const getDirectusAssetUrl = (asset) => {
    const id = (asset && typeof asset === 'object') ? asset.id : asset;
    return id 
        ? `https://fdnd-agency.directus.app/assets/${id}` 
        : '/assets/images/placeholder.webp';
};

const normalizePlant = (plant) => {
    if (!plant) return null;
    const mappedType = plant.quest_type === 'labels' ? 'button' : 'image';
    return {
        ...plant,
        in_bloom: getDirectusAssetUrl(plant.in_bloom),
        not_in_bloom: getDirectusAssetUrl(plant.not_in_bloom),
        title: plant.quest_title || 'Opdracht',
        description: plant.quest_text, 
        type: mappedType,
        correct_answer: (plant.quest_options || []).find(option => option.correct)?.value,
        options: (plant.quest_options || []).map(option => ({
            text: option.label || option.value,
            value: option.value,
            image_url: getDirectusAssetUrl(option.image)
        })),
        xp: 25
    };
};

const getCollectedIds = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id]=${userId}&fields=frankendael_plants_id`);
    return new Set(data.map(item => {
        const plantReference = item.frankendael_plants_id;
        return typeof plantReference === 'object' ? plantReference.id : plantReference;
    }));
};

const getCollectedPlants = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&fields=*,frankendael_plants_id.*.*`);
    return data.map(item => item.frankendael_plants_id).filter(Boolean);
};

const getPlantIdsFromZone = (zone) => {
    if (!zone.plants?.length) return [];
    return zone.plants.map(link => typeof link === 'object' ? link.frankendael_plants_id : link).filter(Boolean);
};

// --- ROUTES ---

app.get('/', async (request, response) => {
    const userId = getActiveUserId(request);
    try {
        const [allZones, allNews, collectedPlants] = await Promise.all([
            fetchData('frankendael_zones'),
            fetchData('frankendael_news'),
            getCollectedPlants(userId)
        ]);

        const userProfile = await fetchData(`frankendael_users/${userId}`);

        const plantsWithZones = collectedPlants.map(plant => {
            const firstZoneEntry = plant.zones?.[0];
            const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry;
            return { 
                ...normalizePlant(plant), 
                main_zone: allZones.find(zone => zone.id === zoneId) ?? null
            };
        });

        response.render('index.liquid', { 
            zones: allZones, 
            plants: plantsWithZones, 
            news: allNews.map(item => ({ ...item, image: getDirectusAssetUrl(item.image) })), 
            user: userProfile,
            zone_type: 'home', 
            current_path: request.path 
        });
    } catch (error) { response.status(500).send("Home error"); }
});

app.get('/veldverkenner', async (request, response) => {
    const userId = getActiveUserId(request);
    try {
        const [allZones, allPlants, collectedIds] = await Promise.all([
            fetchData('frankendael_zones?fields=*.*'),
            fetchData('frankendael_plants?fields=*.*'),
            getCollectedIds(userId)
        ]);

        const statusMap = {}; 
        const zonesWithQuest = allZones.map(zone => {
            const plantIdsInZone = getPlantIdsFromZone(zone);
            const isComplete = plantIdsInZone.length > 0 && plantIdsInZone.every(id => collectedIds.has(id));
            statusMap[zone.slug] = isComplete;

            const plantInZone = allPlants.find(p => plantIdsInZone.includes(p.id) && p.quest_title);
            const normalized = normalizePlant(plantInZone);
            
            return {
                ...zone,
                quest: normalized ? { ...normalized, plant: normalized } : null,
                zoneCompleted: isComplete 
            };
        });

        response.render('veldverkenner.liquid', { 
            zones: zonesWithQuest, 
            completedCount: zonesWithQuest.filter(z => z.zoneCompleted).length,
            status: statusMap, 
            progress: collectedIds.size, 
            totalZonesCount: zonesWithQuest.length,
            zone_type: 'veldverkenner', 
            current_path: request.path 
        });
    } catch (error) { response.status(500).send("Map error"); }
});

app.get('/veldverkenner/:zone_slug', async (request, response) => {
    const userId = getActiveUserId(request);
    try {
        const [zoneData, collectedPlants, allZones] = await Promise.all([
            fetchData(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}&fields=*.*`),
            getCollectedPlants(userId),
            fetchData('frankendael_zones')
        ]);

        const currentZone = zoneData[0];
        if (!currentZone) return response.status(404).send("Zone niet gevonden");

        const plantIds = getPlantIdsFromZone(currentZone);
        const plantsInZone = plantIds.length 
            ? await fetchData(`frankendael_plants?filter[id][_in]=${plantIds.join(',')}&fields=*.*`) 
            : [];
        
        const collectedIds = new Set(collectedPlants.map(p => p.id));

        const normalizedPlants = plantsInZone.map(plant => {
            const normalized = normalizePlant(plant);
            const firstZoneEntry = plant.zones?.[0];
            const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry;
            
            return { 
                ...normalized, 
                collected: collectedIds.has(plant.id), 
                quest: plant.quest_title ? normalized : null,
                main_zone: allZones.find(zone => zone.id === zoneId) ?? null 
            };
        });

        const totalCount = normalizedPlants.length;
        const collectedCount = normalizedPlants.filter(p => p.collected).length;

        response.render('zone.liquid', { 
            zone: currentZone, 
            zone_name: currentZone.name,
            plants: normalizedPlants, 
            zone_slug: request.params.zone_slug, 
            zone_type: currentZone.type, 
            current_path: request.path,
            stats: {
                total: totalCount,
                collected: collectedCount,
                percentage: totalCount > 0 ? (collectedCount / totalCount) * 100 : 0
            }
        });
    } catch (error) { response.status(500).send("Zone error"); }
});

app.get('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const userId = getActiveUserId(request);
    try {
        const [zoneData, plantData] = await Promise.all([
            fetchData(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}`),
            fetchData(`frankendael_plants?filter[slug][_eq]=${request.params.item_slug}&fields=*.*`)
        ]);
        const plant = normalizePlant(plantData[0]);
        response.render('opdracht.liquid', { quest: plant, plant, zone: zoneData[0], zone_slug: request.params.zone_slug, state: request.query.step || 'intro', user_id: userId, zone_type: zoneData[0].type, current_path: request.path });
    } catch (error) { response.status(500).send("Quest error"); }
});

app.get('/collectie', async (request, response) => {
    const userId = getActiveUserId(request);
    const [collected, allZones] = await Promise.all([getCollectedPlants(userId), fetchData('frankendael_zones')]);
    const plants = collected.map(plant => {
        const firstZone = plant.zones?.[0];
        const zoneId = typeof firstZone === 'object' ? firstZone.frankendael_zones_id : firstZone;
        return { ...normalizePlant(plant), main_zone: allZones.find(z => z.id === zoneId) ?? null };
    });
    response.render('collectie.liquid', { plants, zone_type: 'collectie', current_path: request.path });
});

app.get('/collectie/in_bloom', async (request, response) => {
    const userId = getActiveUserId(request);
    const [collected, allZones] = await Promise.all([getCollectedPlants(userId), fetchData('frankendael_zones')]);
    const filtered = collected.filter(p => p.zones && p.zones.length > 0).map(plant => {
        const zoneId = typeof plant.zones[0] === 'object' ? plant.zones[0].frankendael_zones_id : plant.zones[0];
        return { ...normalizePlant(plant), main_zone: allZones.find(z => z.id === zoneId) ?? null };
    });
    response.render('collectie.liquid', { plants: filtered, title: 'In Bloei', zone_type: 'collectie', current_path: request.path });
});

app.get('/collectie/not_in_bloom', async (request, response) => {
    const userId = getActiveUserId(request);
    const collected = await getCollectedPlants(userId);
    const filtered = collected.filter(p => !p.zones || p.zones.length === 0).map(p => normalizePlant(p));
    response.render('collectie.liquid', { plants: filtered, title: 'Niet in Bloei', zone_type: 'collectie', current_path: request.path });
});

app.get('/collectie/:plant_slug', async (request, response) => {
    const data = await fetchData(`frankendael_plants?filter[slug][_eq]=${request.params.plant_slug}&fields=*.*`);
    if (!data.length) return response.status(404).send('Plant not found');
    response.render('plant-detail.liquid', { plant: normalizePlant(data[0]), zone_type: 'collectie', current_path: request.path });
});

app.get('/nieuws', async (request, response) => {
    const newsData = await fetchData('frankendael_news');
    response.render('nieuws.liquid', { news: newsData.map(n => ({ ...n, image: getDirectusAssetUrl(n.image) })), zone_type: 'news', current_path: request.path });
});

app.get('/nieuws/:slug', async (request, response) => {
    const data = await fetchData(`frankendael_news?filter[slug][_eq]=${request.params.slug}`);
    response.render('news-detail.liquid', { newsItem: { ...data[0], image: getDirectusAssetUrl(data[0].image) }, zone_type: 'news', current_path: request.path });
});

app.get('/account', async (request, response) => {
    const userId = getActiveUserId(request);
    try {
        const [userData, collectedPlants] = await Promise.all([
            fetchData(`frankendael_users/${userId}`),
            getCollectedPlants(userId)
        ]);
        response.render('account.liquid', { 
            user: userData, 
            total_plants: collectedPlants.length,
            current_path: request.path 
        });
    } catch (error) { response.status(500).send("Account error"); }
});

app.get('/login', (request, response) => response.render('login.liquid'));
app.get('/welcome', (request, response) => response.render('welcome.liquid', { current_path: request.path }));
app.get('/logout', (request, response) => { response.clearCookie('userId'); response.redirect('/login'); });

// POSTS
app.post('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const userId = getActiveUserId(request);
    const { plant_id } = request.body;
    const { zone_slug } = request.params; 
    try {
        await fetch(`${API_BASE}/frankendael_users_plants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frankendael_users_id: userId, frankendael_plants_id: parseInt(plant_id, 10) })
        });
        response.redirect(`/veldverkenner/${zone_slug}`);
    } catch (error) { response.status(500).send("Save error"); }
});

app.post('/login', async (request, response) => {
    const { username } = request.body;
    try {
        const allUsers = await fetchData('frankendael_users');
        const foundUser = allUsers.find(u => u.name?.toLowerCase() === username.toLowerCase());
        
        if (foundUser) {
            response.cookie('userId', foundUser.id, { maxAge: 2592000000, httpOnly: true });
            response.redirect('/');
        } else {
            response.status(401).send("Gebruiker niet gevonden");
        }
    } catch (error) { response.status(503).send("Inloggen mislukt"); }
});

app.use('/gsap', express.static(path.join(__dirname, 'node_modules/gsap/dist/')));
app.listen(8000, () => console.log('🚀 Server started: http://localhost:8000'));