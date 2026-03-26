import express from 'express'
import { Liquid } from 'liquidjs'
import { fileURLToPath } from 'url';
import path from 'path';

const app = express()
const API_BASE = 'https://fdnd-agency.directus.app/items'
const USER_ID = 2

app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')
app.set('view engine', 'liquid')

// --- Helpers ---

const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE}/${endpoint}`)
    const json = await response.json()
    return json.data
}

const directusAssetUrl = (asset) => {
    const id = (asset && typeof asset === 'object') ? asset.id : asset
    return id 
        ? `https://fdnd-agency.directus.app/assets/${id}` 
        : '/assets/images/placeholder.webp'
}

const normalizePlant = (plant) => {
    if (!plant) return null
    const mappedType = plant.quest_type === 'labels' ? 'button' : 'image'
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
    }
}

// Returns a Set of plant IDs collected by the user
const getCollectedIds = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}`)
    return new Set(data.map(item => {
        return typeof item.frankendael_plants_id === 'object' ? item.frankendael_plants_id.id : item.frankendael_plants_id
    }))
}

// Returns full plant objects collected by the user (with nested fields)
const getCollectedPlants = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&fields=*,frankendael_plants_id.*.*`)
    return data.map(item => item.frankendael_plants_id).filter(Boolean)
}

const userAlreadyCollectedPlant = async ({ userId, plantId }) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&filter[frankendael_plants_id][_eq]=${plantId}`)
    return data && data.length > 0
}

// Extracts plant IDs from a zone's plants junction array
const getPlantIdsFromZone = (zone) => {
    if (!zone.plants?.length) return []
    return zone.plants.map(p => {
        return typeof p === 'object' ? p.frankendael_plants_id : p
    }).filter(Boolean)
}

// --- Routes ---

app.get('/', async (req, res) => {
    const [allZones, allNews, collectedPlants] = await Promise.all([
        fetchData('frankendael_zones'),
        fetchData('frankendael_news'),
        getCollectedPlants(USER_ID)
    ])

    const plantsWithZones = collectedPlants.map(plant => {
        const firstZoneEntry = plant.zones?.[0]
        const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry
        return { 
            ...normalizePlant(plant), 
            main_zone: allZones.find(zone => zone.id === zoneId) ?? null
        }
    })

    const normalizedNews = allNews.map(newsItem => ({ 
        ...newsItem, 
        image: directusAssetUrl(newsItem.image) 
    }))

    res.render('index.liquid', { 
        zones: allZones, 
        plants: plantsWithZones, 
        news: normalizedNews, 
        zone_type: 'home',
        current_path: req.path
    })
})

// Veldverkenner (Map)
app.get('/veldverkenner', async (req, res) => {
    const [allZones, allPlants, collectedIds] = await Promise.all([
        fetchData('frankendael_zones?fields=*.*'),
        fetchData('frankendael_plants?fields=*.*'),
        getCollectedIds(USER_ID)
    ])

    const zonesWithQuestData = allZones.map(zone => {
        const plantIdsInZone = getPlantIdsFromZone(zone)
        const plantInZone = allPlants.find(plant => 
            plantIdsInZone.includes(plant.id) && plant.quest_title
        )
        const normalized = normalizePlant(plantInZone)
        zone.quest = normalized ? { ...normalized, plant: normalized } : null
        return zone
    })

    res.render('veldverkenner.liquid', { 
        zones: zonesWithQuestData, 
        progress: collectedIds.size, 
        zone_type: 'veldverkenner',
        current_path: req.path
    })
})

// Zone Detail — show ALL plants in the zone
app.get('/veldverkenner/:zone_slug', async (req, res) => {
    const [zoneData, collectedIds] = await Promise.all([
        fetchData(`frankendael_zones?filter[slug][_eq]=${req.params.zone_slug}&fields=*.*`),
        getCollectedIds(USER_ID)
    ])

    const currentZone = zoneData[0]
    const plantIds = getPlantIdsFromZone(currentZone)

    const plantsInZone = plantIds.length 
        ? await fetchData(`frankendael_plants?filter[id][_in]=${plantIds.join(',')}&fields=*.*`) 
        : []

    const normalizedPlants = plantsInZone.map(plant => {
        const normalized = normalizePlant(plant)
        return { 
            ...normalized, 
            collected: collectedIds.has(plant.id), 
            quest: plant.quest_title ? normalized : null 
        }
    })

    res.render('zone.liquid', { 
        zone: currentZone, 
        plants: normalizedPlants, 
        zone_slug: req.params.zone_slug, 
        zone_type: currentZone.type,
        current_path: req.path
    })
})

// Quest Detail — always renders opdracht
app.get('/veldverkenner/:zone_slug/:item_slug', async (req, res) => {
    const zoneData = await fetchData(`frankendael_zones?filter[slug][_eq]=${req.params.zone_slug}`)
    const plantData = await fetchData(`frankendael_plants?filter[slug][_eq]=${req.params.item_slug}&fields=*.*`)
    const currentPlant = normalizePlant(plantData[0])

    res.render('opdracht.liquid', {
        quest: currentPlant, 
        plant: currentPlant, 
        zone: zoneData[0], 
        zone_slug: req.params.zone_slug, 
        state: req.query.step || 'intro', 
        user_id: USER_ID,
        zone_type: zoneData[0].type,
        current_path: req.path
    })
})

// News Overview
app.get('/nieuws', async (req, res) => {
    const newsData = await fetchData('frankendael_news')
    const normalizedNews = newsData.map(newsItem => ({ 
        ...newsItem, 
        image: directusAssetUrl(newsItem.image) 
    }))
    res.render('nieuws.liquid', { 
        news: normalizedNews, 
        zone_type: 'news',
        current_path: req.path
    })
})

// News Detail
app.get('/nieuws/:slug', async (req, res) => {
    const data = await fetchData(`frankendael_news?filter[slug][_eq]=${req.params.slug}`)
    const article = { ...data[0], image: directusAssetUrl(data[0].image) }
    res.render('news-detail.liquid', { 
        newsItem: article, 
        zone_type: 'news',
        current_path: req.path
    })
})

// Collection overview — only plants collected by the user
app.get('/collectie', async (req, res) => {
    const [collectedPlants, allZones] = await Promise.all([
        getCollectedPlants(USER_ID),
        fetchData('frankendael_zones')
    ])

    const plantsWithZoneDetails = collectedPlants.map(plant => {
        const firstZoneEntry = plant.zones?.[0]
        const zoneId = typeof firstZoneEntry === 'object' ? firstZoneEntry.frankendael_zones_id : firstZoneEntry
        return {
            ...normalizePlant(plant),
            main_zone: allZones.find(zone => zone.id === zoneId) ?? null
        }
    })

    res.render('collectie.liquid', { 
        plants: plantsWithZoneDetails, 
        zone_type: 'collectie',
        current_path: req.path
    })
})

// Plant Detail from collection — always renders plant-detail
app.get('/collectie/:plant_slug', async (req, res) => {
    const plantData = await fetchData(`frankendael_plants?filter[slug][_eq]=${req.params.plant_slug}&fields=*.*`)
    const currentPlant = normalizePlant(plantData[0])

    res.render('plant-detail.liquid', { 
        plant: currentPlant,
        zone_type: 'collectie',
        current_path: req.path
    })
})

app.get('/account', async (req, res) => {
    const userId = 2; // Gijs
    const url = `https://fdnd-agency.directus.app/items/frankendael_users/${userId}`;

    try {
        const response = await fetch(url);
        const result = await response.json();
        const user = result.data;

        // Render your account file (account.liquid or account.ejs)
        res.render('account.liquid', { 
            user: user 
        });

    } catch (error) {
        console.error("Error loading account:", error);
        res.status(500).send("Error loading account data");
    }
});

