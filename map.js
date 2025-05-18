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

const stationFlow = d3.scaleQuantize()
    .domain([0, 1])
    .range([0, 0.5, 1]);

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

function filterTripsByTime(trips, timeFilter) {
    return timeFilter === -1 ?
        trips :
        trips.filter((trip) => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);
            return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
            );
        });
}

function computeStationTraffic(stations, trips) {
    const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
    const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

    return stations.map((station) => {
        const id = station.Number;
        station.departures = departures.has(id) ? departures.get(id) : 0;
        station.arrivals = arrivals.has(id) ? arrivals.get(id) : 0;
        station.totalTraffic = station.departures + station.arrivals;
        return station;
    });
}

let timeFilter = -1;
let trips = [];
let stations = [];
let originalStations = [];
let radiusScale;

map.on('load', async() => {
    const svg = d3.select('#map').select('svg');

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

    map.addSource('cambridge_bike_lanes', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
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

    const jsonData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    originalStations = jsonData.data.stations;

    trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
    });

    stations = computeStationTraffic(originalStations, trips);

    radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, d => d.totalTraffic)])
        .range([0, 25]);

    function updateScatterPlot(timeFilter) {
        const filteredTrips = filterTripsByTime(trips, timeFilter);
        const filteredStations = computeStationTraffic(originalStations, filteredTrips);

        timeFilter === -1 ?
            radiusScale.range([0, 25]) :
            radiusScale.range([3, 50]);

        const updatedCircles = svg
            .selectAll('circle')
            .data(filteredStations, (d) => d.Number)
            .join('circle')
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy)
            .attr('r', (d) => radiusScale(d.totalTraffic))
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.6)
            .attr('pointer-events', 'auto')
            .style('--departure-ratio', (d) => {
                const ratio = d.totalTraffic === 0 ? 0.5 : d.departures / d.totalTraffic;
                return stationFlow(ratio);
            });

        updatedCircles.each(function(d) {
            d3.select(this).select('title').remove();
            d3.select(this)
                .append('title')
                .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });
    }

    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value);
        if (timeFilter === -1) {
            selectedTime.textContent = '';
            anyTimeLabel.style.display = 'block';
        } else {
            selectedTime.textContent = formatTime(timeFilter);
            anyTimeLabel.style.display = 'none';
        }
        updateScatterPlot(timeFilter);
    }

    const timeSlider = document.querySelector('#time-slider');
    const selectedTime = document.querySelector('#selected-time');
    const anyTimeLabel = document.querySelector('#any-time');

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();

    function updatePositions() {
        svg.selectAll('circle')
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy);
    }

    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
});