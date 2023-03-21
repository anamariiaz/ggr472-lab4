//provide access token to Mapbox API 
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5hbWFyaWlheiIsImEiOiJjbGRtMTR5YmUwMjBqM3VrZDU0N2RmeTVuIn0.TtYMegWHD_9XSk_jO1jZFg'; 

//define maximum and minimum scroll bounds for the maps
const maxBounds = [
    [-79.8, 43.4], //SW coords
    [-78.8, 44] //NE coords
];

//define a constant variable "map" and assign it to a map created with the Mapbox API
const map = new mapboxgl.Map({
    container: 'map', //ID for div where map will be embedded in HTML file
    style: 'mapbox://styles/anamariiaz/clex3wjhx000z01o2bsd76rsn', //link to style URL
    center: [-79.39, 43.65], //starting position [longitude, latitude]
    zoom: 9, //starting zoom
    maxBounds: maxBounds //maximum and minimum scroll bounds
});

//add navigation controls to the map (zoom in, zoom out, and compass buttons) 
map.addControl(new mapboxgl.NavigationControl());

//add button to map which enters/exits full screen mode
map.addControl(new mapboxgl.FullscreenControl());

//assign 'geocoder' variable to a Mapbox geocoder (which allows searching of locations and zooms into searched locations on the map)
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    countries: "ca" //limit searchable locations to being within Canada
});

//add geocoder to map by embedding it within HTML element with "geocoder" id (such that its map location and style is specified by the css of the latter)
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

//define an empty variable 'pedcyc_collision'
let pedcyc_collision;

//retrieve geojson data from the link below and store it in the variable 'pedcyc_collision'
fetch(' https://anamariiaz.github.io/data_4/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        pedcyc_collision = response; //assign already-created variable 'pedcyc_collision' to retrieved geojson from link above
    });

//console.log(pedcyc_collision) //uncomment to check what 'pedcyc_collision' contains in console if desired

//assign 'collishex' variable to an empty geojson
let collishex = { 
    "type": "FeatureCollection",
    "features": []
};

