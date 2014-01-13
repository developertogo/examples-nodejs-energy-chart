examples-nodejs-energy-chart
============================

node.js application that fetches energy data and plot them on a color bar chart in the terminal.

It gets the data from [Pulse Energy Platform](http://developer.pulseenergy.com/)

Example
-------

Output after running the app as follows: 

node chart.js 388

![week energy](https://github.com/developertogo/examples-nodejs-energy-chart/blob/master/week_energy_chart.png)

Dependencies
------------

This app depends on these node.js modules. Use npm to install them (npm install <module_name>):

 * async       - asynchronous control flow (waterfall) 
 * cli-chart   - draw ansi color bar charts in a terminal
 * cli-spinner - display spinner when interacting with server 
 * dateformat  - show date in a readable format
 * request     - simplied http request

Below are the config params to PEChart class:

````javascript
// from command line
var space_id = process.argv.splice(2)[0];

// config params
var url = 'https://api.pulseenergy.com/pulse';
var params = {
    // for detail info, see http://developer.pulseenergy.com/
         key: '9C3B13239D75E73FDE883C934FF647A1',
    resource: 'Total',
    interval: 'Week',
    quantity: 'Energy'
};
var graph = {
     interval: params.interval,
    // these ones below are optional parameters
       normal: { color: 'blue' },
    threshold: { percent: 2, color: 'yellow' }, // ie within 2% of max
          min: { color: 'green' },
          max: { color: 'red' }
};
var config = {
       params: params,
     data_url: url + '/1/spaces/'+space_id,
   spaces_url: url + '/1/spaces.json?key='+params.key,
        graph: graph
};

var pechart = new PEChart(config);
pechart.fetchDraw(space_id);
````
