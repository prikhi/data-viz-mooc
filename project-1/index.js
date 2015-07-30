showGlobal = true;
showHemi = true;
showZone = false;

(function() {
  "use strict";


  nv.addGraph(function() {
    // Initialize Chart
    var chart = nv.models.lineChart()
                  .margin({left:100})
                  .useInteractiveGuideline(true)
                  .duration(350)
                  .showLegend(true)
                  .showYAxis(true)
                  .showXAxis(true);

    // Set Axes
    chart.xAxis.axisLabel('Year');
    chart.yAxis.axisLabel('Temperature (Celsius)');

    // Render Chart
    render(chart);

    // Set Event Handlers
    nv.utils.windowResize(function() { chart.update(); });
    setButtonHandler('toggleGlobal', 'showGlobal', chart);
    setButtonHandler('toggleHemi', 'showHemi', chart);
    setButtonHandler('toggleZone', 'showZone', chart);

    return chart;
  });

  function render(chart) {
    var processedData = [];
    addData(showGlobal, 'Glob','Global', processedData);
    addData(showHemi, 'NHem', 'Northern Hemisphere', processedData);
    addData(showHemi, 'SHem', 'Southern Hemisphere', processedData);
    addData(showZone, "24N-90N", "24N-90N", processedData);
    addData(showZone, "24S-24N", "24S-24N", processedData);
    addData(showZone, "90S-24S", "90S-24S", processedData);
    d3.select('#graph').datum(processedData).call(chart);
  }

  function addData(variable, attribute, label, dataArray) {
    if (variable) {
      var extractedData = data.map(function(item) {
        return {x: item.Year, y: item[attribute]};
      });
      dataArray.push({
        key: label,
        values: extractedData
      });
    }
  }

  function setButtonHandler(elementId, variable, chart) {
    document.getElementById(elementId).onclick = function() {
      window[variable] = !window[variable];
      render(chart);
    };
  }

})();
