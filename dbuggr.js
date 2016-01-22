"use strict";

import ServerProxy from './lib/serverproxy.js';
import * as d3 from 'node_modules/d3/d3.js';

ServerProxy.glob2('src', '*.js').then(function(stuff) {
    console.log(stuff);
});

ServerProxy.browse('./vendor', ServerProxy.types.scripts).then(files => {
    console.log(files);
});

// FEATURES:
// Sunburst with changeable sizes http://bl.ocks.org/mbostock/4063423
// Tween lines on changes
// On hover: Highlight hierarchy and dependencies
// path gradients
// TODO: Folder and file names
// TODO: hook with your own data
// TODO: Split external modules like node_modules, vendor, http requests away and limit their influence
//   via transform?
// TODO: Zoomable Sunburst http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
// TODO: Tooltips
// TODO: Changeable Metrics for Pie Sizes
// TODO: Reloadable

var width = 960,
    height = 700,
    radius = Math.min(width, height) / 2,
    color = d3.scale.category20c();

var realSVG = d3.select("body").append("svg");

// gradient as reference for hierarchical edge bundles
var gradient = realSVG.append('defs').append('linearGradient')
    .attr("id", 'bundleview-gradient');
gradient.append('stop').attr('stop-color', '#2ca02c');
gradient.append('stop')
    .attr('stop-color', '#d62728')
    .attr('offset', '100%');

var svg = realSVG
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

function getArcInnerRadius(d) {
    return radius * (d.children ?
                pieInverter(d.y + d.dy) :
                innerRadius
        );
}
function getArcOuterRadius(d) {
    return pieInverter(d.y) * radius;
}
function getArcMiddleRadius(d) {
    return (getArcInnerRadius(d) + getArcOuterRadius(d)) / 2;
}
var arc = d3.svg.arc()
    .startAngle(d => d.x)
    .endAngle(d => d.x + d.dx)
    .innerRadius(getArcInnerRadius)
    .outerRadius(getArcOuterRadius);

var hiddenArc = d3.svg.arc()
    .startAngle(d => d.x)
    .endAngle(d => d.x + d.dx)
    .innerRadius(getArcMiddleRadius)
    .outerRadius(getArcMiddleRadius);

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

    // TODO: extract links correctly
    var links = getRandomLinks(root, 200);

    var enterElem = svg.datum(root).selectAll("path")
        .data(partition.nodes)
        .enter();
    var path = enterElem.append("path")
        .attr("display", function(d) { return null; return d.depth ? null : "none"; }) // hide inner ring
        .attr("d", arc)
        //.style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .style("fill-rule", "evenodd")
        .each(stash)
        .classed('node', true)
        .classed('node--leaf', d => !d.children)
        .on('click', (d => console.log(d.name, d)))
        .on("mouseover", mouseovered)
        .on("mouseout", mouseouted)

        .each((d, i) => {
            //d3.select(this).attr("d");

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                //.attr("class", "hiddenDonutArcs")
                .attr('id', 'bundleview_node_' + i)
                .attr("d", hiddenArc(d))
                //.style("fill", "none")
                .style('stroke', '#f0f');
        });
    var node = path;
/*
    var hiddenPath = enterElem.append("path")
        .attr("display", function(d) { return null; return d.depth ? null : "none"; }) // hide inner ring
        .attr("d", arc)
        //.style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .style("fill-rule", "evenodd")
        .each(stash)
        .classed('node', true)
        .classed('node--leaf', d => !d.children)
        .on('click', (d => console.log(d.name, d)))
        .on("mouseover", mouseovered)
        .on("mouseout", mouseouted)

        .each((d, i) => {
            //d3.select(this).attr("d");

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                //.attr("class", "hiddenDonutArcs")
                .attr('id', 'bundleview_node_' + i)
                .attr("d", hiddenArc(d))
                //.style("fill", "none")
                .style('stroke', '#f0f');
        });*/

    enterElem.append("text")
        //.attr("x", function(d) { return d.x; })
        //.attr("y", function(d) { return d.y; })
        //.attr("dy", "11.35em")
        //.attr("text-anchor", function(d) { return "end"; })
        //.text(d => d.name)
        .style("fill-opacity", 1)
        //.attr("x", 5)   //Move the text from the start angle of the arc
        //.attr("dy", 18) //Move the text down
        .append("textPath")
        .attr("startOffset","25%")
        .style("text-anchor","middle")
        .attr("xlink:href",function(d,i){return "#bundleview_node_"+i;})
        .text(d => d.name);

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
        .each(function(d) {d.source = d[0]; d.target = d[d.length - 1]; })
        .attr("class", "link")
        .attr("d", line);

    function mouseovered(d) {
        function markDescendants(n) {
            if(n.children) {
                n.children.forEach(child => {
                    child.descendant = true;
                    markDescendants(child);
                });
            }
        }

        function markAncestors(n) {
            if(n.parent) {
                markAncestors(n.parent);
                n.parent.ancestor = true;
            }
        }

        // clear node markers
        node
            .each(function(n) { n.target = n.source = n.descendant = n.ancestor = false; });

        markDescendants(d);
        markAncestors(d);

        link
            .each(function(d) {d.source = d[0]; d.target = d[d.length - 1]; })
            .classed("link--target", function(l) {
                if (l.target === d || l.target.descendant) {
                    return l.source.source = true;
                }
            })
            .classed("link--source", function(l) {
                if (l.source === d || l.source.descendant) {
                    return l.target.target = true;
                }
            })
            .filter(function(l) { return l.target === d || l.source === d; })
            .each(function() { this.parentNode.appendChild(this); });

        node
            .classed("node--hovered", function(n) { return n === d; })
            .classed("node--descendant", function(n) { return n.descendant; })
            .classed("node--ancestor", function(n) { return n.ancestor; })
            .classed("node--target", function(n) { return n.target; })
            .classed("node--source", function(n) { return n.source; });
    }

    function mouseouted(d) {
        link
            .classed("link--target", false)
            .classed("link--source", false);

        node
            .classed("node--hovered", false)
            .classed("node--descendant", false)
            .classed("node--ancestor", false)
            .classed("node--target", false)
            .classed("node--source", false);
    }
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

// depends on that the .stash method was called for each point
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

function getRandomLinks(root, numberOfLinks) {
    var links = [];
    function randomLeaf(root) {
        if(!root.children) { return root; }

        var index = parseInt((Math.random() * root.children.length), 10);
        return randomLeaf(root.children[index]);
    }

    for(var i = 0; i < numberOfLinks; i++) {
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
