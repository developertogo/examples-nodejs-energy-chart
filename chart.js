/*****************************************************************************
 * Author: Carlos Hung
 * Date: Jan 2014  
 * Description: This is a nodejs application that fetches data from a server
 *              and then displays energy bar charts in the terminal 
 * Module Dependencies:
 *    async       - asynchronous control flow (waterfall) 
 *    cli-chart   - draw ansi color bar charts in a terminal
 *    cli-spinner - display spinner when interacting with server 
 *    dateformat  - show date in a readable format
 *    request     - simplied http request
 *****************************************************************************/
/*****************************************************************************
 * PEChart module export 
 *****************************************************************************/
var PEChart = exports.PEChart = function(config) {
    this.cfg = config;
    var data_params = '';
    for (var k in this.cfg.params) {
        data_params += k+'='+this.cfg.params[k]+'&';
    }
    data_params = data_params.slice(0, -1);
    this.data_url = this.cfg.data_url+'/data.json?'+data_params;
    this.spaces_url = this.cfg.spaces_url;
    this.graph_config = this.cfg.graph;
};

PEChart.prototype.fetchDraw = function(space_id) {
    // These variables have to be assigned to local variables
    // so that they can be accessible inside async
    var spaces_url = this.spaces_url;
    var data_url = this.data_url;
    var graph_config = this.graph_config;

    if (typeof space_id === 'undefined') {
        console.log('Usage: node chart.js <space_id>');
        return;
    }

    /*****************************************************************************
     * chart the data 
     *****************************************************************************/
    function chart(config, payload) {
        var data = payload.data;
        var threshold = 0;
        var dateFormat = require('dateformat');
        if (typeof config.threshold !== 'undefined') threshold = config.threshold.percent;
        var height = data.length;
        var date = new Date(Date.parse(data[0][0]));
        var date_format = dateFormat(date, "yyyy-mm-dd HH:MM");
        var lmargin = date_format.length + 4;

        var quantity = payload.quantity.charAt(0).toUpperCase()+payload.quantity.slice(1);
        var from = new Date(Date.parse(payload.start)).toString();
        var to = new Date(Date.parse(payload.end)).toString();
        console.log('    '+config.interval+' '+quantity+' Consumption Chart');
        console.log('    Total: '+Math.round(payload.sum)+' '+payload.unit
                    +'    Period: '+from+' to '+to+'\n');
        var Chart = require('cli-chart/chart');
        var chart = new Chart({
                   xlabel: 'kWh',
                   ylabel: 'time', 
                direction: 'x',
                    width: 85, 
                  lmargin: lmargin,
                   height: height*2,
                     step: 2 
        });
        // find min, max
        var min = 0, max = 0;
        for (var i in data) {
            var value = data[i][1];
            if (i == 0) min = value;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        min = Math.round(min);
        max = Math.round(max);
        for (var i in data) {
            var date = new Date(Date.parse(data[i][0]));
            var time = dateFormat(date, "yyyy-mm-dd HH:MM");
            var value = Math.round(data[i][1]);
            var color = 'blue';
            if (typeof config.normal !== 'undefined') {
                color = config.normal.color;
            }
            var warn = max - max*(threshold/100);
            if (typeof config.min !== 'undefined' && value == min) color = config.min.color;
            if (typeof config.threshold !== 'undefined' && value >= warn) color = config.threshold.color;
            if (typeof config.max !== 'undefined' && value == max) color = config.max.color; 
            chart.addBar({label: time, size: value, color: color});
        }
        chart.draw();
    };

    var Spinner = require('cli-spinner').Spinner;
    Spinner.setDefaultSpinnerString('|/-\\');
    var spinner = new Spinner('validating space id...');

    var async = require('async');
    async.waterfall([
        // get space info, ie location info
        function(callback) {
            spinner.start();
            var request = require('request');
            request(spaces_url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    spaces = JSON.parse(body);
                    var ids = [];
                    var found = false;
                    for (var i in spaces) {
                        ids.push(spaces[i].id);
                        if (spaces[i].id == space_id) {
                            found = true;
                            payload = spaces[i];
                            spinner.stop();
                            spinner = new Spinner('fetching data from remote server...');
                            spinner.start();
                            callback(null, payload);
                            break;
                        }
                    }     
                    if (!found) {
                        spinner.stop();
                        console.log('\nerror: invalid space id');
                        console.log('enter one of these valid space ids: ' + ids.join(', '));
                        console.log('please try again...');
                    }
                } else {
                    spinner.stop();
                    process.stdout.write('\nerror fetching spaces info');
                    if (error != null) {
                        process.stdout.write(': '+error);
                    }
                    if (typeof response !== 'undefined') {
                        process.stdout.write(' - status = '+response.statusCode);
                    }
                    process.stdout.write('\n');
                }
            })
        },
        // get space data and chart it
        function(space, callback) {
            var request = require('request');
            request(data_url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    spinner.stop();
                    payload = JSON.parse(body);
                    console.log('\n\n'+space.organizationName+' - '+space.label);
                    chart(graph_config, payload);
                    callback();
                } else {
                    spinner.stop();
                    process.stdout.write('\nerror fetching space data');
                    if (error != null) {
                        process.stdout.write(': '+error);
                    }
                    if (typeof response !== 'undefined') {
                        process.stdout.write(' - status = '+response.statusCode);
                    }
                    process.stdout.write('\n');
                }
            })
        }
    ], function (err, result) {
        process.exit();
    });
}

/*****************************************************************************
 * main
 *****************************************************************************/
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
