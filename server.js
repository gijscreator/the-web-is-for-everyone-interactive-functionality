import express from 'express'
import { Liquid } from 'liquidjs'

const app = express()
const API_BASE = 'https://fdnd-agency.directus.app/items'
// my id (gijs)
const USER_ID = 2

// server config
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// liquid setup
const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')
app.set('view engine', 'liquid')

// --- Middleware ---
app.use((request, response, next) => {
    response.locals.current_path = request.path || '/'
    response.locals.previous_path = request.get('Referrer') || '/'
    next()
})

// Quest data dummy
const quests_data = {
    'items': [
        {
            'id': 1,
            'title': 'Opdracht 1',
            'name': 'Zoeken',
            'slug': 'opdracht-1',
            'plant_id': 1,
            'zones': [1, 2],
            'xp': 25,
            'type': 'button',
            'correct_answer': 'hart',
            'description': 'Welke van deze opties past bij deze opdracht?',
            'options': [
                { 'text': 'Hart', 'value': 'hart' },
                { 'text': 'Tand', 'value': 'tand' },
                { 'text': 'Oren', 'value': 'oren' }
            ]
        },
        {
            'id': 2,
            'title': 'Opdracht 2',
            'name': 'Herkennen',
            'slug': 'opdracht-2',
            'plant_id': 2,
            'zones': [1, 2, 3, 4, 5],
            'xp': 30,
            'type': 'image',
            'correct_answer': 'zwaard',
            'description': 'Kies de juiste afbeelding.',
            'options': [
                { 'value': 'zwaard', 'image_url': '/assets/images/placeholder.webp', 'text': 'Zwaard' },
                { 'value': 'hart', 'image_url': '/assets/images/placeholder.webp', 'text': 'Hart' },
                { 'value': 'tand', 'image_url': '/assets/images/placeholder.webp', 'text': 'Tand' }
            ]
        },
        {
            'id': 3,
            'title': 'Opdracht 3',
            'name': 'Ruiken',
            'slug': 'opdracht-3',
            'plant_id': 3,
            'zones': [1, 2, 3, 5, 6, 7, 8, 9, 10],
            'xp': 20,
            'type': 'button',
            'correct_answer': 'rot',
            'description': 'Welke optie is correct?',
            'options': [
                { 'text': 'Rot', 'value': 'rot' },
                { 'text': 'Zoet', 'value': 'zoet' },
                { 'text': 'Zacht', 'value': 'zacht' }
            ]
        },
        {
            'id': 4,
            'title': 'Opdracht 4',
            'name': 'Tellen',
            'slug': 'opdracht-4',
            'plant_id': 4,
            'zones': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'xp': 25,
            'type': 'button',
            'correct_answer': '5',
            'description': 'Wat is het juiste antwoord?',
            'options': [
                { 'text': '3', 'value': '3' },
                { 'text': '5', 'value': '5' },
                { 'text': '7', 'value': '7' }
            ]
        },
        {
            'id': 5,
            'title': 'Opdracht 5',
            'name': 'Voelen',
            'slug': 'opdracht-5',
            'plant_id': 5,
            'zones': [2],
            'xp': 35,
            'type': 'image',
            'correct_answer': 'kurk',
            'description': 'Kies de juiste afbeelding.',
            'options': [
                { 'value': 'kurk', 'image_url': '/assets/images/placeholder.webp', 'text': 'Kurk' },
                { 'value': 'zacht', 'image_url': '/assets/images/placeholder.webp', 'text': 'Zacht' },
                { 'value': 'rot', 'image_url': '/assets/images/placeholder.webp', 'text': 'Rot' }
            ]
        },
        {
            'id': 6,
            'title': 'Opdracht 6',
            'name': 'Kijken',
            'slug': 'opdracht-6',
            'plant_id': 6,
            'zones': [1, 3],
            'xp': 20,
            'type': 'button',
            'correct_answer': 'vierkant',
            'description': 'Welke vorm zie je?',
            'options': [
                { 'text': 'Vierkant', 'value': 'vierkant' },
                { 'text': 'Rond', 'value': 'rond' },
                { 'text': 'Driehoek', 'value': 'driehoek' }
            ]
        },
        {
            'id': 7,
            'title': 'Opdracht 7',
            'name': 'Smaak',
            'slug': 'opdracht-7',
            'plant_id': 7,
            'zones': [2],
            'xp': 40,
            'type': 'button',
            'correct_answer': 'oren',
            'description': 'Welke optie past het best?',
            'options': [
                { 'text': 'Oren', 'value': 'oren' },
                { 'text': 'Hart', 'value': 'hart' },
                { 'text': 'Roze', 'value': 'roze' }
            ]
        },
        {
            'id': 8,
            'title': 'Opdracht 8',
            'name': 'Zoeken',
            'slug': 'opdracht-8',
            'plant_id': 8,
            'zones': [1, 2, 3],
            'xp': 15,
            'type': 'image',
            'correct_answer': 'roze',
            'description': 'Kies de juiste afbeelding.',
            'options': [
                { 'value': 'roze', 'image_url': '/assets/images/placeholder.webp', 'text': 'Roze' },
                { 'value': 'tand', 'image_url': '/assets/images/placeholder.webp', 'text': 'Tand' },
                { 'value': 'zwaard', 'image_url': '/assets/images/placeholder.webp', 'text': 'Zwaard' }
            ]
        },
        {
            'id': 9,
            'title': 'Opdracht 9',
            'name': 'Onderzoek',
            'slug': 'opdracht-9',
            'plant_id': 9,
            'zones': [3],
            'xp': 30,
            'type': 'button',
            'correct_answer': 'zacht',
            'description': 'Welke eigenschap klopt?',
            'options': [
                { 'text': 'Zacht', 'value': 'zacht' },
                { 'text': 'Hard', 'value': 'hard' },
                { 'text': 'Stekelig', 'value': 'stekelig' }
            ]
        },
        {
            'id': 10,
            'title': 'Opdracht 10',
            'name': 'Determinatie',
            'slug': 'opdracht-10',
            'plant_id': 10,
            'zones': [1],
            'xp': 50,
            'type': 'image',
            'correct_answer': 'tand',
            'description': 'Kies de juiste afbeelding.',
            'options': [
                { 'value': 'tand', 'image_url': '/assets/images/placeholder.webp', 'text': 'Tand' },
                { 'value': 'hart', 'image_url': '/assets/images/placeholder.webp', 'text': 'Hart' },
                { 'value': 'kurk', 'image_url': '/assets/images/placeholder.webp', 'text': 'Kurk' }
            ]
        }
    ]
}