//specify events triggered by the loading of the "map" variable
map.on('load', () => {
    //define an empty variable 'bboxgeojson'
    let bboxgeojson;

    //assign variable 'bbox' to an envelope (i.e. rectangle) created around the collision points contained in 'pedcyc_collision'
    let bbox= turf.envelope(pedcyc_collision);

    //re-assign already-created variable bboxgeojson to a geojson containing the features listed in bbox
    bboxgeojson = {
        "type": "FeatureCollection",
         "features": [bbox]
     };

    //assign variable 'scaled_bbox' to a rectangle that is 1.15 times the size of bbox (which can be used such that the hexgrid covers the entire desired area)
    var scaled_bbox = turf.transformScale(bbox, 1.15);
    
    //assign variable 'bbox_coords' to an array which contains the minX, minY, maxX, and maxY coordinates of the scaled envelope/rectangle containing the collision points
    let bbox_coords=[scaled_bbox.geometry.coordinates[0][0][0],
                    scaled_bbox.geometry.coordinates[0][0][1],
                    scaled_bbox.geometry.coordinates[0][2][0],
                    scaled_bbox.geometry.coordinates[0][2][1],
                    ];  
    
    //add a geojson file source "pedcyc" for the collision points
    map.addSource('pedcyc', {
        type: 'geojson',
        data: pedcyc_collision
    });

    //add and style a layer of circles "coll-pnts" from the defined "pedcyc" source
    map.addLayer({
        'id': 'coll-pnts',
        'type': 'circle',
        'source': 'pedcyc',
        'paint': {
            'circle-color': 'blue',
            'circle-opacity': 0.5
        }
    });

    //add a geojson file source "collis-box" for the original (non-scaled) envelope/rectangle containing the collision points and marking the study area
    map.addSource('collis-box', {
        type: 'geojson',
        data: bboxgeojson
    });

    //add and style a layer of lines "envelope" from the defined "collis-box" source
    map.addLayer({
       'id': 'envelope',
       'type': 'line',
       'source': 'collis-box',
       'paint': {
           'line-color': 'black',
           'line-opacity':0.8
       }
   });

    //change cursor to a pointer when mouse hovers over 'coll-pnts' layer
    map.on('mouseenter', 'coll-pnts', (e) => {
        map.getCanvas().style.cursor = 'pointer'; 
    });

    //change cursor back when mouse leaves 'coll-pnts' layer
    map.on('mouseleave', 'coll-pnts', (e) => {
        map.getCanvas().style.cursor = ''; 
    });

    //specify events triggered by clicking on the 'coll-pnts' layer
    map.on('click', 'coll-pnts', (e) => {
        //declare and add to map a popup at the longitude-latitude location of click which contains the neighbourhood and year of the collision at the clicked point, as well as a link to the data source
        new mapboxgl.Popup() 
        .setLngLat(e.lngLat) 
        .setHTML("Neighbourhood: " + e.features[0].properties.NEIGHBOURHOOD_158 + "<br>" + "Year: " + e.features[0].properties.YEAR + "<br>" + '<a target=”_blank” href="https://open.toronto.ca/dataset/motor-vehicle-collisions-involving-killed-or-seriously-injured-persons/ ">Collision Points Source</a>') 
        .addTo(map);
    });

    //add a geojson file source "collishexgrid" for the hexgrid (containing the number of collisions per hexagon) 
    map.addSource('collishexgrid', {
        type: 'geojson',
        data:collishex,
        'generateId': true
    });

    //add and style a layer of polygons "hex" from the defined "collishexgrid" source (for the hexagons)
    map.addLayer({
        'id': 'hex',
        'type': 'fill',
        'source': 'collishexgrid',
        'paint': {  
            'fill-color': [
                'step', //specify the color of the polygons based on the number contained within the "COUNT" property (i.e. based on the collision number per hexagon)
                ['get', 'COUNT'], //retrieve value from property 'COUNT'
                '#f69697', //assign color to any hexagons with count values < first step
                2, '#f94449', //assign colors to hexagons with count values >= each step
                5, '#f01e2c',
                10, '#c30010'
            ],
            'fill-opacity':0.8
        }
    });

    //add and style a layer of lines "outline" from the defined "collishexgrid" source (for the outline of the hexagons)
    map.addLayer({
        'id': 'outline',
        'type': 'line',
        'source': 'collishexgrid',
        'paint': {
            'line-color':'black',
             //modify the width (i.e. existence) of lines based on the hover feature-state (i.e. change width of lines when hexagon polygons/outlines are hovered over)
            'line-width':[
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1, //change width of lines to 1 when polygons/outlines of hexagons are hovered over
                0 //leave width of lines at 0 (i.e. not visible) when not polygons/outlines of hexagons are not hovered over
            ]     
        }
    });

    //add and style a layer of lines "max" from the defined "collishexgrid" source (for the outline of the hexagon with the max collisions)
    map.addLayer({
        'id': 'max',
        'type': 'line',
        'source': 'collishexgrid',
        'paint': {
            'line-color': 'orange',
            'line-width':[
                'match', //specify the width (i.e. existence) of lines based on the value contained within the "MAX_COLL" property (i.e. based on whether a given hexagon contains the max number of collisions)
                ['get', 'MAX_COLL'], //retrieve value from property 'MAX_COLL'
                'no', 0, //specify line width as 0 if the value of 'MAX_COLL' property is 'no'
                'yes', 2, //specify line width as 1 if the value of 'MAX_COLL' property is 'yes'
                0 //specify line width as 0 in case neither of the above apply
            ]
        }
    });
 
    //specify events triggered by inputing value into slider HTML element with id "slider"
    document.getElementById('slider').addEventListener('input', (e) => {
        //if the value selected on the slider is not 0...
        if (e.target.value!=0){
            //update the text associated with the slider to specify the inputted radius on the slider in km
            document.getElementById('radius_text').innerHTML=e.target.value+'km';
            //assign variable 'radius' to the inputted radius on the slider
            const radius = e.target.value;
            //assign variable 'hexgrid' to a grid of hexagons (with side length specified by the input of the slider) extending over the scaled envelope/rectangle containing collision points 
            var hexgrid = turf.hexGrid(bbox_coords, radius, {units: 'kilometres'});
            //console.log(hexgrid) //uncomment to check what 'hexgrid' contains in console if desired

            //re-assign already-created variable 'collishex' to a collection: i.e. the set of hexgrid polygons which has a data field "values" that contains the '_id' of the points falling within each hexagon
            collishex=turf.collect(hexgrid, pedcyc_collision, '_id', 'values'); //let
            //assign variable 'max_collis' to 0
            let max_collis=0
            //loop through each hexagon polygon (i.e. each 'feature') of the collishex collection
            collishex.features.forEach((feature) =>{
                //create a property 'COUNT' for each feature and assign it to the length of the list containing the points lying within the feature (i.e. to the number of points lying within the hexagon)
                feature.properties.COUNT = feature.properties.values.length
                //if the 'COUNT' property of a given feature (i.e. the number of points lying within a given hexagon) is greater than the current value of the 'max_collis' variable, update 'max_collis' to this new 'COUNT' value
                if (feature.properties.COUNT>max_collis){
                    max_collis=feature.properties.COUNT
                }
            });
            //loop through each hexagon polygon (i.e. each 'feature') of the collishex collection
            collishex.features.forEach((feature) =>{
                //if a given feature's 'COUNT' property is equal to the value of 'max_collis' (the maximum collision number within any hexagon), create a property 'MAX_COLL' and assign it a value of 'yes'
                if (feature.properties.COUNT===max_collis){
                    feature.properties.MAX_COLL = 'yes'
                }
                //if a given feature's 'COUNT' property is not equal to the value of 'max_collis' (the maximum collision number within any hexagon), create a property 'MAX_COLL' and assign it a value of 'no'
                else {
                    feature.properties.MAX_COLL = 'no'
                }
            });
            //console.log(collishex) //uncomment to check what 'collishex' contains in console if desired

            //update the source 'collishexgrid' to contain the new data re-assigned to collishex in the lines above
            map.getSource('collishexgrid').setData(collishex);
        }
        //if the value selected on the slider is 0...
        else {
            //update the source 'collishexgrid' to contain an empty geojson
            map.getSource('collishexgrid').setData({
                "type": "FeatureCollection",
                "features": []
            });
            //update the text associated with the slider to specify the inputted radius on the slider of "0km"
            document.getElementById('radius_text').innerHTML=0+'km';
        }    
    });

    //change cursor to a pointer when mouse hovers over 'hex' layer
    map.on('mouseenter', 'hex', (e) => {
        map.getCanvas().style.cursor = 'pointer'; 
    });

    //change cursor back when mouse leaves 'hex' layer
    map.on('mouseleave', 'hex', (e) => {
            map.getCanvas().style.cursor = ''; 
    });

    //specify events triggered by clicking on the 'hex' layer
    map.on('click', 'hex', (e) => {
        //if the clicked hexagon does not contain the max collisions, declare and add to map a popup at the longitude-latitude location of click which specifies the collision count of the clicked hexagon 
        if (e.features[0].properties.MAX_COLL==='no'){
            new mapboxgl.Popup() 
            .setLngLat(e.lngLat) 
            .setHTML("Collision Count in Hexagon: " + e.features[0].properties.COUNT)
            .addTo(map); 
        }
        //if the clicked hexagon does contain the max collisions, declare and add to map a popup at the longitude-latitude location of click which specifies the collision count of the clicked hexagon (and the fact that this is the maximum collision count)
        else if (e.features[0].properties.MAX_COLL==='yes'){
            new mapboxgl.Popup() 
            .setLngLat(e.lngLat) 
            .setHTML("Collision Count in Hexagon (Max): " + e.features[0].properties.COUNT)
            .addTo(map); 
        }
    });

    let hexID = null; //assign initial value of 'hexID' variable as null

    //specify events triggered by moving mouse over the 'hex' layer
    map.on('mousemove', 'hex', (e) => {
        //enter conditional if mouse hovers over at least one feature of the 'hex' layer
        if (e.features.length > 0) { 
            //if hexID IS NOT NULL - i.e. a feature was being hovered over immediately prior to another - set hover feature-state of this feature back to false to reset the original 0 width of its outline (before continuing to move and highlight the next hovered feature)
            if (hexID !== null) { 
                map.setFeatureState(
                    { source: 'collishexgrid', id: hexID },
                    { hover: false }
                );
            }
            //set 'hexID' variable to the id of the 'hex' layer feature being hovered over
            hexID = e.features[0].id; 
            //change the hover feature-state to "true" for the feature of the 'hex' layer being hovered over (to change the width of its outline)
            map.setFeatureState(
                { source: 'collishexgrid', id: hexID },
                { hover: true } 
            );
        }
    });

    //specify events triggered by mouse leaving the 'hex' layer
    map.on('mouseleave', 'hex', () => { 
        //change the hover feature-state to "false" for the feature of the 'hex' layer that was previously hovered over (to reset the original 0 width of its outline) and re-initialize hexID to null
        if (hexID !== null) {
            map.setFeatureState(
                { source: 'collishexgrid', id: hexID },
                { hover: false }
            );
        }
        hexID = null;
    });   
});

