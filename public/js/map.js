mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: listingLocation,
    zoom: 9,
});

new mapboxgl.Marker({ color: "#fe424d" })
    .setLngLat(listingLocation)
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(listingTitle))
    .addTo(map);