// Helper functions

// api fetch helper
const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE}/${endpoint}`)
    const json = await response.json()
    return json.data
}

// file assets helper
const directusAssetUrl = (fileId) => {
    if (!fileId || typeof fileId !== 'string') return null
    return `https://fdnd-agency.directus.app/assets/${fileId}`
}

// repaces images ids with good urls
const normalizePlant = (plant) => {
    if (!plant || typeof plant !== 'object') return plant
    const inBloomUrl = directusAssetUrl(plant.in_bloom)
    const notInBloomUrl = directusAssetUrl(plant.not_in_bloom)
    return {
        ...plant,
        in_bloom: inBloomUrl || plant.in_bloom,
        not_in_bloom: notInBloomUrl || plant.not_in_bloom
    }
}

const normalizePlants = (plants) => (Array.isArray(plants) ? plants.map(normalizePlant) : plants)

// all plants a user collected
const getCollectedPlantIdsForUser = async (userId) => {
    const rows = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&fields=frankendael_plants_id`)
    if (!Array.isArray(rows)) return new Set()
    return new Set(
        rows
            .map(row => {
                const v = row?.frankendael_plants_id
                if (typeof v === 'number') return v
                if (typeof v === 'string') return parseInt(v, 10)
                if (v && typeof v === 'object' && 'id' in v) return parseInt(v.id, 10)
                return null
            })
            .filter(v => Number.isFinite(v))
    )
}

// when the plant already has been collected
const userAlreadyCollectedPlant = async ({ userId, plantId }) => {
    const existing = await fetchData(
        `frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}&filter[frankendael_plants_id][_eq]=${plantId}&limit=1&fields=id`
    )
    return Array.isArray(existing) && existing.length > 0
}

// Routes

// Welcome/Home
app.get('/welcome', (req, res) => res.render('welcome.liquid'))

app.get('/', async (req, res) => {
    const [zones, plants, news] = await Promise.all([
        fetchData('frankendael_zones'),
        fetchData('frankendael_plants'),
        fetchData('frankendael_news')
    ])
    const normalizedPlants = normalizePlants(plants)

    const plants_with_zones = normalizedPlants.map(plant => {
        const matched_zone = zones.find(zone => zone.id === plant.zones[0])
        return { ...plant, main_zone: matched_zone }
    })

    res.render('index.liquid', { zones, plants: plants_with_zones, news, zone_type: 'home' })
})

// Veldverkenner (Map)
app.get('/veldverkenner', async (request, response) => {
    const [allZones, allPlants, collectedPlantIds] = await Promise.all([
        fetchData('frankendael_zones'),
        fetchData('frankendael_plants'),
        getCollectedPlantIdsForUser(USER_ID)
    ])
    const normalizedPlants = normalizePlants(allPlants)

    const zonesWithQuestsAndPlants = allZones.map(currentZone => {
        const foundQuest = quests_data.items.find(quest => quest.zones.includes(currentZone.id))
        if (foundQuest) {
            foundQuest.plant = normalizedPlants.find(plant => plant.id === foundQuest.plant_id)
        }
        currentZone.quest = foundQuest || null
        return currentZone
    })

    response.render('veldverkenner.liquid', { zones: zonesWithQuestsAndPlants, progress: collectedPlantIds.size })
})

// Zone Detail
app.get('/veldverkenner/:zone_slug', async (request, response, next) => {
    const { zone_slug } = request.params
    try {
        const [zoneData, collectedPlantIds] = await Promise.all([
            fetchData(`frankendael_zones?filter[slug][_eq]=${zone_slug}`),
            getCollectedPlantIdsForUser(USER_ID)
        ])
        const currentZone = zoneData[0]
        if (!currentZone) return next()

        let plantsInThisZone = []
        if (currentZone.plants?.length > 0) {
            plantsInThisZone = normalizePlants(
                await fetchData(`frankendael_plants?filter[id][_in]=${currentZone.plants.join(',')}`)
            )
        }

        const plantsWithQuests = plantsInThisZone.map(currentPlant => {
            currentPlant.quest = quests_data.items.find(quest => quest.plant_id === currentPlant.id)
            currentPlant.collected = collectedPlantIds.has(currentPlant.id)
            return currentPlant
        })

        response.render('zone.liquid', {
            zone: currentZone,
            plants: plantsWithQuests,
            zone_slug,
            zone_type: currentZone.type
        })
    } catch (error) {
        response.status(500).send('Fout bij laden zone')
    }
})

// Quest or Plant Detail
app.get('/veldverkenner/:zone_slug/:item_slug', async (request, response, next) => {
    const { zone_slug, item_slug } = request.params
    try {
        const zoneData = await fetchData(`frankendael_zones?filter[slug][_eq]=${zone_slug}`)
        const currentZone = zoneData[0]
        if (!currentZone) return next()

        const foundQuest = quests_data.items.find(quest => quest.slug === item_slug)
        if (foundQuest) {
            const plantData = normalizePlants(
                await fetchData(`frankendael_plants?filter[id][_eq]=${foundQuest.plant_id}`)
            )
            foundQuest.plant = plantData[0]
            foundQuest.image = foundQuest?.plant?.in_bloom || foundQuest?.plant?.image || '/assets/images/placeholder.webp'

            return response.render('opdracht.liquid', {
                quest: foundQuest, 
                zone: currentZone, 
                zone_slug, 
                state: request.query.step || 'intro',
                user_id: USER_ID
            })
        }

        const plantData = await fetchData(`frankendael_plants?filter[slug][_eq]=${item_slug}`)
        if (plantData[0]) {
            const normalized = normalizePlant(plantData[0])
            return response.render('plant-detail.liquid', { plant: normalized, zone: currentZone, zone_slug })
        }
        next()
    } catch (error) {
        response.status(500).render('404.liquid')
    }
})

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

        // Avoid duplicates (Directus backend already shows duplicates)
        if (await userAlreadyCollectedPlant({ userId, plantId })) {
            return response.redirect('/veldverkenner')
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
            // Success: Redirect back to the field page
            response.redirect('/veldverkenner')
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

// News
app.get('/nieuws', async (request, response) => {
    const allNews = await fetchData('frankendael_news')
    response.render('nieuws.liquid', { news: allNews })
})

app.get('/nieuws/:slug', async (request, response) => {
    const { slug } = request.params
    const newsData = await fetchData(`frankendael_news?filter[slug][_eq]=${slug}`)
    response.render('news-detail.liquid', { newsItem: newsData[0] })
})

// Collection
app.get('/collectie', async (request, response) => {
    const [allPlants, allZones] = await Promise.all([
        fetchData('frankendael_plants'),
        fetchData('frankendael_zones')
    ])

    const plantsWithZoneDetails = allPlants.map(currentPlant => {
        currentPlant.main_zone = allZones.find(zone => zone.id === currentPlant.zones?.[0])
        return currentPlant
    })

    response.render('collectie.liquid', { plants: plantsWithZoneDetails, zone_type: 'collectie' })
})

// Error Handling
app.use((request, response) => {
    response.status(404).render('404.liquid')
})

// Start Server
app.set('port', process.env.PORT || 8000)
app.listen(app.get('port'), () => {
    console.log(`Started on http://localhost:${app.get('port')}`)
})