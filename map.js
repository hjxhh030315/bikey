// map.js
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check if Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// 🔑 Replace this with your actual Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaGp4aGhoaCIsImEiOiJjbWF0N3RqbWUwbmEwMmtweXhsdHE1dHA3In0.oUIsC-R9NIOQH-AnpugD4w';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027], // Example: Cambridge
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
});