//specify events triggered by changing the checkbox value of the checkbox HTML element with id "layercheck"
document.getElementById('layercheck').addEventListener('change', (e) => {
    //toggle visibility of 'coll-pnts' layer to on/off depending on whether checkbox is checked/unchecked
    map.setLayoutProperty(
      'coll-pnts',
      'visibility',
      e.target.checked ? 'visible' : 'none'
    );
});

//specify events triggered by changing the checkbox value of the checkbox HTML element with id "layercheck_bounds"
document.getElementById('layercheck_bounds').addEventListener('change', (e) => {
    //toggle visibility of 'envelope' layer to on/off depending on whether checkbox is checked/unchecked
    map.setLayoutProperty(
      'envelope',
      'visibility',
      e.target.checked ? 'visible' : 'none'
    );
});

//specify events triggered by changing the checkbox value of the checkbox HTML element with id "layercheck_max"
document.getElementById('layercheck_max').addEventListener('change', (e) => {
    //toggle visibility of 'max' layer to on/off depending on whether checkbox is checked/unchecked
    map.setLayoutProperty(
      'max',
      'visibility',
      e.target.checked ? 'visible' : 'none'
    );
});

//specify events triggered by clicking the button HTML element with id "returnbutton"
document.getElementById('returnbutton').addEventListener('click', () => {
    //move the map view back to original state
    map.flyTo({
        center: [-79.39, 43.65], //starting position [longitude, latitude]
        zoom: 10, //starting zoom
        essential: true
    });
});

