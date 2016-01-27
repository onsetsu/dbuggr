"use strict";

import ServerProxy from './../serverproxy.js';
//import * as d3 from 'node_modules/d3/d3.js';
import { noop } from './../utils.js';
//import * as ctx from './context.js';

$('.grid-stack')
    .data('gridstack')
    .add_widget(
    $('<div><div id="testappender" class="grid-stack-item-content" /><div/>'),
    0, 0, 2, 2
);

$('.grid-stack')
    .data('gridstack')
    .add_widget(
    $('<div><div id="testappender2" class="grid-stack-item-content" /><div/>'),
    0, 0, 4, 4
);

d3.select("#testappender").append("svg").append("circle")
    .attr("cx", 30)
    .attr("cy", 30)
    .attr("r", 20)
    .on('contextmenu', function(d,i) {
        // create the div element that will hold the context menu
        d3.selectAll('.context-menu').data([1])
            .enter()
            .append('div')
            .attr('class', 'context-menu');
        // close menu
        d3.select('body').on('click.context-menu', function() {
            d3.select('.context-menu').style('display', 'none');
        });
        // this gets executed when a contextmenu event occurs
        d3.selectAll('.context-menu')
            .html('')
            .append('ul')
            .selectAll('li')
            .data(['apple', 'grapefruit']).enter()
            .append('li')

            .on('click' , function(d) { console.log(d); return d; })


            .text(function(d) { return d; });
        d3.select('.context-menu').style('display', 'none');
        // show the context menu
        d3.select('.context-menu')
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
            .style('display', 'block');
        d3.event.preventDefault();
    });


ServerProxy.browse('./vendor', ServerProxy.types.scripts).then(files => {
    console.log(files);
});

var width = 700,
    height = 600,
    radius = Math.min(width, height) / 2,
    color = d3.scale.category20c();

var bundleviewDiv = d3.select("#testappender2").append('div');
var realSVG = bundleviewDiv.append("svg");

// gradient as reference for hierarchical edge bundles
var defs = realSVG.append('defs');
var gradient = defs.append('linearGradient')
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

var metrics = {
    size: function(d) { return d.size; },
    count: function() { return 1; },
    LengthOfFileName: function(d) { return d.name.length; }
};

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, 1])
    .value(metrics.count);

var innerRadius = 0.65;
var pieInverter = d3.scale.linear()
    .domain([0, 1])
    .range([1, innerRadius]);
var converterForInnerLayout = d3.scale.linear()
    .domain([0, 1])
    .range([0, innerRadius]);

var x = d3.scale.linear()
    .domain([0, 2 * Math.PI])
    .range([0, 2 * Math.PI]);

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
function clampAtCircle(x) {
    return Math.max(0, Math.min(2 * Math.PI - 0.00001, x));
}
var outerMargin = 10;
var arc = d3.svg.arc()
    .startAngle(d => clampAtCircle((x(d.x))))
    .endAngle(d => clampAtCircle((x(d.x + d.dx))))
    .innerRadius(d => Math.min(radius+outerMargin, getArcInnerRadius(d)))
    .outerRadius(d => Math.min(radius+outerMargin, getArcOuterRadius(d)));

function lowerHalf(d) {
    var middleAngle = d.x + d.dx / 2;
    return Math.PI / 2 < middleAngle && middleAngle < Math.PI * 1.5;
}
var hiddenArc = d3.svg.arc()
    // check for lowerHalf to switch direction of paths
    .startAngle(d => clampAtCircle(x(/*lowerHalf(d) ? d.x + d.dx :*/ d.x)))
    .endAngle(d => clampAtCircle(x(/*lowerHalf(d) ? d.x :*/ d.x + d.dx)))
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
        Math.max(0, Math.min(innerRadius, converterForInnerLayout(d.y + d.dy))) :
           innerRadius
        );
    })
    .angle(function(d) {
        return clampAtCircle(x(d.x + d.dx / 2));
    });

// Keep track of the node that is currently being displayed as the root.
var nodeDisplayedAsRoot;

function isLeaf(d) { return !d.children; }

