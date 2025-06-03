console.log("USGS api call functions loaded");
///////////////////////////////////////////////////////////////
//
// The 'streamLines' variable is loaded from the main web page header scripts
//
// this function returns an array of unique usgs gauges for the url call

// GLOBALS
const sidebarListStart = document.getElementById("sidebar-list-start");
// console.log(sidebarList);

//////////////////////////////////////////

function findUniqueGauges(streamLines) {
  console.log("extracting station ids from streamlines geoJSON.");
  const all_gauges = [];
  for (i = 0; i < streamLines.features.length; i++) {
    var feature = streamLines.features[i];
    all_gauges.push(feature.properties.flow_gauge);
    all_gauges.push(feature.properties.temp_gauge);
  }

  let gauges = [...new Set(all_gauges)];
  return gauges;
}

///////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS

// Reorganize the USGS timeseries data for use in Plotly charts
function repackUsgsArray(data, param_code) {
  // Loop through the usgs data and build a datetime array and a data value array
  let dateTimes = [];
  let values = [];
  for (i = 0; i < data.length; i++) {
    dateTimes.push(data[i]["dateTime"]);
    if (param_code === "00010") {
      // temp_f_value = N#00FF00#40DFD0#0000FFumber(data[i]["value"] * (9 / 5) + 32).toFixed(1);
      temp_f_value = Math.round((data[i]["value"] * (9 / 5) + 32) * 10) / 10;
      values.push(temp_f_value); //Convert celsius temps to F during array build
    } else {
      values.push(data[i]["value"]);
    }
  }
  // Build a data trace object (time series array) for Plotly and return it
  let trace = {
    x: dateTimes,
    y: values,
    mode: "lines",
    type: "scatter",
  };
  return trace;
}

// find today's day-of-year
function findDayOfYear(date) {
  return (
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
    24 /
    60 /
    60 /
    1000
  );
}

const todayDOY = findDayOfYear(new Date());
// console.log(todayDOY + " is todays day of year");

// JOIN USGS DATA TO GEOJSON STREAMLINES

function joinUSGSDataToFeatures() {
  for (feature of streamLines.features) {
    // console.log("joining data to " + feature.properties.section);
    // console.log("temp gauge is " + feature.properties.temp_ga_id);
    const flow_gauge = feature.properties.flow_gauge;
    const temp_gauge = feature.properties.temp_gauge;
    // console.log("flow gauge: " + flow_gauge);
    // console.log("temp_gauge: " + temp_gauge);
    const section = feature.properties.section;
    // console.log("joining segment: " + section);

    const tempKeyString = String(temp_gauge) + ":temp_c";
    const flowKeyString = String(flow_gauge) + ":q_cfs";

    const temp_data = site_objects[tempKeyString];
    const flow_data = site_objects[flowKeyString];

    // get the array of median flows for the gauge of interest and get the median flow for today
    const medianFlow = medianFlows[flow_gauge][todayDOY - 1];

    // console.log(`median flow for ${flow_gauge} is ${medianFlow}`);

    // assign values from the USGS API call to the respective geojson feature property
    if (temp_data.latest_value) {
      feature.properties.temp_f = temp_data.latest_value;
    } else {
      feature.properties.temp_f = "<em>N/A</em>";
    }
    if (flow_data.latest_value) {
      feature.properties.flow_cfs = flow_data.latest_value;
      feature.properties.perc_med = Math.round(
        (feature.properties.flow_cfs / medianFlow) * 100
      );
    } else {
      feature.properties.flow_cfs = "<em>N/A</em>";
    }
  }
} // END joinUSGSDataToFeatures()

/////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////

// MODAL FUNCTIONS
// These need to load after the list has been rendered, or else
// the DOM 'segment' nodes won't be present to attach the event listener

const modal = document.querySelector(".modal");
const overlay = document.querySelector(".overlay");
const btnCloseModal = document.querySelector(".btn--close-modal");

// const openModal = function (e) {
//   e.preventDefault();
//   // make the modal and background blur visible
//   modal.classList.remove("hidden");
//   overlay.classList.remove("hidden");

//   // use event bubbling to get the segment element and get its name
//   const segmentId = Number(
//     e.target.closest(".segment").getAttribute("data-id")
//   );