// POST: Save quest progress to Directus
app.post('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const { plant_id, user_id } = request.body
    const { zone_slug } = request.params 

    try {
        const userId = Number.isFinite(parseInt(user_id, 10)) ? parseInt(user_id, 10) : USER_ID
        const plantId = parseInt(plant_id, 10)
        if (!Number.isFinite(plantId)) {
            return response.status(400).send('Ongeldige plant_id')
        }

        if (await userAlreadyCollectedPlant({ userId, plantId })) {
            return response.redirect(`/veldverkenner/${zone_slug}`)
        }

        const res = await fetch(`${API_BASE}/frankendael_users_plants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                frankendael_users_id: userId,
                frankendael_plants_id: plantId
            })
        })

        if (res.ok) {
            response.redirect(`/veldverkenner/${zone_slug}`)
        } else {
            const errorMsg = await res.text()
            console.error('Directus error:', errorMsg)
            throw new Error('Failed to post to Directus')
        }
    } catch (error) {
        console.error('Save error:', error)
        response.status(500).send('Fout bij opslaan van je voortgang.')
    }
})

// i use gsap for smooth animations

app.use('/gsap', express.static(path.join(__dirname, 'node_modules/gsap/dist/')));

app.listen(8000, () => console.log('Server started on http://localhost:8000'))