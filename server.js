

import express from 'express';
import { Liquid } from 'liquidjs';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();
const API_BASE = 'https://fdnd-agency.directus.app/items';
const USER_ID =4;

// Endpoint for fetching plants specific to our user
const getUserPlants = `frankendael_users_plants?filter[frankendael_users_id]=${USER_ID}&fields=frankendael_plants_id`;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

// --- Helpers ---

const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE}/${endpoint}`);
    const result = await response.json();
    return result.data;
};

const directusAssetUrl = (asset) => {
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
        in_bloom: directusAssetUrl(plant.in_bloom),
        not_in_bloom: directusAssetUrl(plant.not_in_bloom),
        title: plant.quest_title || 'Opdracht',
        description: plant.quest_text, 
        type: mappedType,
        correct_answer: (plant.quest_options || []).find(option => option.correct)?.value,
        options: (plant.quest_options || []).map(option => ({
            text: option.label || option.value,
            value: option.value,
            image_url: directusAssetUrl(option.image)
        })),
        xp: 25
    };
};

// Returns a Set of plant IDs collected by the user using the specific getUserPlants URL
const getCollectedIds = async (queryUrl) => {
    const data = await fetchData(queryUrl);
    return new Set(data.map(item => {
        const plantReference = item.frankendael_plants_id;
        return typeof plantReference === 'object' ? plantReference.id : plantReference;
    }));
};

const getCollectedPlants = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&fields=*,frankendael_plants_id.*.*`);
    return data.map(item => item.frankendael_plants_id).filter(Boolean);
};

const userAlreadyCollectedPlant = async ({ userId, plantId }) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&filter[frankendael_plants_id][_eq]=${plantId}`);
    return data && data.length > 0;
};

const getPlantIdsFromZone = (zone) => {
    if (!zone.plants?.length) return [];
    return zone.plants.map(plantLink => {
        return typeof plantLink === 'object' ? plantLink.frankendael_plants_id : plantLink;
    }).filter(Boolean);
};

// --- Routes ---

app.get('/', async (request, response) => {
    let userProfile = null; 
    const userUrl = `https://fdnd-agency.directus.app/items/frankendael_users/${USER_ID}`;

    try {
        const [allZones, allNews, collectedPlants] = await Promise.all([
            fetchData('frankendael_zones'),
            fetchData('frankendael_news'),
            getCollectedPlants(USER_ID)
        ]);

        const userResponse = await fetch(userUrl);
        const userResult = await userResponse.json();
        userProfile = userResult.data;

        const plantsWithZones = collectedPlants.map(plant => {
            const firstZoneEntry = plant.zones?.[0];
            const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry;
            return { 
                ...normalizePlant(plant), 
                main_zone: allZones.find(zone => zone.id === zoneId) ?? null
            };
        });

        const normalizedNews = allNews.map(newsItem => ({ 
            ...newsItem, 
            image: directusAssetUrl(newsItem.image) 
        }));

        response.render('index.liquid', { 
            zones: allZones, 
            plants: plantsWithZones, 
            news: normalizedNews, 
            zone_type: 'home',
            current_path: request.path,
            user: userProfile
        });

    } catch (error) {
        console.error("Error fetching home data:", error);
        response.status(500).send("Internal Server Error");
    }
});

app.get('/login', (request, response) => {
    response.render('login.liquid');
});

app.get('/veldverkenner', async (request, response) => {
    try {
        const [allZones, allPlants, collectedIds] = await Promise.all([
            fetchData('frankendael_zones?fields=*.*'),
            fetchData('frankendael_plants?fields=*.*'),
            getCollectedIds(getUserPlants)
        ]);

        const statusMap = {}; 

        const zonesWithQuestData = allZones.map(zone => {
            const plantIdsInZone = getPlantIdsFromZone(zone);
            const isZoneComplete = plantIdsInZone.length > 0 && plantIdsInZone.every(plantId => collectedIds.has(plantId));

            statusMap[zone.slug] = isZoneComplete;

            const plantInZone = allPlants.find(plant => 
                plantIdsInZone.includes(plant.id) && plant.quest_title
            );
            
            const normalized = normalizePlant(plantInZone);
            
            return {
                ...zone,
                quest: normalized ? { ...normalized, plant: normalized } : null,
                zoneCompleted: isZoneComplete 
            };
        });

        const completedZonesCount = zonesWithQuestData.filter(zone => zone.zoneCompleted).length;
        const totalZonesCount = zonesWithQuestData.filter(zone => zone).length;
        
        response.render('veldverkenner.liquid', { 
            zones: zonesWithQuestData, 
            completedCount: completedZonesCount, 
            status: statusMap, 
            progress: collectedIds.size, 
            zone_type: 'veldverkenner',
            current_path: request.path,
            totalZonesCount: totalZonesCount,
        });
    } catch (error) {
        console.error("Veldverkenner route error:", error);
        response.status(500).send("Error loading the map.");
    }
});