const openModal = function (segmentId) {
  console.log("segment number: " + segmentId);
  // make the modal and background blur visible
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  // use the segment name to get the temp gauge and flow gauge
  const segmentObj = streamLines.features.find(
    (feature) => feature.properties.section_num === segmentId
  );
  console.log("segment object: ");
  console.log(segmentObj);
  const flow_ga_id = segmentObj.properties.flow_gauge;
  const temp_ga_id = segmentObj.properties.temp_gauge;

  console.log("flow gauge is: " + flow_ga_id);
  console.log("temp gauge is: " + temp_ga_id);
  const flow_str = `${flow_ga_id}:q_cfs`;
  const temp_str = `${temp_ga_id}:temp_c`;
  const flow_trace = site_objects[flow_str].ts_7d_trace;
  const temp_trace = site_objects[temp_str].ts_7d_trace;
  const flow_ga_name = site_objects[flow_str].Site;
  const temp_ga_name = site_objects[temp_str].Site;
  displayTimeseriesPlot(
    flow_trace,
    flow_ga_id,
    flow_ga_name,
    "Streamflow",
    "q_plot"
  );
  displayTimeseriesPlot(
    temp_trace,
    temp_ga_id,
    temp_ga_name,
    "Water Temperature",
    "t_plot"
  );

  // build the 7-day plots and insert them into the modal
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

btnCloseModal.addEventListener("click", closeModal);
overlay.addEventListener("click", closeModal);

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

// DATA CALL

function getUSGSData(gauge_arr) {
  //   console.log("making data call for " + gauge_arr);
  gauge_string = gauge_arr.join(",");
  parameters = ["00010,00060"]; // temperature C: 00010, discharge cfs: 00060
  param_string = parameters.join(",");

  // call gauge for last seven days of data
  var url_last7days =
    "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" +
    gauge_string +
    "&parameterCd=" +
    param_string +
    "&siteStatus=all&period=P7D";

  console.log(`webservice call url is: ${url_last7days}`);

  // TODO:  try and call for the daily median flow too...?

  function renderSidebarFlows(feature) {
    const temp_f = feature.properties.temp_f;
    // console.log("temp_f is " + temp_f);
    let fish_risk = "";
    let risk_color = "";
    if (temp_f < 65) {
      fish_risk = "LOW";
      risk_color = "#00FF00"; // GREEN low risk
    }
    if (temp_f >= 65 && temp_f < 70) {
      fish_risk = "CONCERN";
      risk_color = "#FFA400"; // ORANGE concern risk
    }
    if (temp_f >= 70) {
      fish_risk = "HIGH";
      risk_color = "#FF0000"; // RED high risk
    }
    if (temp_f === "<em>N/A</em>") {
      fish_risk = "N/A";
      risk_color = "var(--color-light--1)";
    }

    let segment_card_html = `
      <li class="segment" data-id="${feature.properties.section_num}" data-name="${feature.properties.segment}">
        <h2 class="segment__river">${feature.properties.river}</h2>
        <h2 class="segment__title">${feature.properties.section}</h2>
        <div class="segment__details">
          <span class="segment__icon">💧</span>
          <span class="segment__value">${feature.properties.flow_cfs}</span>
          <span class="segment__unit">cfs</span>
        </div>
        <div class="segment__details">
          <span class="segment__icon" style="color:#fb3b1e;">🌡</span>
          <span class="segment__value">${feature.properties.temp_f}</span>
          <span class="segment__unit">F</span>
        </div>
        <div class="segment__details">
          <span class="segment__icon">🐟</span>
          <span class="segment__value" style="color:${risk_color}">${fish_risk}</span>
        </div>
      </li> 
    `;
    sidebarListStart.insertAdjacentHTML("afterend", segment_card_html);
  }

  // Call the USGS API to get data
  fetch(url_last7days, {
    credentials: "omit",
  })
    .then(function (response) {
      // The API call was successful
      if (response.ok) {
        console.log("Response successful");
        return response.json(); //The json from the successful response
      } else {
        // The call was unsuccessful, return a reject object
        return Promise.reject(response);
      }
    })
    .then(function (data) {
      // Extract some location metadata for plotting and website
      // This webservice call returns an unamed array of 4 objects [{...},{...},{...},{...}];
      // each object is a full gauge DataTransferItem.
      //   console.log(data);
      //   console.log("thats it for now");

      // JS does not currently have dataframe-like operations well implemented, for now we
      // are just calling the entire JSON object at one time to filter and perform operations

      var combined_data = data["value"]["timeSeries"];
      //   console.log(combined_data);

      // data extraction loop: loop through the combined gauge array,
      //extract a time series for each site and parameter
      for (var i = 0; i < combined_data.length; i++) {
        // console.log("extracting array item " + i);
        var obji = combined_data[i];
        var gauge_name = obji["sourceInfo"]["siteName"];
        var gauge_id = obji["sourceInfo"]["siteCode"][0]["value"];
        var param_code = obji["variable"]["variableCode"][0]["value"];
        var ts_array = obji["values"][0]["value"];
        var plotly_ts_trace = repackUsgsArray(ts_array, param_code);

        // assign some plain english names
        var parameter;
        if (param_code == "00010") {
          parameter = "temp_c";
        } else if (param_code == "00060") {
          parameter = "q_cfs";
        } else {
          parameter = param_code;
        }
        // console.log("parameter is: " + parameter);

        // extract most recent values for the parameter and the time
        let latest_value =
          plotly_ts_trace["y"][plotly_ts_trace["y"].length - 1];
        // console.log("the latest value is " + latest_value);
        // console.log(latest_value);
        // console.log(typeof latest_value);
        if (latest_value == undefined) {
          latest_value = NaN;
        } else {
          latest_value = latest_value;
        }

        var latest_timestamp = Date.parse(
          plotly_ts_trace["x"][plotly_ts_trace["y"].length - 1]
        );
        if (isNaN(latest_timestamp)) {
          //   console.log("the timestamp is NaN, assigning current time");
          latest_timestamp = Date.now();
        }
        datetime = new Date(latest_timestamp);
        var year = datetime.getFullYear();
        var month = datetime.getMonth() + 1;
        var day = datetime.getDate();
        var hours = datetime.getHours();
        var minutes = datetime.getMinutes();
        var seconds = datetime.getSeconds();
        var latest_datetime =
          year + "-" + month + "-" + day + " " + hours + ":" + minutes;

        // build an object for this location with location metadata, most recent values, and 7 day time series
        site_param_obj = {
          Site: gauge_name,
          Site_ID: gauge_id,
          parameter: parameter,
          latest_value: latest_value,
          latest_datetime: latest_datetime,
          ts_7d_trace: plotly_ts_trace,
        };

        // add this object into the combined cleaned datasets object, using the concatenated site ID and parameter ID as the key
        var key_name = gauge_id + ":" + parameter;
        site_objects[key_name] = site_param_obj;
      } // end USGS data extraction loop

      // THIS HAS TO BE CALLED IN THE ASYNC CALL OR ELSE 'site_objects' might not be
      // populated before the map tries to load and stylize the stream features
      joinUSGSDataToFeatures();
      // console.log(streamLines.features);
      addMapFeatures();
      // sort the streams in order and populate the sidebar with the segment current info cards
      streamLines.features.sort(
        (a, b) => b.properties.section_num - a.properties.section_num
      );

      // streamLines.features.sort(function (a, b) {
      //   if (a.properties.incidents < b.properties.incidents)
      //       return -1;
      //   else if (a.properties.incidents > b.properties.incidents)
      //       return 1;
      // });

      console.log(streamLines.features);

      // Render the sidebar summary table
      streamLines.features.forEach(renderSidebarFlows);

      function emulateClickOnMapItem(sect) {
        var id = parseInt(itemId);
        //get target layer by it's id
        var layer = streamLayer.getLayer(id);
        //fire event 'click' on target layer
        layer.fireEvent("click");
      }

      function zoomMapAndHighlightCard(e) {
        // get the segment number of the clicked card
        const segmentId = Number(
          e.target.closest(".segment").getAttribute("data-id")
        );
        console.log("segment ID is " + segmentId);
        // use it to select a feature from streamlines
        var layer = streamLayer.getLayer(segmentId);
        //fire event 'click' on target layer
        layer.fireEvent("click").closeTooltip();
      }

      // add the Modal event listeners and highlighting/zooming event listeners to the sidebar current info cards
      const elsOpenModal = document.querySelectorAll(".segment");
      // elsOpenModal.forEach((element) =>
      //   element.addEventListener("dblclick", openModal)
      // );
      elsOpenModal.forEach((element) =>
        element.addEventListener("click", zoomMapAndHighlightCard)
      );
    }); // end fetch.then()
}

///////////////////////////////////////////////////////////
let myURL =
  "https://waterservices.usgs.gov/nwis/stat/?format=json&sites=09058000&statType=median&statReportType=daily&parameterCd=00060";
////////////////////////////////////////////////////////////


//---------------------------------------------------------------------------------------
//   PROGRAM CONTROL
//---------------------------------------------------------------------------------------



const unique_gauges = findUniqueGauges(streamLines);
// console.log(unique_gauges);
// create an object of cleaned datasets for each site/parameter combination
let site_objects = {};

getUSGSData(unique_gauges);

///////////////////////////////////////////////////////////

// all data-based DOM elements (segment tiles in sidebar and conditions map) need to load only after the USGS has returned data and joined it to the streamlines dataset with a style based on data values

////////////////////////////////////////////////////////////////////////////////

// 7/5/2024
//  - all data calls (fetch) and map creation/loading/updating need to go inside the async function in order,
// otherwise the map will load then not re-update once the usgs data is in, alternatively, the mapload can be wrapped into
// a function, and that can load with the page, and then when the data loads the map can re-draw and be updated on the page?

function displayTimeseriesPlot(trace, gauge_id, gauge_name, parameter, divID) {
  console.log(`building plot for ${parameter} at ${gauge_id}`);
  let shapesArr = [];
  let axisYTitle = "";
  if (parameter === "Water Temperature") {
    // axisYTitle = "Degrees F"; 
    axisYTitle = null;
    shapesArr = [
      {
        layer: "below",
        type: "rect",
        //x-reference is assigned to the plot paper
        xref: "paper",
        //y-reference is assigned to the desired temperature range y values
        yref: "y",
        x0: 0,
        x1: 1,
        y0: 30,
        y1: 65,
        fillcolor: "#99EDC3",
        opacity: 0.3,
        line: {
          width: 0,
        },
      },
      // high risk shaded band
      {
        layer: "below",
        type: "rect",
        //x-reference is assigned to the plot paper
        xref: "paper",
        //y-reference is assigned to the desired temperature range y values
        yref: "y",
        x0: 0,
        x1: 1,
        y0: 65,
        y1: 70,
        fillcolor: "#FDFD66",
        opacity: 0.3,
        line: {
          width: 0,
        },
      },
      // high risk shaded band
      {
        layer: "below",
        type: "rect",
        //x-reference is assigned to the plot paper
        xref: "paper",
        //y-reference is assigned to the desired temperature range y values
        yref: "y",
        x0: 0,
        x1: 1,
        y0: 70,
        y1: 80,
        fillcolor: "#FF0000",
        opacity: 0.3,
        line: {
          width: 0,
        },
      },
    ];
  }

  if (parameter === "Streamflow") {
    // axisYTitle = "cfs";
    // can't figure out how to dynamicall reduce titles and axis title font sizes on mobile, so just don't 
    // use a y-axis title for now in order to not squeeze the plot 
    axisYTitle=null;  
  }
  console.log(shapesArr);

  let data = [trace];
  let layout = {
    height: 400,
    title: {
      text: `${parameter} at USGS ${gauge_id}<br>${gauge_name}`,
      font: {
        size:14
      },
    },
    yaxis: {
      title: axisYTitle,
      linecolor: "black",
      linewidth: 2,
      mirror: true,
    },
    xaxis: {
      linecolor: "black",
      linewidth: 2,
      mirror: true,
    },
    // margin: { b: 20 },
    margin: { r:15, l:35, b: 20 },
    bgcolor: "rgba(243, 243, 243, 1)",
    plot_bgcolor: "rgb(243, 243, 243, 1)",
    paper_bgcolor: "rgb(243, 243, 243, 1)",
    // shapes: shapesArr,
  };

  if (parameter === "Water Temperature") {
    layout["shapes"] = shapesArr;
  }
  // clear the div
  document.getElementById(divID).innerHTML = "";
  // call the plot to the specified html element id
  Plotly.newPlot(divID, data, layout, { responsive: true });
}
