// Globals
let mapLineStyle = "flow"; // used by the onEachFeature function to colorize lines (this in-built Leaflet function can't be passed extra parameters, so this needs to be a global that is toggled by another function)

// Initialize a leaflet map and load it to the page
const sw = L.latLng(36.95, -110);
const ne = L.latLng(41.05, -101);
const mapBounds = L.latLngBounds(sw, ne);
let geojson;
let streamLayer;

const mapOptions = {
  center: [39.6808, -106.6534], // [lat, lon],
  zoom: 9,
  minZoom: 7,
  maxZoom: 14,
  maxBounds: mapBounds,
};

map = L.map("map", mapOptions);

L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// const hucLayer = L.geoJSON(hucBoundaries)
//   .bindTooltip(function (layer) {
//     return String(`${layer.feature.properties.watershed} Basin`);
//  }, {permanent: true, opacity: '0.5', className: "huc-labels"})
//  .addTo(map)

 
const hucLayer = L.geoJSON(hucBoundaries)
.bindTooltip(function(layer) {
  return String(layer.feature.properties.watershed + ' Basin')
}, {className: "huc-tooltips"})
.setStyle({
  stroke: '#0000FF',  
  weight: 1, // pixels
  fillColor: '#0000FF',  // blue
  fillOpacity: 0.05,
  dashArray: [4,3],
})
.addTo(map);


////////////////////////////////////////////////////////////////////////////////////

// ADD FEATURES TO MAP, binding a custom style and click event on each

// function addMapFeatures() {
//   geojson = L.geoJSON(streamLines, {
//     onEachFeature: bindLayerFunctions,
//     style: applyCustomLineStyles,
//   }).addTo(map);
// }

function addMapFeatures() {
  if (streamLayer) map.removeLayer(streamLayer);
  streamLayer = L.geoJSON(streamLines, {
    onEachFeature: bindLayerFunctions,
    style: applyCustomLineStyles,
  });
  streamLayer.addTo(map);
}

// make the streams.geojson object inspectable in the browser
console.log("map created, loading features");

// // EXAMPLE (DELETE) Add some simple markers, for example at a gauge site
// const marker1 = L.marker([39.70364, -106.679287])
//   .bindPopup("Gauge: Eagle River below Milk Creek near Wolcott")
//   .addTo(map);

// this function should get the feature segment name when the map is
// clicked and scroll the sidebar to show that segment card
function scrollSidebarToSegmentCard(dataId) {
  console.log("scrolling to " + dataId);
  // document.getElementById(id).scrollIntoView();
  document
    .querySelector(`[data-id="${dataId}"]`)
    .scrollIntoView({ behavior: "smooth" });
}

// Bind custom popups based on the data in the feature property 'popupContent'
function bindLayerFunctions(feature, layer) {
  // highlight and un-highlight lines during mouseover/off
  layer.on({ mouseover: onLineMouseover });
  layer.on({ mouseout: onLineMouseout });

  let myPopUp;
  if (feature.properties && feature.properties.popupContent === "") {
    myPopUp =
      "<str>" +
      feature.properties.river +
      "</str><br><span class='popup-content-section'>" +
      feature.properties.section +
      "</span><br>Temp:  <em class='popup-content-value'>" +
      feature.properties.temp_f +
      " F</em>" +
      "<br>Flow:  <em class='popup-content-value'>" +
      feature.properties.flow_cfs +
      " cfs</em>" +
      "<br>% of Typical Flow:   <em class='popup-content-value'>" +
      feature.properties.perc_med +
      "%</em>" +
      "<br><button class='btn-popup' onclick='openModal(" +
      feature.properties.section_num +
      ")' ><em class='graph-link'>Build 7-day graphs</em></button>";

    layer.bindPopup(myPopUp).on({
      popupclose: (e) => {
        map.setView(mapOptions.center, mapOptions.zoom);
        document
          .querySelectorAll(`.segment`)
          .forEach((el) => el.classList.remove("card-highlight"));
      },
    });
  }

  let myTooltip;
  myTooltip = feature.properties.section;
  layer.bindTooltip(myTooltip, {popupAnchor: [-10, -15],});
  // add the section number to the id for using emulated/virtual click events
  layer._leaflet_id = feature.properties.section_num;
  // when segment is clicked, re-zoom map to segment and scroll sidebar to segment
  layer.on({ click: onLineClick });
}

// Style line features based on the temperature or flow value