function initBundleview(root, links) {
    nodeDisplayedAsRoot = root;

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
        .classed('node--leaf', isLeaf)
        .on('mouseover', (d => {
            console.log(d.name, d);
            mouseovered(d);
        }))
        .on('click', clickedOnNode)
        .on("mouseout", mouseouted);
    var node = path;

    function clickedOnLeaf(d) {
        return fetch(d.fullpath)
            .then(response => response.text())
            .then(text => {
                console.log(text);
                radio('FileBrowser:leafNodeClicked').broadcast(text, d);
            });
    }
    function clickedOnDirectory(d) {
        nodeDisplayedAsRoot = d;

        path
            .transition()
            .duration(1000)
            .attrTween("d", arcTweenZoom(nodeDisplayedAsRoot));

        hiddenPath
            .transition()
            .duration(1000)
            .attrTween("d", hiddenArcTweenZoom(nodeDisplayedAsRoot));

        labels
            .classed('label--invisible', d => { return false; });

        link
            .transition()
            .duration(1500)
            .attrTween("d", lineTweenZoom(nodeDisplayedAsRoot));
    }
    function clickedOnNode(d) {
        if(isLeaf(d)) {
            return clickedOnLeaf(d);
        } else {
            return clickedOnDirectory(d);
        }
    }

    var hiddenPath = defs.datum(root).selectAll("path")
        .data(partition.nodes)
        .enter().append("path")
        .each(stash)
        .attr('id', (d, i) => 'bundleview_node_' + i)
        .attr("d", hiddenArc);

    var labels = enterElem.append("text")
        .classed('bundle--text', true)
        .style("fill-opacity", 1)
        .append("textPath")
        .attr("startOffset","25%")
        .style("text-anchor","middle")
        .style('alignment-baseline', 'central')
        .attr("xlink:href",function(d,i){return "#bundleview_node_"+i;})
        .text(d => d.name);

    bundleviewDiv.append("form").selectAll('label')
        .html('Metrics')
        .data(Object.keys(metrics))
        .enter()
        .append('label')
        .html(d => d)
        .append('input')
        .attr("type", 'radio')
        .attr('name', 'mode')
        .attr('value', d => d)
        .property('checked', (d, i) => d === 'count')
        .on('change', function() {
            var value = metrics[this.value];

            var newlyLayoutedData = partition.value(value).nodes;
            path
                .data(newlyLayoutedData)
                .transition()
                .duration(1500)
                .attrTween("d", arcTween);

            hiddenPath
                .data(newlyLayoutedData)
                .transition()
                .duration(1500)
                .attrTween("d", hiddenArcTween);

            link
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
}

// Stash the old values for transition.
function stash(d) {
    d.x0 = d.x;
    d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function getCommonArcTween(a, i, arcConstructor) {
    var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
    function tween(t) {
        var b = oi(t);
        a.x0 = b.x;
        a.dx0 = b.dx;
        return arcConstructor(b);
    }
    if (i === 0) {
        // If we are on the first arc, adjust the x domain to match the root node
        // at the current zoom level. (We only need to do this once.)
        var xd = d3.interpolate(x.domain(), [nodeDisplayedAsRoot.x, nodeDisplayedAsRoot.x + nodeDisplayedAsRoot.dx]);
        return function(t) {
            x.domain(xd(t));
            return tween(t);
        };
    } else {
        return tween;
    }
}

function arcTween(d, i) { return getCommonArcTween(d, i, arc); }
function hiddenArcTween(d, i) { return getCommonArcTween(d, i, hiddenArc); }

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

// depends on that the .stash method was called for each point
function lineTweenZoom(rootDisplay) {
    return function(a, i) {
        var length = a.length,
            interpolations = a.map(point => d3.interpolate({x: point.x0, dx: point.dx0}, point));

        function tween(t) {
            var interpolatedPoints = interpolations.map(i => i(t));
            interpolatedPoints.forEach((b, index) => {
                a[index].x0 = b.x;
                a[index].dx0 = b.dx;
            });

            return line(interpolatedPoints);
        }

        if (i === 0) {
            var xd = d3.interpolate(x.domain(), [rootDisplay.x, rootDisplay.x + rootDisplay.dx]),
                yd = d3.interpolate(converterForInnerLayout.domain(), [rootDisplay.y, 1]);
            return function(t) {
                x.domain(xd(t));
                converterForInnerLayout.domain(yd(t));
                return tween(t);
            };
        } else {
            return tween;
        }
    }
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

function walkTree(root, beforeChildren, afterChildren) {
    beforeChildren(root);
    if(root.children) {
        root.children.forEach((child, i) => {
            walkTree(child, beforeChildren, afterChildren);
        })
    }
    afterChildren(root);
}

// init it all
if(false) {
    d3.json("example/flare.json", function(error, root) {
        if (error) throw error;

        initBundleview(root, getRandomLinks(root, 300));
    });
} else {
    ServerProxy.glob2('./src', '*.js').then(function(stuff) {
        var numberOfFiles = 0;
        console.log(stuff);

        walkTree(stuff, noop, node => {
            if(node.children) {
                for(let i = 0; i < node.children.length;) {
                    let child = node.children[i];
                    // get rid of empty folders
                    if(child.children && child.children.length === 0) {
                        node.children.splice(i, 1);
                        continue;
                    }
                    i++;
                }
            }

            // attach metrics
            if(!node.children) {
                node.size = node.fullpath.length;
            }

            numberOfFiles++;
        });
        console.log(numberOfFiles, stuff);

        // TODO: extract links correctly
        initBundleview(stuff, getRandomLinks(stuff, 200));
    });
}

// When zooming: interpolate the scales.
function commonArcTweenZoom(displayedRoot, arcConstructor) {
    var xd = d3.interpolate(x.domain(), [displayedRoot.x, displayedRoot.x + displayedRoot.dx]),
        yd = d3.interpolate(pieInverter.domain(), [displayedRoot.y, 1]);

    return function(d, i) {
        return i
            ? function(t) { return arcConstructor(d); }
            : function foo(t) {
                x.domain(xd(t));
                pieInverter.domain(yd(t));
                return arcConstructor(d);
            };
    };
}

function arcTweenZoom(d) { return commonArcTweenZoom(d, arc); }
function hiddenArcTweenZoom(d) { return commonArcTweenZoom(d, hiddenArc); }