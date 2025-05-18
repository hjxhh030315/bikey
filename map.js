import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoiaGp4aGhoaCIsImEiOiJjbWF0N3RqbWUwbmEwMmtweXhsdHE1dHA3In0.oUIsC-R9NIOQH-AnpugD4w';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.094, 42.36],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
});

// Helper to project coordinates
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

map.on('load', async() => {
    // ✅ Add Boston bike lanes
    map.addSource('boston_bike_lanes', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_bike_lanes',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.6,
        },
    });

    // ✅ Add Cambridge bike lanes
    map.addSource('cambridge_bike_lanes', {
        type: 'geojson',
        data: 'https://www.cambridgema.gov/-/media/Files/CDD/Transportation/bikeplan/bikefacilities.geojson',
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_bike_lanes',
        paint: {
            'line-color': '#00BFFF',
            'line-width': 4,
            'line-opacity': 0.6,
        },
    });

    // ✅ Fetch Bluebikes station data
    let stations = [];
    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const jsonData = await d3.json(jsonurl);
        stations = jsonData.data.stations;
        console.log('Loaded Stations:', stations);
    } catch (error) {
        console.error('Error loading stations:', error);
    }

    // ✅ Select SVG overlay
    const svg = d3.select('#map').select('svg');

    // ✅ Draw station markers
    const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

    // ✅ Update marker positions
    function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy);
    }

    updatePositions(); // Initial call
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
});