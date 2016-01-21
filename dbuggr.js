"use strict";

import ServerProxy from './lib/serverproxy.js';
import * as d3 from 'node_modules/d3/d3.js';

ServerProxy.glob2('src', '*.js').then(function(stuff) {
    console.log(stuff);
});

ServerProxy.browse('./vendor', ServerProxy.types.scripts).then(files => {
    console.log(files);
});

// Sunburst with changable sizes http://bl.ocks.org/mbostock/4063423
// TODO: Zoomable Sunburst http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad

var width = 960,
    height = 700,
    radius = Math.min(width, height) / 2,
    color = d3.scale.category20c();

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height * .52 + ")");

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, 1 /*radius * radius*/])
    .value(function(d) { return 1; });

var maxDepth = 6;
var pieInverter = d3.scale.linear()
    .domain([0, 1])
    .range([1, 0.3]);

var arc = d3.svg.arc()
    .startAngle(d => d.x)
    .endAngle(d => d.x + d.dx)
    .innerRadius(function(d) {
        return radius * (d.children ?
                pieInverter(d.y + d.dy) :
                    0.3
            );
    })
    .outerRadius(function(d) {
        return pieInverter(d.y) * radius;
    });

d3.json("example/flare.json", function(error, root) {
    if (error) throw error;

    var enterElem = svg.datum(root).selectAll("path")
        .data(partition.nodes)
        .enter();
    var path = enterElem.append("path")
        .attr("display", function(d) { return null; return d.depth ? null : "none"; }) // hide inner ring
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .style("fill-rule", "evenodd")
        .each(stash);

    enterElem.append("text")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("dy", "11.35em")
        .attr("text-anchor", function(d) { return "end"; })
        .text(d => d.name)
        .style("fill-opacity", 1);

    d3.selectAll("input").on("change", function change() {
        var value = this.value === "count"
            ? function() { return 1; }
            : function(d) { return d.size; };

        path
            .data(partition.value(value).nodes)
            .transition()
            .duration(1500)
            .attrTween("d", arcTween);
    });
});

// Stash the old values for transition.
function stash(d) {
    d.x0 = d.x;
    d.dx0 = d.dx;
}


// Interpolate the arcs in data space.
function arcTween(a) {
    var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
    return function(t) {
        var b = i(t);
        a.x0 = b.x;
        a.dx0 = b.dx;
        return arc(b);
    };
}

d3.select(self.frameElement).style("height", height + "px");
