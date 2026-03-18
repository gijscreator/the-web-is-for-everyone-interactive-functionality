import express from 'express'
import { Liquid } from 'liquidjs'

const app = express()
const API_BASE = 'https://fdnd-agency.directus.app/items'
const USER_ID = 2 // Static user ID for the current context

app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')
app.set('view engine', 'liquid')

// Global variables available in all Liquid templates
app.use((request, response, next) => {
    response.locals.current_path = request.path || '/'
    response.locals.previous_path = request.get('Referrer') || '/'
    response.locals.user_id = USER_ID 
    next()
})

/**
 * Universal fetcher that always uses *.* to get all nested data
 * like images and relations.
 */
const fetchData = async (endpoint) => {
    try {
        const separator = endpoint.includes('?') ? '&' : '?'
        const url = `${API_BASE}/${endpoint}${separator}fields=*.*`
        const response = await fetch(url)
        const json = await response.json()
        return json.data || []
    } catch (error) {
        console.error(`Fetch error for ${endpoint}:`, error)
        return []
    }
}

/**
 * Helper: Gets an array of IDs for plants the user has already collected
 */
const getFinishedIds = async (userId) => {
    const userData = await fetchData(`frankendael_users_plants?filter[frankendael_users_id][_eq]=${userId}`)
    return userData.map(item => {
        // Directus returns either the ID or the object depending on depth
        return item.frankendael_plants_id?.id || item.frankendael_plants_id
    })
}

// -- Routes --

// Welcome / Onboarding
app.get('/welcome', (req, res) => res.render('welcome.liquid'))

// Homepage: Show earned plants and news
app.get('/', async (req, res) => {
    const [news, zones, finishedIds, allPlants] = await Promise.all([
        fetchData('frankendael_news'),
        fetchData('frankendael_zones'),
        getFinishedIds(USER_ID),
        fetchData('frankendael_plants')
    ])

    const collectedPlants = allPlants.filter(p => finishedIds.includes(p.id))

    res.render('index.liquid', { 
        zones, 
        plants: collectedPlants, 
        news, 
        zone_type: 'home' 
    })
})

// Full Collection page
app.get('/collectie', async (req, res) => {
    const [finishedIds, allPlants] = await Promise.all([
        getFinishedIds(USER_ID),
        fetchData('frankendael_plants')
    ])
    const collectedPlants = allPlants.filter(p => finishedIds.includes(p.id))

    res.render('collectie.liquid', { 
        plants: collectedPlants, 
        zone_type: 'collectie' 
    })
})

// Interactive Map: Checks if entire zones are finished
app.get('/veldverkenner', async (request, response) => {
    const [allZones, finishedIds] = await Promise.all([
        fetchData('frankendael_zones'),
        getFinishedIds(USER_ID)
    ])

    const zonesWithStatus = allZones.map(zone => {
        const plantIdsInZone = zone.plants?.map(p => p.id || p) || []
        // Zone is marked complete if user has earned every plant in it
        zone.is_completed = plantIdsInZone.length > 0 && plantIdsInZone.every(id => finishedIds.includes(id))
        return zone
    })

    response.render('veldverkenner.liquid', { zones: zonesWithStatus })
})

app.get('/veldverkenner/:zone_slug', async (request, response, next) => {
    const { zone_slug } = request.params
    const [zoneData, finishedIds] = await Promise.all([
        fetchData(`frankendael_zones?filter[slug][_eq]=${zone_slug}`),
        getFinishedIds(USER_ID)
    ])
    
    const currentZone = zoneData?.[0]
    if (!currentZone) return next()

    // Map database fields to the variables your Liquid templates expect
    const plantsWithData = (currentZone.plants || []).map(plant => {
        const isDone = finishedIds.includes(plant.id)
        
        // This object matches what your flowerlist and questlist need
        return {
            ...plant,
            collected: isDone,       // Matches your {% if plant.collected %}
            is_completed: isDone,    // Matches your {% if plant.is_completed %}
            // If the plant has a quest title, we create the quest object
            quest: plant.quest_title ? {
                id: plant.id,
                name: plant.quest_title,        // Matches {{ plant.quest.name }}
                description: plant.quest_text,   // Matches {{ plant.quest.description }}
                slug: plant.slug,               // Used for the URL
                xp: 25                          // Matches {{ plant.quest.xp }}
            } : null
        }
    })

    response.render('zone.liquid', { 
        zone: currentZone, 
        plants: plantsWithData, 
        zone_slug: zone_slug,
        zone_type: currentZone.type
    })
})

// Quest (Opdracht) or Plant Detail
app.get('/veldverkenner/:zone_slug/:item_slug', async (request, response, next) => {
    const { zone_slug, item_slug } = request.params
    const [zoneData, plantData] = await Promise.all([
        fetchData(`frankendael_zones?filter[slug][_eq]=${zone_slug}`),
        fetchData(`frankendael_plants?filter[slug][_eq]=${item_slug}`)
    ])

    const currentZone = zoneData?.[0]
    const plant = plantData?.[0]

    if (!currentZone || !plant) return next()

    // Reconstruct the 'quest' object to match your opdracht.liquid selectors
    const questObject = {
        ...plant,
        title: plant.quest_title,
        content: plant.quest_text,
        type: plant.quest_type, // e.g. 'button' or 'image'
        options: plant.quest_options, // Array from Directus
        correct_answer: plant.quest_answer,
        image: plant.in_bloom ? `https://fdnd-agency.directus.app/assets/${plant.in_bloom}` : '/assets/images/placeholder.webp',
        xp: 20,
        plant_id: plant.id
    }

    // If a quest title exists, we treat it as an active quest
    if (plant.quest_title) {
        return response.render('opdracht.liquid', {
            quest: questObject,
            zone: currentZone,
            zone_slug,
            state: request.query.step || 'intro'
        })
    }

    // Otherwise, show the plant information page
    response.render('plant-detail.liquid', { plant, zone: currentZone, zone_slug })
})

// POST: Save progress when a quest is completed
app.post('/veldverkenner/:zone_slug/:item_slug', async (request, response) => {
    const { plant_id } = request.body
    const { zone_slug } = request.params
    
    try {
        const res = await fetch(`${API_BASE}/frankendael_users_plants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                frankendael_users_id: USER_ID,
                frankendael_plants_id: parseInt(plant_id)
            })
        })

        if (res.ok) {
            response.redirect(`/veldverkenner/${zone_slug}`)
        } else {
            throw new Error('Failed to post to Directus')
        }
    } catch (error) {
        console.error('Save error:', error)
        response.status(500).send('Fout bij opslaan van je voortgang.')
    }
})

// News Routes
app.get('/nieuws', async (request, response) => {
    const allNews = await fetchData('frankendael_news')
    response.render('nieuws.liquid', { news: allNews })
})

app.get('/nieuws/:slug', async (request, response) => {
    const newsData = await fetchData(`frankendael_news?filter[slug][_eq]=${request.params.slug}`)
    if (newsData?.[0]) {
        response.render('news-detail.liquid', { newsItem: newsData[0] })
    } else {
        response.status(404).render('404.liquid')
    }
})

// 404 Handler
app.use((request, response) => {
    response.status(404).render('404.liquid')
})

app.set('port', process.env.PORT || 8000)
app.listen(app.get('port'), () => console.log(`http://localhost:${app.get('port')}`))