//assign variable 'legendlabels' to a list of labels for the collision no. legend
const legendlabels = [
    '0-2',
    '2-5',
    '5-10',
    '>10'
];

//assign variable 'legendcolours' to a list of colours for the collision no. legend
const legendcolours = [
    '#f69697',
    '#f94449',
    '#f01e2c',
    '#c30010'
];

//assign 'legend' variable to HTML element with 'legend' id
const legend = document.getElementById('legend');

//loop through the legend labels in the 'legendlabels' variable
legendlabels.forEach((label, i) => {
    //assign 'color' variable to the corresponding color of the 'legendcolours' variable
    const color = legendcolours[i];
    //assign 'item' variable to a created 'section'
    const item = document.createElement('div'); 
    //assign 'key' variable to a created 'span' (i.e. space into which content can be inserted)
    const key = document.createElement('span'); 
    //specify the class of 'key' span as 'legend-key' such that its style is defined by the latter in css
    key.className = 'legend-key'; 
    //specify the background color of 'key' span using the 'color' variable
    key.style.backgroundColor = color; 
    //assign 'value' variable to a created 'span' (i.e. space into which content can be inserted)
    const value = document.createElement('span'); 
    //insert text into 'value' span from the 'legendlabels' list being looped through
    value.innerHTML = `${label}`; 
    //add 'key' span to the created section 'item'
    item.appendChild(key); 
    //add 'value' span to the created section 'item'
    item.appendChild(value); 
    //add 'item' section into the HTML element assigned to 'legend' variable
    legend.appendChild(item); 
});

