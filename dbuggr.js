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
// Tween lines on changes
// TODO: Zoomable Sunburst http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad

var width = 960,
    height = 700,
    radius = Math.min(width, height) / 2,
    color = d3.scale.category20c();

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, 1])
    .value(function(d) { return 1; });

var innerRadius = 0.65;
var pieInverter = d3.scale.linear()
    .domain([0, 1])
    .range([1, innerRadius]);
var converterForInnerLayout = d3.scale.linear()
    .domain([0, 1])
    .range([0, innerRadius]);

var arc = d3.svg.arc()
    .startAngle(d => d.x)
    .endAngle(d => d.x + d.dx)
    .innerRadius(function(d) {
        return radius * (d.children ?
            pieInverter(d.y + d.dy) :
           innerRadius
        );
    })
    .outerRadius(function(d) {
        return pieInverter(d.y) * radius;
    });

var bundle = d3.layout.bundle();

var radToDeg = d3.scale.linear()
    .domain([0, 360])
    .range([0, 2 * Math.PI]);

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.85)
    .radius(function(d) {
        return radius * (d.children ?
        converterForInnerLayout(d.y + d.dy) :
           innerRadius
        );
    })
    .angle(function(d) {
        return d.x + d.dx / 2;
    });

d3.json("example/flare.json", function(error, root) {
    if (error) throw error;

    var links = getRandomLinks(root);
    console.log('links', links);

    var enterElem = svg.datum(root).selectAll("path")
        .data(partition.nodes)
        .enter();
    var path = enterElem.append("path")
        .attr("display", function(d) { return null; return d.depth ? null : "none"; }) // hide inner ring
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .style("fill-rule", "evenodd")
        .each(stash)
        .on('click', (d => console.log(d.name, d)));

    /*
    // TODO: file and folder names
    enterElem.append("text")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("dy", "11.35em")
        .attr("text-anchor", function(d) { return "end"; })
        .text(d => d.name)
        .style("fill-opacity", 1);
    */

    d3.selectAll("input").on("change", function change() {
        var value = this.value === "count"
            ? function() { return 1; }
            : function(d) { return d.size; };

        path
            .data(partition.value(value).nodes)
            .transition()
            .duration(1500)
            .attrTween("d", arcTween);

        link
            .data(bundle(links))
            .transition()
            .duration(1500)
            .attrTween("d", lineTween);
    });

    var link = svg.append("g").selectAll(".link")
        .data(bundle(links))
        .enter().append("path")
        // only for interactions?
        // TODO: remove least common ancestor itself from list of Points
        .each(function(d) { console.log(d); d.source = d[0], d.target = d[d.length - 1]; })
        .attr("class", "link")
        .attr("d", line)
        .each(stashForLine);

});

// Stash the old values for transition.
function stash(d) {
    d.x0 = d.x;
    d.dx0 = d.dx;
}

function stashForLine(d) {

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

function lineTween(a) {
    var length = a.length,
        interpolations = a.map(point => d3.interpolate({x: point.x0, dx: point.dx0}, point));

    return function(t) {
        var interpolatedPoints = interpolations.map(i => i(t));
        interpolatedPoints.forEach((b, index) => {
            a[index].x0 = b.x;
            a[index].dx0 = b.dx;
        });

        return line(interpolatedPoints);
    };
}

d3.select(self.frameElement).style("height", height + "px");

function getRandomLinks(root) {
    var links = [];
    function randomLeaf(root) {
        if(!root.children) { return root; }

        var index = parseInt((Math.random() * root.children.length), 10);
        return randomLeaf(root.children[index]);
    }

    for(var i = 0; i < 10; i++) {
        var source = randomLeaf(root),
            target = randomLeaf(root);

        if(source !== target) {
            links.push({
                source: source,
                target: target
            });
        }
    }

    return links;
}
