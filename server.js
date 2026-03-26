import express from 'express'
import { Liquid } from 'liquidjs'

const app = express()
const API_BASE = 'https://fdnd-agency.directus.app/items'
const USER_ID = 2

app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')
app.set('view engine', 'liquid')

// --- Helpers ---

// Deep fetch data (including nested quest_options)
const fetchData = async (endpoint) => {
    const response = await fetch(`${API_BASE}/${endpoint}`)
    const json = await response.json()
    return json.data
}

// Ensure images always have the full URL
const directusAssetUrl = (id) => id ? `https://fdnd-agency.directus.app/assets/${id}` : '/assets/images/placeholder.webp'

// Prepare plant and quest data for Liquid
const normalizePlant = (plant) => {
    if (!plant) return null
    return {
        ...plant,
        in_bloom: directusAssetUrl(plant.in_bloom),
        not_in_bloom: directusAssetUrl(plant.not_in_bloom),
        // Liquid expects 'title', 'description', and 'options'
        title: plant.quest_title || 'Opdracht',
        description: plant.quest_text, 
        correct_answer: (plant.quest_options || []).find(o => o.correct)?.value,
        options: (plant.quest_options || []).map(o => ({
            text: o.label || o.value,
            value: o.value,
            image_url: o.image ? directusAssetUrl(o.image) : null
        })),
        xp: 25
    }
}

// Get IDs of plants already found by the user
const getCollectedIds = async (userId) => {
    const data = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}`)
    return new Set(data.map(item => typeof item.frankendael_plants_id === 'object' ? item.frankendael_plants_id.id : item.frankendael_plants_id))
}

// --- Routes ---

// Home: News and Plants
app.get('/', async (req, res) => {
    const [zones, plants, news] = await Promise.all([
        fetchData('frankendael_zones'),
        fetchData('frankendael_plants?fields=*.*'),
        fetchData('frankendael_news')
    ])
    const items = plants.map(p => ({ ...normalizePlant(p), main_zone: zones.find(z => z.id === p.zones[0]) }))
    const normalizedNews = news.map(n => ({ ...n, image: directusAssetUrl(n.image) }))
    res.render('index.liquid', { zones, plants: items, news: normalizedNews, zone_type: 'home' })
})

// Map: Show zones and check for available quests
app.get('/veldverkenner', async (req, res) => {
    const [zones, plants, collected] = await Promise.all([
        fetchData('frankendael_zones'),
        fetchData('frankendael_plants?fields=*.*'),
        getCollectedIds(USER_ID)
    ])
    const zonesWithQuest = zones.map(z => {
        const plant = plants.find(p => p.zones.includes(z.id) && p.quest_text)
        z.quest = plant ? { ...normalizePlant(plant), plant: normalizePlant(plant) } : null
        return z
    })
    res.render('veldverkenner.liquid', { zones: zonesWithQuest, progress: collected.size })
})

// Zone: Plants inside a specific zone
app.get('/veldverkenner/:zone_slug', async (req, res) => {
    const [zoneData, collected] = await Promise.all([
        fetchData(`frankendael_zones?filter[slug][_eq]=${req.params.zone_slug}`),
        getCollectedIds(USER_ID)
    ])
    const zone = zoneData[0]
    const plants = zone.plants?.length ? await fetchData(`frankendael_plants?filter[id][_in]=${zone.plants.join(',')}&fields=*.*`) : []
    const items = plants.map(p => {
        const normalized = normalizePlant(p)
        return { ...normalized, collected: collected.has(p.id), quest: p.quest_text ? normalized : null }
    })
    res.render('zone.liquid', { zone, plants: items, zone_slug: req.params.zone_slug, zone_type: zone.type })
})

// Detail: Show Quest or Plant info
app.get('/veldverkenner/:zone_slug/:item_slug', async (req, res) => {
    const zoneData = await fetchData(`frankendael_zones?filter[slug][_eq]=${req.params.zone_slug}`)
    const plantData = await fetchData(`frankendael_plants?filter[slug][_eq]=${req.params.item_slug}&fields=*.*`)
    const plant = normalizePlant(plantData[0])
    
    if (plant?.quest_text) {
        res.render('opdracht.liquid', { quest: plant, plant, zone: zoneData[0], zone_slug: req.params.zone_slug, state: req.query.step || 'intro', user_id: USER_ID })
    } else {
        res.render('plant-detail.liquid', { plant, zone: zoneData[0], zone_slug: req.params.zone_slug })
    }
})

// POST: Save discovery
app.post('/veldverkenner/:zone_slug/:item_slug', async (req, res) => {
    await fetch(`${API_BASE}/frankendael_users_plants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frankendael_users_id: req.body.user_id || USER_ID, frankendael_plants_id: req.body.plant_id })
    })
    res.redirect(`/veldverkenner/${req.params.zone_slug}`)
})

// News List
app.get('/nieuws', async (req, res) => {
    const news = await fetchData('frankendael_news')
    res.render('nieuws.liquid', { news: news.map(n => ({ ...n, image: directusAssetUrl(n.image) })) })
})

// News Detail
app.get('/nieuws/:slug', async (req, res) => {
    const data = await fetchData(`frankendael_news?filter[slug][_eq]=${req.params.slug}`)
    const item = { ...data[0], image: directusAssetUrl(data[0].image) }
    res.render('news-detail.liquid', { newsItem: item })
})

// Collection
app.get('/collectie', async (req, res) => {
    const [plants, zones] = await Promise.all([
        fetchData('frankendael_plants?fields=*.*'), 
        fetchData('frankendael_zones')
    ])
    const items = plants.map(p => ({ ...normalizePlant(p), main_zone: zones.find(z => z.id === p.zones?.[0]) }))
    res.render('collectie.liquid', { plants: items, zone_type: 'collectie' })
})

app.listen(8000, () => console.log('Running at http://localhost:8000'))