//When the collapsible button for toggling the legend is clicked...
document.getElementById('collapsible').addEventListener('click', () => {
   //if the legend is expanded, collapse it (i.e. remove its display) and update the collapsible label to 'Open Legend'
    if (legend.style.display === "block"){
        legend.style.display =""
        collapsible.innerHTML = 'Open Legend'
    }
    //if the legend is collapsed, expand it (i.e. change its display) and update the collapsible label to 'Close Legend'
    else if (legend.style.display === ""){
        legend.style.display = "block"
        collapsible.innerHTML = 'Close Legend'
    }
});

//assign 'label_points' variable to HTML element with 'label_points' id
const label_points = document.getElementById('label_points');
//assign 'item_points' variable to a created 'section'
const item_points = document.createElement('div'); 
//assign 'key_points' variable to a created 'span' (i.e. space into which content can be inserted)
const key_points = document.createElement('span'); 
//specify the class of 'key_points' span as 'label-key-points' such that its style is defined by the latter in css
key_points.className = 'label-key-points';
//specify the background color of 'key_points' span
key_points.style.backgroundColor = 'blue';
//assign 'value_points' variable to a created 'span' (i.e. space into which content can be inserted)
const value_points = document.createElement('span'); 
//insert text into 'value_points' span
value_points.innerHTML = 'Collision Points'
//add 'key_points' span to the created section 'item_points'
item_points.appendChild(key_points); 
//add 'value_points' span to the created section 'item_points'
item_points.appendChild(value_points); 
//add 'item_points' section into the HTML element assigned to 'label_points' variable
label_points.appendChild(item_points); 

//assign 'label_bounds' variable to HTML element with 'label_bounds' id
const label_bounds = document.getElementById('label_bounds');
//assign 'item_bounds' variable to a created 'section'
const item_bounds = document.createElement('div');
//assign 'key_bounds' variable to a created 'span' (i.e. space into which content can be inserted)
const key_bounds = document.createElement('span'); 
//specify the class of 'key_bounds' span as 'label-key-bounds' such that its style is defined by the latter in css
key_bounds.className = 'label-key-bounds'; 
//specify the background color of 'key_bounds' span
key_bounds.style.backgroundColor = 'black'; 
//assign 'value_bounds' variable to a created 'span' (i.e. space into which content can be inserted)
const value_bounds = document.createElement('span');
//insert text into 'value_bounds' span
value_bounds.innerHTML = 'Study Area Bounds'
//add 'key_bounds' span to the created section 'item_bounds'
item_bounds.appendChild(key_bounds); 
//add 'value_bounds' span to the created section 'item_bounds'
item_bounds.appendChild(value_bounds); 
//add 'item_bounds' section into the HTML element assigned to 'label_bounds' variable
label_bounds.appendChild(item_bounds); 

//assign 'label_max' variable to HTML element with 'label_max' id
const label_max = document.getElementById('label_max');
//assign 'item_max' variable to a created 'section'
const item_max = document.createElement('div');
//assign 'key_max' variable to a created 'span' (i.e. space into which content can be inserted)
const key_max = document.createElement('span'); 
//specify the class of 'key_max' span as 'label-key-max' such that its style is defined by the latter in css
key_max.className = 'label-key-max'; 
//specify the background color of 'key_max' span
key_max.style.backgroundColor = 'orange'; 
//assign 'value_max' variable to a created 'span' (i.e. space into which content can be inserted)
const value_max = document.createElement('span');
//insert text into 'value_max' span
value_max.innerHTML = 'Max Collision Area'
//add 'key_max' span to the created section 'item_max'
item_max.appendChild(key_max); 
//add 'value_max' span to the created section 'item_max'
item_max.appendChild(value_max); 
//add 'item_max' section into the HTML element assigned to 'label_max' variable
label_max.appendChild(item_max); 