function applyCustomLineStyles(feature) {
  // console.log("applying line styles");
  if (mapLineStyle === "temp") {
    // let myColor = "#00FF00"; // DEFAULT temp color is green
    myColor = "#808080"; // DEFAULT temp color is grey?
    console.log("applying line styles for temperature");
    console.log(feature.properties.temp_f);
    console.log(typeof feature.properties.temp_f);
    if (feature.properties.temp_f < 65) myColor = "#00FF00"; // GREEN low fish risk
    if (feature.properties.temp_f >= 65 && feature.properties.temp_f < 70)
      myColor = "#FFA400"; // ORANGE moderate fish risk
    if (feature.properties.temp_f >= 70) myColor = "#FF0000"; // RED high fishing risk
    console.log("new line color is  " + myColor);
  }
  if (mapLineStyle === "flow") {
    myColor = "#808080"; // DEFAULT flow color is grey?
    console.log("applying line styles for flow");
    //
    if (feature.properties.perc_med < 33) myColor = "#B12121"; // DARK RED very low flow
    if (feature.properties.perc_med >= 33 && feature.properties.perc_med < 50)
      myColor = "#FF0000"; // RED low flows
    if (feature.properties.perc_med >= 50 && feature.properties.perc_med < 80)
      myColor = "#FFA400"; // ORANGE lower than typical flows
    if (feature.properties.perc_med >= 80 && feature.properties.perc_med < 120)
      myColor = "#00FF00"; // GREEN typical flows
    if (feature.properties.perc_med >= 120 && feature.properties.perc_med < 150)
      myColor = "#40DFD0"; // AQUA higher than typical flows
    if (feature.properties.perc_med >= 150 && feature.properties.perc_med < 200)
      myColor = "#0000FF"; // DARK BLUE high flows
    if (feature.properties.perc_med > 200) myColor = "#000000"; // BLACK very high
    if (feature.properties.perc_med === undefined) myColor = "#808080"; // GREY if percent of median is not defined or calculable
  }
  // build the styles object for the line features and return it
  return {
    color: myColor,
    weight: 5,
  };
}

// }
// USGS coloring scheme (usese percentiles, not percent of median)
// #FF0000 RED VERY LOW
// #B12121 DARK RED < 10
// #FFA400 orange 10-24
// #00FF00 green 25-74
// #40DFD0 aqua 75-90
// #0000FF dark blue > 90
// #000000 black very high

// UPDATE CHARTS:
// clickhandler to update charts on page when feature is clicked

function onLineClick(e) {
  // const targetDiv = document.getElementById("myChartElement");
  clickedFeature = e.target;
  bounds = clickedFeature.getBounds();
  console.log(bounds);

  bounds._northEast.lat = bounds._northEast.lat + 0.05;
  bounds._northEast.lon = bounds._northEast.lon + 0.05;
  bounds._southWest.lat = bounds._southWest.lat - 0.05;
  bounds._southWest.lon = bounds._southWest.lon - 0.05;
  map.fitBounds(bounds);
  console.log("Clicked segment: " + clickedFeature.feature.properties.segment);
  scrollSidebarToSegmentCard(clickedFeature.feature.properties.section_num);
  highlightSegmentCard(clickedFeature.feature.properties.section_num);
}

function highlightSegmentCard(dataId) {
  // first, remove highlights on any cards that are currently highlighted
  document
    .querySelectorAll(`.segment`)
    .forEach((el) => el.classList.remove("card-highlight"));
  // next, add a highlight to the card for the segment on the map that was clicked
  cardEl = document.querySelector(`[data-id="${dataId}"]`);
  cardEl.classList.toggle("card-highlight");
}

function onLineMouseover(e) {
  this.mySavedLineColor = this.options.color;
  e.target.setStyle({
    color: "yellow",
  });
}

function onLineMouseout(e) {
  e.target.setStyle({
    color: this.mySavedLineColor,
  });
}

///////////////////////////////////////////////////////
//
//  TOGGLE MAP LINE STYLES BETWEEN TEMPERATURE AND FLOW

const fishColorLegend = document.getElementById("temp-legend");
const flowColorLegend = document.getElementById("flow-legend");

function changeLineStyles(e) {
  if (mapLineStyle === "temp") {
    mapLineStyle = "flow";
  } else {
    mapLineStyle = "temp";
  }
  console.log(`Map Line Style is now: ${mapLineStyle}`);

  // update the legend
  fishColorLegend.classList.toggle("hidden-none");
  flowColorLegend.classList.toggle("hidden-none");
  addMapFeatures();
}

const changeStyleButton = document.getElementById("change-style-btn");
changeStyleButton.addEventListener("click", changeLineStyles);

////////////////////////////////////////////////////////////////