app.get('/veldverkenner/:zone_slug', async (request, response) => {
    try {
        const [zoneData, collectedPlants, allZones] = await Promise.all([
            fetchData(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}&fields=*.*`),
            getCollectedPlants(USER_ID),
            fetchData('frankendael_zones')
        ]);

        const currentZone = zoneData[0];
        const plantIds = getPlantIdsFromZone(currentZone);

        const plantsInZone = plantIds.length 
            ? await fetchData(`frankendael_plants?filter[id][_in]=${plantIds.join(',')}&fields=*.*`) 
            : [];

        const collectedIds = new Set(collectedPlants.map(plant => plant.id));

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

        response.render('zone.liquid', { 
            zone: currentZone, 
            plants: normalizedPlants, 
            zone_slug: request.params.zone_slug, 
            zone_type: currentZone.type,
            current_path: request.path
        });
    } catch (error) {
        console.error("Error loading zone detail:", error);
        response.status(500).send("Internal Server Error");
    }
});

app.get('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    try {
        const [zoneData, plantData] = await Promise.all([
            fetchData(`frankendael_zones?filter[slug][_eq]=${request.params.zone_slug}`),
            fetchData(`frankendael_plants?filter[slug][_eq]=${request.params.item_slug}&fields=*.*`)
        ]);

        const currentPlant = normalizePlant(plantData[0]);

        response.render('opdracht.liquid', {
            quest: currentPlant, 
            plant: currentPlant, 
            zone: zoneData[0], 
            zone_slug: request.params.zone_slug, 
            state: request.query.step || 'intro', 
            user_id: USER_ID,
            zone_type: zoneData[0].type,
            current_path: request.path
        });
    } catch (error) {
        console.error("Error loading quest detail:", error);
        response.status(500).send("Internal Server Error");
    }
});

app.get('/nieuws', async (request, response) => {
    const newsData = await fetchData('frankendael_news');
    const normalizedNews = newsData.map(newsItem => ({ 
        ...newsItem, 
        image: directusAssetUrl(newsItem.image) 
    }));
    response.render('nieuws.liquid', { 
        news: normalizedNews, 
        zone_type: 'news',
        current_path: request.path
    });
});

app.get('/nieuws/:slug', async (request, response) => {
    const data = await fetchData(`frankendael_news?filter[slug][_eq]=${request.params.slug}`);
    const article = { ...data[0], image: directusAssetUrl(data[0].image) };
    response.render('news-detail.liquid', { 
        newsItem: article, 
        zone_type: 'news',
        current_path: request.path
    });
});

app.get('/collectie', async (request, response) => {
    const [collectedPlants, allZones] = await Promise.all([
        getCollectedPlants(USER_ID),
        fetchData('frankendael_zones')
    ]);

    const plantsWithZoneDetails = collectedPlants.map(plant => {
        const firstZoneEntry = plant.zones?.[0];
        const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry;
        return {
            ...normalizePlant(plant),
            main_zone: allZones.find(zone => zone.id === zoneId) ?? null
        };
    });

    response.render('collectie.liquid', { 
        plants: plantsWithZoneDetails, 
        zone_type: 'collectie',
        current_path: request.path
    });
});

app.get('/collectie/in_bloom', async (request, response) => {
    const [collectedPlants, allZones] = await Promise.all([
        getCollectedPlants(USER_ID),
        fetchData('frankendael_zones')
    ]);

    const filteredPlants = collectedPlants
        .filter(plant => plant.zones && plant.zones.length > 0)
        .map(plant => {
            const firstZoneEntry = plant.zones[0];
            const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry;
            return {
                ...normalizePlant(plant),
                main_zone: allZones.find(zone => zone.id === zoneId) ?? null
            };
        });

    response.render('collectie.liquid', { plants: filteredPlants, title: 'In Bloei', zone_type: 'collectie', current_path: request.path });
});

app.get('/collectie/not_in_bloom', async (request, response) => {
    const collectedPlants = await getCollectedPlants(USER_ID);
    const filteredPlants = collectedPlants
        .filter(plant => !plant.zones || plant.zones.length === 0)
        .map(plant => normalizePlant(plant));

    response.render('collectie.liquid', { plants: filteredPlants, title: 'Niet in Bloei', zone_type: 'collectie', current_path: request.path });
});

app.get('/collectie/:plant_slug', async (request, response) => {
    const plantData = await fetchData(`frankendael_plants?filter[slug][_eq]=${request.params.plant_slug}&fields=*.*`);
    if (!plantData.length) return response.status(404).send('Plant niet gevonden');

    const currentPlant = normalizePlant(plantData[0]);
    response.render('plant-detail.liquid', { plant: currentPlant, zone_type: 'collectie', current_path: request.path });
});

app.get('/account', async (request, response) => {
    const userUrl = `https://fdnd-agency.directus.app/items/frankendael_users/${USER_ID}`;
    try {
        const userResponse = await fetch(userUrl);
        const userResult = await userResponse.json();
        const userData = userResult.data;

        response.render('account.liquid', { 
            user: userData,
            current_path: request.path
        });
    } catch (error) {
        console.error("Error loading account:", error);
        response.status(500).send("Error loading account data");
    }
});

app.get('/welcome', (request, response) => response.render('welcome.liquid', {
    current_path: request.path
}));

app.post('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const { plant_id, user_id } = request.body;
    const { zone_slug } = request.params; 

    try {
        const currentUserId = Number.isFinite(parseInt(user_id, 10)) ? parseInt(user_id, 10) : USER_ID;
        const currentPlantId = parseInt(plant_id, 10);

        if (!Number.isFinite(currentPlantId)) {
            return response.status(400).send('Ongeldige plant_id');
        }

        if (await userAlreadyCollectedPlant({ userId: currentUserId, plantId: currentPlantId })) {
            return response.redirect(`/veldverkenner/${zone_slug}`);
        }

        const directusResponse = await fetch(`${API_BASE}/frankendael_users_plants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                frankendael_users_id: currentUserId,
                frankendael_plants_id: currentPlantId
            })
        });

        if (directusResponse.ok) {
            response.redirect(`/veldverkenner/${zone_slug}`);
        } else {
            const errorText = await directusResponse.text();
            console.error('Directus error:', errorText);
            throw new Error('Failed to post collection');
        }
    } catch (error) {
        console.error('Save progress error:', error);
        response.status(500).send('Fout bij opslaan van je voortgang.');
    }
});

app.use('/gsap', express.static(path.join(__dirname, 'node_modules/gsap/dist/')));

app.listen(8000, () => console.log('Server started on http://localhost:8000'));