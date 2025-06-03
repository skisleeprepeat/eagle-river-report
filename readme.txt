Eagle County Stream Conditions River Reports Page
copyright Lotic Hydrological and Eagle River Coalition 2025
created by Bill Hoblitzell bill@lotichydrological.com for the
Eagle River Coalition Water Quality Monitoring and Assessment Program
lotichydrological.com, eagleriverco.org

Abstract

This web page reports real-time river flows and temperatures in an interactive
table and map form. It is intended for recreational river users to provide a quick
mobile or desktop glance for river conditions in the Eagle River and Upper Colorado
watershed.  

Required libraries

Website is created in vanilla javascript and css with no external styling frameworks.
The map requires Leaflet.js, loaded in the page head by CDN.
The interactive data plots require Plotly.js, loaded in the page head by CDN.

GIS data

Line files for stream lines () and watershed boundaries are geojson, loaded into the page
as individual scripts which solely load the geojson as a javascript constant. Streamlines were created from
USGS NHD datasets which were dissolved on the GNIS ID feature then manually cut into recreational reaches and 
associated with a the appropriate stream gauge for flow and temperature. Additional attributes are included that 
are populated by leaflet to use in pop-ups.

Median Flows data

This dataset is loaded in a script as a json object. It contains the daily median flow in cfs for each stream gauge,
downloaded as a query from NWIS/USGS webservices.


Other scripts:


data-functions.js 

This contains a series of helper functions to make a USGS webservice call to get streamflow and temperature
data and format it into a js array for consumption by the mapping and graphing functions.
Most of the mapping and graphing functions are bound to page events such as map clicks or table clicks and fire
during user interactions with the page.  This script also contains the Plotly plot generation functions.

basemap.js

Contains code to load a leaflet map, load the GIS layers, then bind various functions and styles to the map layers
based on the dynamic data returned from the UGSS webservice.
